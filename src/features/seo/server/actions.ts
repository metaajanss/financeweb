'use server';

import { createAdminClient } from '@/core/db/admin';
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
    const { createClient } = await import('@/core/db/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    if (profile?.role !== 'admin' && user.email !== adminEmail)
        throw new Error('Forbidden');
}

// ─── GSC Connection ───────────────────────────────────────────────────────────

export async function getGSCAuthUrlAction() {
    await assertAdmin();
    const { getGSCAuthUrl } = await import('@/features/integrations/providers/google/search-console');
    return { url: getGSCAuthUrl() };
}

export async function getGSCConnectionsAction() {
    await assertAdmin();
    const supabase = createAdminClient() as any;
    const { data, error } = await supabase
        .from('gsc_connections')
        .select('id, site_url, email, status, last_synced_at, auto_mode, auto_publish, auto_min_score, auto_max_per_run')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function disconnectGSCAction(id: string) {
    await assertAdmin();
    const supabase = createAdminClient() as any;
    await supabase.from('gsc_connections').update({ status: 'disconnected' }).eq('id', id);
    revalidatePath('/super-admin/seo');
}

export async function updateConnectionSettingsAction(
    id: string,
    settings: {
        auto_mode?:        boolean;
        auto_publish?:     boolean;
        auto_min_score?:   number;
        auto_max_per_run?: number;
    }
) {
    await assertAdmin();
    const supabase = createAdminClient() as any;
    const { error } = await supabase
        .from('gsc_connections')
        .update(settings)
        .eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/super-admin/seo');
}

// ─── Sync & Recommendations ───────────────────────────────────────────────────

export async function triggerGSCSyncAction(connectionId?: string) {
    await assertAdmin();
    const { syncGSCRecommendations } = await import('@/features/integrations/providers/google/search-console');
    const result = await syncGSCRecommendations(connectionId);
    revalidatePath('/super-admin/seo');
    return result;
}

export async function getRecommendationsAction(filters?: {
    category?: string;
    status?: string;
    limit?: number;
}) {
    await assertAdmin();
    const supabase = createAdminClient() as any;
    let q = supabase
        .from('gsc_recommendations')
        .select('*, posts(title, slug)')
        .order('priority_score', { ascending: false })
        .limit(filters?.limit ?? 100);

    if (filters?.category && filters.category !== 'all') q = q.eq('category', filters.category);
    if (filters?.status)   q = q.eq('status', filters.status);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function updateRecommendationStatusAction(id: string, status: 'accepted' | 'dismissed') {
    await assertAdmin();
    const supabase = createAdminClient() as any;
    await supabase.from('gsc_recommendations').update({ status }).eq('id', id);
    revalidatePath('/super-admin/seo');
}

export async function acceptAndGenerateAction(recId: string) {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const { data: rec, error } = await supabase
        .from('gsc_recommendations')
        .select('*')
        .eq('id', recId)
        .single();

    if (error || !rec) return { success: false, count: 0, titles: [], errors: ['Recommendation not found'] };

    // Map intent to tone
    const toneMap: Record<string, string> = {
        informational: 'informative',
        commercial:    'persuasive',
        transactional: 'persuasive',
        navigational:  'informative',
    };

    // Map action to generation config
    const lengthMap: Record<string, number> = {
        create:            1500,
        update:            1200,
        optimize_title:    800,
        merge:             1200,
        add_snippet_format: 1000,
    };

    const { createTopicAction } = await import('@/features/blog');
    const { topic } = await createTopicAction({
        keywords:        [rec.query],
        tone:            toneMap[rec.intent] as any ?? 'informative',
        length_words:    lengthMap[rec.recommended_action] ?? 1200,
        posts_per_run:   1,
        auto_publish:    false,
        schedule_type:   'manual',
        generation_mode: 'combined',
    });

    if (!topic?.id) return { success: false, count: 0, titles: [], errors: ['Topic creation failed'] };

    // Link recommendation → topic
    await supabase
        .from('gsc_recommendations')
        .update({ status: 'in_progress', topic_id: topic.id })
        .eq('id', recId);

    // Trigger generation immediately
    const { triggerGenerationAction } = await import('@/features/blog');
    const result = await triggerGenerationAction(topic.id);

    if (result.success) {
        await supabase
            .from('gsc_recommendations')
            .update({ status: 'completed' })
            .eq('id', recId);
    }

    revalidatePath('/super-admin/seo');
    revalidatePath('/super-admin/blog');
    return result;
}

// ─── SEO Health ───────────────────────────────────────────────────────────────

export async function getSEOHealthAction() {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const [
        { data: posts },
        { data: recs },
        { data: connections },
    ] = await Promise.all([
        supabase.from('posts')
            .select('id, title, slug, freshness_score, needs_update, updated_at, view_count, rank_at_30d')
            .eq('published', true)
            .order('freshness_score', { ascending: false })
            .limit(50),
        supabase.from('gsc_recommendations')
            .select('category, status, priority_score')
            .in('status', ['pending', 'in_progress']),
        supabase.from('gsc_connections')
            .select('id, site_url, status, last_synced_at')
            .eq('status', 'connected'),
    ]);

    const needsUpdate  = (posts ?? []).filter((p: any) => p.needs_update);
    const byCategory   = (recs ?? []).reduce((acc: any, r: any) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
    }, {});

    const avgFreshness = posts?.length
        ? Math.round((posts as any[]).reduce((s, p) => s + (p.freshness_score ?? 0), 0) / posts.length)
        : 0;

    const healthScore = Math.max(0, 100 - avgFreshness);

    return {
        healthScore,
        totalPosts:       posts?.length ?? 0,
        needsUpdateCount: needsUpdate.length,
        needsUpdatePosts: needsUpdate.slice(0, 10),
        pendingRecs:      recs?.length ?? 0,
        byCategory,
        connections:      connections ?? [],
        lastSync:         connections?.[0]?.last_synced_at ?? null,
    };
}

export async function triggerFreshnessUpdateAction() {
    await assertAdmin();
    const { updateFreshnessScores } = await import('@/features/integrations/providers/google/search-console');
    await updateFreshnessScores();
    revalidatePath('/super-admin/seo');
    return { success: true };
}
