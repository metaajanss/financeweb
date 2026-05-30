'use server'

import { createAdminClient } from '@/core/db/admin'
import { createClient } from '@/core/db/server'
import { revalidatePath } from 'next/cache'
import type {
    SocialPlatform,
    CreatePostInput,
    CreateCampaignInput,
    UpdateChannelSettingsInput,
} from '@/shared/types/social-media.types'
import { getAdapter, publishPostById, syncAIConfigToContentLibrary } from '@/features/social-media/services'
import { generateMarketingPost } from '@/features/social-media/services/content-generator'
import type { MarketingGoal, CampaignTone, ContentType } from '@/shared/types/social-media.types'
import { randomUUID } from 'crypto'

async function verifySuperAdmin(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com'
    return user.email === adminEmail || user.app_metadata?.role === 'super_admin'
}

// ─── HESAP YÖNETİMİ ──────────────────────────────────────────────────────────

export async function getAccountsAction() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_accounts')
        .select('id, platform, account_name, platform_user_id, is_active, last_used_at, created_at, updated_at')
        .order('platform')
    return data ?? []
}

export async function getOAuthUrlAction(platform: SocialPlatform): Promise<{ url: string }> {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')

    const state = randomUUID()
    const supabase = createAdminClient()

    // State'i DB'ye kaydet (5 dk TTL migration'da tanımlı)
    await (supabase as any).from('social_media_oauth_states').insert({ state, platform })

    const adapter = getAdapter(platform)
    return { url: adapter.getOAuthUrl(state) }
}

export async function validateAccountAction(platform: SocialPlatform): Promise<{ valid: boolean }> {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    const { data: account } = await (supabase as any)
        .from('social_media_accounts')
        .select('credentials')
        .eq('platform', platform)
        .single()

    if (!account?.credentials) return { valid: false }

    const adapter = getAdapter(platform)
    const valid = await adapter.validateCredentials(account.credentials)

    if (!valid) {
        await (supabase as any)
            .from('social_media_accounts')
            .update({ is_active: false })
            .eq('platform', platform)
    }

    return { valid }
}

export async function disconnectAccountAction(platform: SocialPlatform) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    await (supabase as any).from('social_media_accounts').delete().eq('platform', platform)

    // Bu platforma ait aktif kampanyaları duraklat
    await (supabase as any)
        .from('social_media_campaigns')
        .update({ status: 'paused' })
        .contains('target_platforms', [platform])
        .eq('status', 'active')

    revalidatePath('/super-admin/social-media')
}

// ─── KANAL AYARLARI ───────────────────────────────────────────────────────────

export async function getChannelSettingsAction() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_channel_settings')
        .select('*')
        .order('platform')
    return data ?? []
}

export async function updateChannelSettingsAction(platform: SocialPlatform, input: UpdateChannelSettingsInput) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')

    // Mix toplamı 100 olmalı
    if (input.mix_educational !== undefined) {
        const total = (input.mix_educational ?? 0) + (input.mix_industry ?? 0) +
            (input.mix_engagement ?? 0) + (input.mix_social_proof ?? 0) + (input.mix_promotional ?? 0)
        if (total !== 100) throw new Error('İçerik karması toplamı 100 olmalıdır')
    }

    const supabase = createAdminClient()
    await (supabase as any)
        .from('social_media_channel_settings')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('platform', platform)

    revalidatePath('/super-admin/social-media')
}

// ─── POST YÖNETİMİ ────────────────────────────────────────────────────────────

export async function getPostsAction(filters?: {
    platform?: SocialPlatform
    status?: string
    campaign_id?: string
    limit?: number
    offset?: number
}) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    let query = (supabase as any)
        .from('social_media_posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

    if (filters?.platform)    query = query.eq('platform', filters.platform)
    if (filters?.status)      query = query.eq('status', filters.status)
    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)

    query = query.range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1)

    const { data, count } = await query
    return { posts: data ?? [], total: count ?? 0 }
}

export async function createPostAction(input: CreatePostInput) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    const { data: account } = await (supabase as any)
        .from('social_media_accounts')
        .select('id')
        .eq('platform', input.platform)
        .eq('is_active', true)
        .single()

    const isImmediate = !input.scheduled_for

    const { data: post } = await (supabase as any)
        .from('social_media_posts')
        .insert({
            account_id:      account?.id ?? null,
            platform:        input.platform,
            title:           input.title ?? null,
            content:         input.content,
            hashtags:        input.hashtags ?? [],
            content_type:    input.content_type,
            post_type:       'manual',
            metadata:        input.metadata ?? {},
            campaign_id:     input.campaign_id ?? null,
            content_item_id: input.content_item_id ?? null,
            status:          isImmediate ? 'draft' : 'scheduled',
            scheduled_for:   input.scheduled_for ?? null,
        })
        .select()
        .single()

    if (!post) throw new Error('Post oluşturulamadı')

    // Hemen yayınla
    if (isImmediate) {
        await publishPostById(post.id)
    }

    revalidatePath('/super-admin/social-media')
    return post
}

export async function generatePostContentAction(params: {
    platform: SocialPlatform
    contentType: ContentType
    topic?: string
    marketingGoal?: MarketingGoal
    tone?: CampaignTone
    subreddit?: string
}) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    const { data: settings } = await (supabase as any)
        .from('social_media_channel_settings')
        .select('*')
        .eq('platform', params.platform)
        .single()

    if (!settings) throw new Error('Kanal ayarları bulunamadı')

    // Reddit subreddit override
    if (params.platform === 'reddit' && params.subreddit) {
        const cfg = settings.platform_config as Record<string, unknown>
        settings.platform_config = { ...cfg, default_subreddits: [params.subreddit] }
    }

    const knowledgeBase = await getGlobalKnowledgeBase()

    return await generateMarketingPost({
        platform:       params.platform,
        contentType:    params.contentType,
        contentItem:    null,
        marketingGoal:  params.marketingGoal ?? 'brand_awareness',
        targetAudience: 'SaaS şirket kurucuları ve sales direktörleri',
        tone:           params.tone ?? 'professional',
        knowledgeBase,
        channelSettings: settings,
        customTopic:    params.topic,
    })
}

export async function publishPostAction(postId: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const result = await publishPostById(postId)
    revalidatePath('/super-admin/social-media')
    return result
}

export async function deletePostAction(postId: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    await (supabase as any)
        .from('social_media_posts')
        .update({ status: 'deleted' })
        .eq('id', postId)
        .in('status', ['draft', 'scheduled', 'failed'])

    revalidatePath('/super-admin/social-media')
}

export async function retryPostAction(postId: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    await (supabase as any)
        .from('social_media_posts')
        .update({ status: 'draft', error_message: null })
        .eq('id', postId)
        .eq('status', 'failed')

    await publishPostById(postId)
    revalidatePath('/super-admin/social-media')
}

// ─── KAMPANYA YÖNETİMİ ────────────────────────────────────────────────────────

export async function getCampaignsAction() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_campaigns')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function createCampaignAction(input: CreateCampaignInput) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_campaigns')
        .insert(input)
        .select()
        .single()
    revalidatePath('/super-admin/social-media')
    return data
}

export async function updateCampaignAction(id: string, input: Partial<CreateCampaignInput>) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    await (supabase as any)
        .from('social_media_campaigns')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
    revalidatePath('/super-admin/social-media')
}

export async function toggleCampaignStatusAction(id: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_campaigns')
        .select('status')
        .eq('id', id)
        .single()
    if (!data) return

    const newStatus = data.status === 'active' ? 'paused' : 'active'
    await (supabase as any)
        .from('social_media_campaigns')
        .update({ status: newStatus })
        .eq('id', id)
    revalidatePath('/super-admin/social-media')
}

export async function deleteCampaignAction(id: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    await (supabase as any)
        .from('social_media_campaigns')
        .update({ status: 'archived' })
        .eq('id', id)
    revalidatePath('/super-admin/social-media')
}

export async function triggerCampaignAction(id: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const { processSocialMediaCampaigns } = await import('@/features/social-media/services')

    // Tek kampanyayı tetikle: last_run_at'i null yap, isDue() true döner
    const supabase = createAdminClient()
    await (supabase as any)
        .from('social_media_campaigns')
        .update({ last_run_at: null })
        .eq('id', id)

    await processSocialMediaCampaigns()
    revalidatePath('/super-admin/social-media')
}

export async function getCampaignHistoryAction(campaignId: string, limit = 20) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
        .from('social_media_run_history')
        .select('*, social_media_posts(content, platform_url, status)')
        .eq('campaign_id', campaignId)
        .order('generated_at', { ascending: false })
        .limit(limit)
    return data ?? []
}

// ─── İÇERİK KÜTÜPHANESİ ─────────────────────────────────────────────────────

export async function getContentLibraryAction(filters?: {
    status?: string
    content_type?: string
    limit?: number
}) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    let query = (supabase as any)
        .from('social_media_content_library')
        .select('*')
        .neq('status', 'archived')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })

    if (filters?.status)       query = query.eq('status', filters.status)
    if (filters?.content_type) query = query.eq('content_type', filters.content_type)
    query = query.limit(filters?.limit ?? 50)

    const { data } = await query
    return data ?? []
}

export async function createContentItemAction(input: {
    title: string
    body: string
    content_type: string
    suggested_platforms?: SocialPlatform[]
    priority?: number
}) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    await (supabase as any).from('social_media_content_library').insert({
        ...input,
        source: 'manual',
        status: 'approved',
    })
    revalidatePath('/super-admin/social-media')
}

export async function archiveContentItemAction(id: string) {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()
    await (supabase as any)
        .from('social_media_content_library')
        .update({ status: 'archived' })
        .eq('id', id)
    revalidatePath('/super-admin/social-media')
}

export async function triggerContextSyncAction() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    // Mevcut ai_config ile sync yap
    const { newConfig, previousConfig } = await getAIConfigForSync()
    const result = await syncAIConfigToContentLibrary(newConfig, previousConfig)
    revalidatePath('/super-admin/social-media')
    return result
}

// ─── ANALİTİK ────────────────────────────────────────────────────────────────

export async function getSocialMediaStatsAction() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized')
    const supabase = createAdminClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, publishedToday, scheduled, failed, activeCampaigns, libraryNew] = await Promise.all([
        supabase.from('social_media_posts' as any).select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
        supabase.from('social_media_posts' as any).select('*', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', today.toISOString()),
        supabase.from('social_media_posts' as any).select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('social_media_posts' as any).select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('social_media_campaigns' as any).select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('social_media_content_library' as any).select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    ])

    return {
        totalPosts:       total.count ?? 0,
        publishedToday:   publishedToday.count ?? 0,
        scheduled:        scheduled.count ?? 0,
        failed:           failed.count ?? 0,
        activeCampaigns:  activeCampaigns.count ?? 0,
        libraryApproved:  libraryNew.count ?? 0,
    }
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

async function getGlobalKnowledgeBase(): Promise<string> {
    // Super-admin'in kendi ai_config'ini al
    const supabase = createAdminClient()
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com'

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('email', adminEmail)
        .single()

    if (!profile?.account_id) return ''

    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', profile.account_id)
        .single()

    return (account?.ai_config as Record<string, unknown>)?.knowledge_base as string ?? ''
}

async function getAIConfigForSync() {
    const supabase = createAdminClient()
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com'

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('email', adminEmail)
        .single()

    if (!profile?.account_id) return { newConfig: {} as any, previousConfig: null }

    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', profile.account_id)
        .single()

    return { newConfig: account?.ai_config ?? {}, previousConfig: null }
}
