import { createAdminClient } from '@/core/db/admin'
import { google } from 'googleapis'
import { getSheetsClient } from '@/features/integrations/providers/google/sheets'
import { uploadImageFromUrl, processContentImages } from '@/features/integrations/providers/storage'
import type { BlogImportSummary } from '@/shared/types/blog'
import { ACTIVE_LOCALES } from '@/config/locales'
import type { BlogSyncConfig } from '../types'

export type { BlogSyncConfig }

/**
 * Sync blog posts from Google Sheets
 */
export async function syncBlogFromSheets(integrationId: string): Promise<BlogImportSummary> {
    const supabase = createAdminClient();
    const summary: BlogImportSummary = {
        imported: 0,
        updated: 0,
        skipped: 0,
        translated: 0,
        errors: []
    };

    try {
        const { data: integration } = await supabase
            .from('integrations')
            .select('account_id, config')
            .eq('id', integrationId)
            .single();

        const config = integration?.config as unknown as BlogSyncConfig | null;
        if (!config?.spreadsheetId || !config?.mapping) {
            throw new Error('Google Sheets mapping is not configured for blog sync');
        }

        const oauth2Client = await getSheetsClient(integrationId);
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: `${config.sheetName || 'Sheet1'}!A2:Z`
        });

        const rows = response.data.values || [];
        const { mapping } = config;

        // Hoist the user lookup to avoid N+1 network requests
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id || null;

        for (const row of rows) {
            try {
                // Get column indices (A=0, B=1...)
                const getVal = (col?: string) => {
                    if (!col) return undefined;
                    const idx = col.charCodeAt(0) - 65;
                    return row[idx]?.toString().trim();
                };

                const title = getVal(mapping.title);
                const content = getVal(mapping.content);
                const sheetId = getVal(mapping.sheet_id); // Stable ID

                if (!title || !content) {
                    summary.skipped++;
                    continue;
                }

                const slug = getVal(mapping.slug) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const excerpt = getVal(mapping.excerpt) || content.substring(0, 160).replace(/[#*`]/g, '');
                const publishedStr = getVal(mapping.published);
                const isPublished = publishedStr?.toLowerCase() === 'true' || publishedStr === '1';
                const externalImage = getVal(mapping.featured_image);

                // 1. Process Images
                let featuredImageUrl = null;
                if (externalImage) {
                    featuredImageUrl = await uploadImageFromUrl(externalImage);
                }
                const processedContent = await processContentImages(content);

                // 2. Prepare Post Object
                const postData: any = {
                    title: title,
                    slug: slug,
                    content: processedContent,
                    excerpt: excerpt,
                    published: isPublished,
                    published_at: isPublished ? new Date().toISOString() : null,
                    featured_image_url: featuredImageUrl,
                    author_id: currentUserId,
                    metadata: { 
                        sync_source: 'google_sheets',
                        sheet_id: sheetId,
                        last_sync: new Date().toISOString()
                    }
                };

                // 3. Upsert Logic (Scenario B: Check by sheetId if available, else by slug)
                let existingPostId = null;
                if (sheetId) {
                    const { data: existingBySheetId } = await supabase
                        .from('posts')
                        .select('id, slug')
                        .contains('metadata', { sheet_id: sheetId })
                        .maybeSingle();
                    
                    if (existingBySheetId) {
                        existingPostId = existingBySheetId.id;
                        // Handle Redirects if slug changed
                        if (existingBySheetId.slug !== slug) {
                            await supabase.from('blog_redirects').upsert({
                                old_slug: existingBySheetId.slug,
                                new_slug: slug,
                                locale: 'en'
                            }, { onConflict: 'old_slug, locale' });
                        }
                    }
                }

                if (!existingPostId) {
                    const { data: existingBySlug } = await supabase
                        .from('posts')
                        .select('id')
                        .eq('slug', slug)
                        .maybeSingle();
                    existingPostId = existingBySlug?.id;
                }

                let finalPostId = null;
                if (existingPostId) {
                    const { data: updated, error: updateError } = await supabase
                        .from('posts')
                        .update(postData)
                        .eq('id', existingPostId)
                        .select('id')
                        .single();
                    if (updateError) throw updateError;
                    finalPostId = updated.id;
                    summary.updated++;
                } else {
                    const { data: inserted, error: insertError } = await supabase
                        .from('posts')
                        .insert(postData)
                        .select('id')
                        .single();
                    if (insertError) throw insertError;
                    finalPostId = inserted.id;
                    summary.imported++;
                }

                // 4. Categories & Tags (Simplified for now - can be expanded)
                const categoriesStr = getVal(mapping.categories);
                if (categoriesStr) {
                    const _categories = categoriesStr.split(',').map((c: string) => c.trim().toLowerCase());
                    // Logic to link categories goes here
                }

                // 5. Queue Translations for background processing
                if (finalPostId) {
                    const otherLocales = ACTIVE_LOCALES.filter(l => l !== 'en');
                    for (const locale of otherLocales) {
                        await supabase.from('blog_translation_queue').upsert({
                            post_id: finalPostId,
                            target_locale: locale,
                            status: 'pending',
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'post_id, target_locale' });
                    }
                    summary.translated += otherLocales.length;
                }

            } catch (rowError: any) {
                summary.errors.push(`Row error: ${rowError.message}`);
                console.error(`[BlogSync] Error processing row:`, rowError);
            }
        }

    } catch (error: any) {
        summary.errors.push(`Sync failed: ${error.message}`);
        console.error(`[BlogSync] Critical error:`, error);
    }

    return summary;
}
