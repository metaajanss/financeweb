import { createAdminClient } from '@/core/db/admin';
import { OAuth2Client } from 'google-auth-library';
import { Tables } from '@/shared/types/database.types';
import { webmasters_v3 } from 'googleapis';

type GSCConnection = Tables<'gsc_connections'>;
type Post = Tables<'posts'>;
type Webmasters = webmasters_v3.Webmasters;

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.GOOGLE_GSC_REDIRECT_URI!;

// ─── OAuth ────────────────────────────────────────────────────────────────────

export function getGSCAuthUrl(): string {
    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent select_account',
        scope: ['https://www.googleapis.com/auth/webmasters.readonly',
                'https://www.googleapis.com/auth/userinfo.email'],
    });
}

export async function connectGSC(code: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const supabase = createAdminClient();
        const client   = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // Get user email
        const { google } = await import('googleapis');
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const { data: info } = await oauth2.userinfo.get();

        // Get verified sites list
        const webmasters = google.webmasters({ version: 'v3', auth: client });
        const { data: sitesData } = await webmasters.sites.list();
        
        console.log('[GSC] Sites found:', sitesData.siteEntry?.length ?? 0);
        
        // Find the most relevant site (try to match payofflab.app or first one)
        const siteEntry = sitesData.siteEntry?.find(s => s.siteUrl?.includes('payofflab.app')) || sitesData.siteEntry?.[0];
        const siteUrl = siteEntry?.siteUrl ?? '';

        console.log('[GSC] Selected siteUrl:', siteUrl);
        console.log('[GSC] User email:', info.email);

        if (!siteUrl) {
            console.error('[GSC] No verified sites found for this account');
            return { error: 'No verified sites found in your Google Search Console account. Please verify your site first.' };
        }

        const { error } = await supabase
            .from('gsc_connections')
            .upsert({
                site_url:      siteUrl,
                email:         info.email,
                access_token:  tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date:   tokens.expiry_date,
                status:        'connected',
            }, { onConflict: 'site_url' });

        if (error) {
            console.error('[GSC] DB Error:', error);
            return { error: error.message };
        }

        console.log('[GSC] Connection successful for:', siteUrl);
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error;
        return { error: error.message ?? 'Connection failed' };
    }
}

// ─── Authenticated GSC client ─────────────────────────────────────────────────

async function getGSCClient(connection: GSCConnection): Promise<Webmasters> {
    const { google } = await import('googleapis');
    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    client.setCredentials({
        access_token:  connection.access_token,
        refresh_token: connection.refresh_token,
        expiry_date:   connection.expiry_date,
    });

    // Auto-refresh if expired
    if (connection.expiry_date && Date.now() > connection.expiry_date - 60_000) {
        const { credentials } = await client.refreshAccessToken();
        const supabase = createAdminClient();
        await supabase
            .from('gsc_connections')
            .update({
                access_token: credentials.access_token,
                expiry_date:  credentials.expiry_date,
            })
            .eq('id', connection.id);
        client.setCredentials(credentials);
    }

    return google.webmasters({ version: 'v3', auth: client });
}

// ─── Data fetching ────────────────────────────────────────────────────────────

interface GSCRow {
    query:       string;
    page:        string;
    clicks:      number;
    impressions: number;
    ctr:         number;
    position:    number;
}

async function fetchSearchAnalytics(
    webmasters: Webmasters,
    siteUrl: string,
    startDate: string,
    endDate: string,
    rowLimit = 1000,
): Promise<GSCRow[]> {
    const res = await webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions: ['query', 'page'],
            rowLimit,
            dataState: 'final',
        },
    });

    return (res.data.rows ?? []).map((r: any) => ({
        query:       r.keys?.[0] ?? '',
        page:        r.keys?.[1] ?? '',
        clicks:      r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr:         r.ctr ?? 0,
        position:    r.position ?? 0,
    }));
}

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

// ─── Classification algorithm ─────────────────────────────────────────────────

type Category = 'quick_win' | 'ctr_crisis' | 'content_gap' | 'decay' | 'cannibalization' | 'featured_snippet';
type Intent   = 'informational' | 'commercial' | 'transactional' | 'navigational';
type Action   = 'create' | 'update' | 'optimize_title' | 'merge' | 'add_snippet_format';

function detectIntent(query: string): Intent {
    const q = query.toLowerCase();
    if (/nedir|nasıl|ne zaman|neden|ne kadar|what|how|why|when|guide|tutorial|rehber/i.test(q))
        return 'informational';
    if (/en iyi|karşılaştırma|\svs\s|fiyat|inceleme|best|review|compare|pricing|alternative/i.test(q))
        return 'commercial';
    if (/satın al|indir|ücretsiz|demo|buy|download|free|sign up|trial|kayıt/i.test(q))
        return 'transactional';
    if (/payofflab|login|giriş|hesap|dashboard/i.test(q))
        return 'navigational';
    return 'informational';
}

function isSnippetCandidate(query: string): boolean {
    return /^(nedir|nasıl|ne zaman|neden|what is|how to|why|when|what are)/i.test(query.trim());
}

function calcPriority(
    impressions: number,
    position: number,
    ctr: number,
    category: Category,
    impTrend = 0,
): number {
    const imp    = Math.min(impressions, 15000) / 15000;
    const posGap = Math.max(0, 20 - position) / 20;
    const ctrGap = Math.max(0, 0.20 - ctr) / 0.20;
    const trend  = impTrend > 0 ? 1 + impTrend * 0.3 : 1;

    const bonus: Record<Category, number> = {
        featured_snippet: 1.25,
        quick_win:        1.20,
        content_gap:      1.15,
        ctr_crisis:       1.10,
        decay:            1.05,
        cannibalization:  1.00,
    };

    return Math.min(100, (imp * 35 + posGap * 35 + ctrGap * 30) * trend * bonus[category]);
}

function matchQuery(query: string, posts: Post[]): Post | null {
    if (!posts.length) return null;
    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    let best: { post: Post; score: number } | null = null;

    for (const post of posts) {
        const p = post as any;
        const haystack = [
            p.title ?? '',
            p.slug?.replace(/-/g, ' ') ?? '',
            ...(p.seo_keywords ?? []),
        ].join(' ').toLowerCase();

        const haystackWords = haystack.split(/\s+/);
        const overlap = qWords.filter(w => haystackWords.some(hw => hw.includes(w))).length;
        const score   = overlap / qWords.length;

        if (score >= 0.5 && (!best || score > best.score)) {
            best = { post, score };
        }
    }

    return best?.post ?? null;
}

// ─── Cannibalization detection ────────────────────────────────────────────────

function detectCannibalization(rows: GSCRow[]): string[] {
    const queryPageMap: Record<string, string[]> = {};
    for (const r of rows) {
        if (!queryPageMap[r.query]) queryPageMap[r.query] = [];
        if (!queryPageMap[r.query].includes(r.page)) queryPageMap[r.query].push(r.page);
    }
    return Object.entries(queryPageMap)
        .filter(([, pages]) => pages.length >= 2)
        .map(([query]) => query);
}

// ─── Auto-mode: generate posts without human approval ────────────────────────

// Actions that can be safely automated (no structural site changes needed)
const AUTO_ELIGIBLE_ACTIONS = new Set(['create', 'update', 'add_snippet_format', 'optimize_title']);

async function autoProcessRecommendations(
    supabase: ReturnType<typeof createAdminClient>,
    conn: GSCConnection,
    recs: any[],
): Promise<void> {
    const minScore  = conn.auto_min_score  ?? 60;
    const maxPerRun = conn.auto_max_per_run ?? 3;

    // Pick top N eligible recs sorted by priority
    const eligible = recs
        .filter(r => r.priority_score >= minScore && AUTO_ELIGIBLE_ACTIONS.has(r.recommended_action))
        .sort((a, b) => b.priority_score - a.priority_score)
        .slice(0, maxPerRun);

    if (!eligible.length) return;

    console.log(`[GSC Auto] Processing ${eligible.length} recommendations for ${conn.site_url}`);

    const toneMap: Record<string, string> = {
        informational: 'informative',
        commercial:    'persuasive',
        transactional: 'persuasive',
        navigational:  'informative',
    };
    const lengthMap: Record<string, number> = {
        create:            1500,
        update:            1200,
        optimize_title:    800,
        add_snippet_format: 1000,
    };

    const { createTopicAction, triggerGenerationAction } = await import('@/features/blog');

    // Get the inserted rec IDs (they were just inserted, fetch them back)
    const { data: insertedRecs } = await supabase
        .from('gsc_recommendations')
        .select('id, query, intent, recommended_action, priority_score')
        .eq('connection_id', conn.id)
        .eq('status', 'pending')
        .in('query', eligible.map(r => r.query))
        .order('priority_score', { ascending: false })
        .limit(maxPerRun);

    if (!insertedRecs?.length) return;

    for (const rec of insertedRecs) {
        try {
            // Mark as in_progress immediately to avoid double-processing
            await supabase
                .from('gsc_recommendations')
                .update({ status: 'in_progress' })
                .eq('id', rec.id);

            const { topic } = await createTopicAction({
                keywords:        [rec.query],
                tone:            toneMap[rec.intent] as any ?? 'informative',
                length_words:    lengthMap[rec.recommended_action] ?? 1200,
                posts_per_run:   1,
                auto_publish:    conn.auto_publish ?? false,
                schedule_type:   'manual',
                generation_mode: 'combined',
            });

            if (!topic?.id) {
                await supabase.from('gsc_recommendations').update({ status: 'pending' }).eq('id', rec.id);
                continue;
            }

            await supabase
                .from('gsc_recommendations')
                .update({ topic_id: topic.id })
                .eq('id', rec.id);

            const result = await triggerGenerationAction(topic.id);

            await supabase
                .from('gsc_recommendations')
                .update({ status: result.success ? 'completed' : 'pending' })
                .eq('id', rec.id);

            console.log(`[GSC Auto] "${rec.query}" → ${result.success ? `✓ ${result.titles?.[0]}` : `✗ ${result.errors?.[0]}`}`);
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`[GSC Auto] Failed for "${rec.query}":`, error.message);
            await supabase.from('gsc_recommendations').update({ status: 'pending' }).eq('id', rec.id);
        }
    }
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncGSCRecommendations(connectionId?: string): Promise<{
    processed: number; message: string; error?: string;
}> {
    const supabase = createAdminClient();

    try {
        // Get connection(s)
        const query = supabase.from('gsc_connections').select('*').eq('status', 'connected');
        if (connectionId) query.eq('id', connectionId);
        const { data: connections } = await query.limit(5);

        if (!connections?.length) return { processed: 0, message: 'No GSC connections found' };

        // Get all published posts for matching
        const { data: posts } = await supabase
            .from('posts')
            .select('id, title, slug, seo_keywords, content_type')
            .eq('published', true) as any;

        let totalRecs = 0;

        for (const conn of connections) {
            try {
                const webmasters = await getGSCClient(conn);

                // Fetch 90d and 30d windows for trend calculation
                const [rows90, rows30] = await Promise.all([
                    fetchSearchAnalytics(webmasters, conn.site_url, daysAgo(90), daysAgo(1)),
                    fetchSearchAnalytics(webmasters, conn.site_url, daysAgo(30), daysAgo(1)),
                ]);

                // Build 30d lookup for trend
                const map30: Record<string, GSCRow> = {};
                for (const r of rows30) map30[r.query] = r;

                // Cannibalization queries
                const cannibalized = new Set(detectCannibalization(rows90));

                // Store raw data (replace previous batch)
                await supabase.from('gsc_raw_data').delete().eq('connection_id', conn.id);
                if (rows90.length) {
                    await supabase.from('gsc_raw_data').insert(
                        rows90.map(r => ({ connection_id: conn.id, ...r, date_range: '90d' }))
                    );
                }

                // Build recommendations
                const recs: any[] = [];
                const seen = new Set<string>(); // deduplicate by query

                for (const row of rows90) {
                    if (seen.has(row.query)) continue;
                    seen.add(row.query);

                    const prev   = map30[row.query];
                    const impT   = prev ? (row.impressions - prev.impressions) / Math.max(prev.impressions, 1) : 0;
                    const clkT   = prev ? (row.clicks     - prev.clicks)       / Math.max(prev.clicks, 1)       : 0;
                    const posT   = prev ? (prev.position  - row.position)      : 0; // positive = improved

                    const matched = matchQuery(row.query, posts ?? []);

                    let category: Category | null = null;
                    let action: Action = 'create';

                    if (cannibalized.has(row.query)) {
                        category = 'cannibalization'; action = 'merge';
                    } else if (isSnippetCandidate(row.query) && row.position <= 5 && row.impressions >= 500) {
                        category = 'featured_snippet'; action = 'add_snippet_format';
                    } else if (row.position >= 4 && row.position <= 15 && row.impressions >= 300 && matched) {
                        category = 'quick_win'; action = 'update';
                    } else if (row.impressions >= 800 && row.ctr < 0.025 && row.position <= 12) {
                        category = 'ctr_crisis'; action = 'optimize_title';
                    } else if (row.impressions >= 400 && !matched) {
                        category = 'content_gap'; action = 'create';
                    } else if (clkT < -0.25 && matched) {
                        category = 'decay'; action = 'update';
                    }

                    if (!category) continue;

                    recs.push({
                        connection_id:       conn.id,
                        query:               row.query,
                        category,
                        intent:              detectIntent(row.query),
                        priority_score:      calcPriority(row.impressions, row.position, row.ctr, category, impT),
                        recommended_action:  action,
                        matched_post_id:     matched?.id ?? null,
                        status:              'pending',
                        impressions:         row.impressions,
                        clicks:              row.clicks,
                        ctr:                 row.ctr,
                        position:            row.position,
                        impressions_trend:   impT,
                        clicks_trend:        clkT,
                        position_trend:      posT,
                        synced_at:           new Date().toISOString(),
                    });
                }

                // Upsert recommendations (keep dismissed ones, refresh pending)
                if (recs.length) {
                    await supabase
                        .from('gsc_recommendations')
                        .delete()
                        .eq('connection_id', conn.id)
                        .in('status', ['pending']);

                    await supabase.from('gsc_recommendations').insert(recs);
                }

                // Update last_synced_at
                await supabase
                    .from('gsc_connections')
                    .update({ last_synced_at: new Date().toISOString() })
                    .eq('id', conn.id);

                totalRecs += recs.length;

                // ── Auto-mode: process top recommendations without human approval ──
                if (conn.auto_mode && recs.length > 0) {
                    await autoProcessRecommendations(supabase, conn, recs);
                }
            } catch (connErr: unknown) {
                const error = connErr as Error;
                console.error(`[GSC] Sync failed for connection ${conn.id}:`, error.message);
                await supabase
                    .from('gsc_connections')
                    .update({ status: 'error' })
                    .eq('id', conn.id);
            }
        }

        return { processed: totalRecs, message: `Generated ${totalRecs} SEO recommendations` };
    } catch (err: unknown) {
        const error = err as Error;
        return { processed: 0, message: 'GSC sync error', error: error.message };
    }
}

// ─── Freshness scoring ────────────────────────────────────────────────────────

export async function updateFreshnessScores(): Promise<void> {
    const supabase = createAdminClient();

    const { data: posts } = await supabase
        .from('posts')
        .select('id, slug, updated_at')
        .eq('published', true);

    if (!posts?.length) return;

    const now = Date.now();

    for (const post of posts) {
        const daysSince = Math.floor((now - new Date(post.updated_at || now).getTime()) / 86_400_000);

        // Pull GSC position trend for this post if available
        const { data: gscRow } = await supabase
            .from('gsc_raw_data')
            .select('position, clicks')
            .ilike('page', `%${post.slug}%`)
            .order('synced_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const ageScore      = Math.min(daysSince, 365) / 365 * 40;
        const positionScore = gscRow ? Math.max(0, gscRow.position - 3) * 2 : 0; // penalty if pos > 3
        const score         = Math.min(100, Math.round(ageScore + positionScore));

        await supabase
            .from('posts')
            .update({
                freshness_score:   score,
                needs_update:      score >= 65,
                last_seo_audit_at: new Date().toISOString(),
            } as any)
            .eq('id', post.id);
    }
}
