import { createApiHandler } from '@/core/api/handler'
import { UnauthorizedError } from '@/core/errors/AppError'
export const dynamic = 'force-dynamic'
export const maxDuration = 60;
import { createAdminClient } from '@/core/db/admin'
import { Database, GoogleSheetsConfig } from '@/shared/types'
import { SupabaseClient } from '@supabase/supabase-js'

export const GET = createApiHandler({
    auth: 'webhook',
    handler: async (ctx) => {
        const authHeader = ctx.request.headers.get('authorization')
        const CRON_SECRET = process.env.CRON_SECRET

        if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
            throw new UnauthorizedError('Invalid cron secret')
        }

        const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
            Promise.race([
                p,
                new Promise<T>((_, reject) =>
                    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
                )
            ]);

        const safeRun = async <T>(label: string, fn: () => Promise<T>, timeoutMs: number): Promise<T | { processed: number; error: string }> => {
            try {
                return await withTimeout(fn(), timeoutMs, label);
            } catch (err: any) {
                console.error(`[Cron] ${label} failed:`, err.message);
                return { processed: 0, error: err.message };
            }
        };

        const supabase = createAdminClient()

        const [blogSyncResults, blogGenResults] = await Promise.all([
            safeRun('syncGoogleSheetsBlogs', () => syncGoogleSheetsBlogs(supabase),  20_000),
            safeRun('blogGeneration',        () => runBlogGeneration(),               55_000),
        ]);

        const results = {
            blogSync:      blogSyncResults,
            blogGeneration: blogGenResults,
        }

        const hasErrors = Object.values(results).some(
            (r) => r !== null && typeof r === 'object' && 'error' in r
        )

        return {
            success: !hasErrors,
            ...results
        }
    }
})

async function runBlogGeneration() {
    const { processGenerationQueue } = await import('@/features/blog/services/blog-generator')
    return processGenerationQueue(3)
}

/**
 * Sync blog posts from Google Sheets
 * This pulls from the primary admin integration
 */
async function syncGoogleSheetsBlogs(supabase: SupabaseClient<Database>) {
    try {
        const { data: integrations } = await supabase
            .from('integrations')
            .select('*')
            .eq('provider', 'google_sheets')
            .eq('status', 'connected');

        if (!integrations || integrations.length === 0) {
            return { processed: 0, message: 'No Google Sheets integrations found' };
        }

        const blogIntegrations = integrations.filter((int) =>
            (int.config as any)?.mapping?.is_blog_mapping === true
        );

        if (blogIntegrations.length === 0) {
            return { processed: 0, message: 'No blog-specific Sheets sync configured' };
        }

        let totalImported = 0;
        const { ACTIVE_LOCALES } = await import('@/config/locales');
        const { translateContentAction } = await import('@/features/blog');
        const { google } = await import('googleapis');
        const { OAuth2Client } = await import('google-auth-library');

        for (const integration of blogIntegrations) {
            const config = integration.config as unknown as GoogleSheetsConfig;
            const { spreadsheetId, sheetName, mapping, lastSyncedRow = 0 } = config;

            const oauth2Client = new OAuth2Client(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            oauth2Client.setCredentials({
                access_token: config.access_token,
                refresh_token: config.refresh_token,
                expiry_date: config.expiry_date
            });

            const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
            const range = `${sheetName || 'Sheet1'}!A${lastSyncedRow + 2}:Z`;

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range
            });

            const rows = response.data.values || [];
            if (rows.length === 0) continue;

            type ParsedRow = { title: string; content: string; excerpt: string; slug: string };
            const parsedRows: ParsedRow[] = [];
            for (const row of rows) {
                const blogData: Record<string, string> = {};
                Object.entries(mapping as Record<string, string>).forEach(([field, col]) => {
                    if (field === 'is_blog_mapping') return;
                    const colIndex = col.charCodeAt(0) - 65;
                    blogData[field] = row[colIndex] as string;
                });
                if (!blogData.title || !blogData.content) continue;
                parsedRows.push({
                    title: blogData.title,
                    content: blogData.content,
                    excerpt: blogData.excerpt || blogData.content.substring(0, 150) + '...',
                    slug: blogData.slug || blogData.title.toLowerCase().replace(/ /g, '-'),
                });
            }

            if (parsedRows.length === 0) continue;

            const { data: createdPosts, error: postsError } = await supabase
                .from('posts')
                .insert(parsedRows.map(d => ({
                    title: d.title,
                    content: d.content,
                    excerpt: d.excerpt,
                    slug: d.slug,
                    published: true,
                    published_at: new Date().toISOString(),
                })))
                .select();

            if (postsError || !createdPosts?.length) {
                console.error('Error batch importing blog posts:', postsError);
                continue;
            }

            await supabase.from('event_logs').insert(
                createdPosts.map((post: Database['public']['Tables']['posts']['Row']) => ({
                    account_id: integration.account_id,
                    event_type: 'blog_auto_imported',
                    entity_type: 'post',
                    entity_id: post.id,
                    data: { title: post.title },
                }))
            );

            await Promise.allSettled(
                createdPosts.map(async (post: Database['public']['Tables']['posts']['Row'], idx: number) => {
                    const { title, content, excerpt } = parsedRows[idx];

                    const translationResults = await Promise.allSettled(
                        ACTIVE_LOCALES.filter((locale: string) => locale !== 'en').map(async (locale: string) => {
                            const [tTitle, tContent, tExcerpt] = await Promise.all([
                                translateContentAction(title, locale),
                                translateContentAction(content, locale),
                                translateContentAction(excerpt, locale),
                            ]);
                            return { locale, tTitle, tContent, tExcerpt };
                        })
                    );

                    const successful = translationResults
                        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                        .map(r => (r as PromiseFulfilledResult<any>).value);

                    if (successful.length === 0) return;

                    await Promise.all([
                        supabase.from('post_translations').insert(
                            successful.map(({ locale, tTitle, tContent, tExcerpt }) => ({
                                post_id: post.id,
                                language: locale,
                                title: tTitle,
                                content: tContent,
                                excerpt: tExcerpt,
                                slug: `${post.slug}-${locale}`,
                            }))
                        ),
                        supabase.from('event_logs').insert(
                            successful.map(({ locale, tTitle }) => ({
                                account_id: integration.account_id,
                                event_type: 'blog_auto_translated',
                                entity_type: 'post_translation',
                                entity_id: post.id,
                                data: { locale, title: tTitle },
                            }))
                        ),
                    ]);
                })
            );

            totalImported += createdPosts.length;

            await supabase
                .from('integrations')
                .update({
                    config: {
                        ...config,
                        lastSyncedRow: lastSyncedRow + rows.length
                    }
                })
                .eq('id', integration.id);
        }

        return { processed: totalImported, message: `Successfully auto-published ${totalImported} posts with translations` };
    } catch (err: any) {
        console.error('Blog sync error:', err);
        return { processed: 0, error: err.message };
    }
}
