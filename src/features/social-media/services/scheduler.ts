import type {
    SocialPlatform,
    SocialMediaCampaign,
    ChannelSettings,
    ContentType,
    RedditPlatformConfig,
    SocialMediaPost,
    ContentLibraryItem,
} from '@/shared/types/social-media.types'
import { createAdminClient } from '@/core/db/admin'
import { generateMarketingPost, selectNextContentType } from './content-generator'
import { SOCIAL_ANGLES } from '@/shared/types/social-media.types'

// ─── Zamanlanmış postları yayınla ────────────────────────────────────────────

export async function processScheduledPosts(): Promise<void> {
    const supabase = createAdminClient()

    const { data: posts } = await supabase
        .from('social_media_posts')
        .select('*, social_media_accounts(*)')
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .lt('retry_count', 3)
        .limit(10)

    if (!posts?.length) return

    for (const post of posts) {
        await publishPostById(post.id)
    }
}

// ─── Aktif kampanyaları işle ──────────────────────────────────────────────────

export async function processSocialMediaCampaigns(): Promise<void> {
    const supabase = createAdminClient()

    const { data: campaigns } = await supabase
        .from('social_media_campaigns')
        .select('*')
        .eq('status', 'active')

    if (!campaigns?.length) return

    for (const campaign of (campaigns as any) as SocialMediaCampaign[]) {
        if (!isDue(campaign)) continue

        for (const platform of campaign.target_platforms as SocialPlatform[]) {
            await processCampaignPlatform(campaign, platform)
        }

        await supabase
            .from('social_media_campaigns')
            .update({ last_run_at: new Date().toISOString() })
            .eq('id', campaign.id)
    }
}

// ─── Tek kampanya + platform işle ────────────────────────────────────────────

async function processCampaignPlatform(
    campaign: SocialMediaCampaign,
    platform: SocialPlatform,
): Promise<void> {
    const supabase = createAdminClient()

    // Kanal ayarlarını al (override varsa birleştir)
    const settings = await getEffectiveChannelSettings(platform, campaign.platform_overrides?.[platform])
    if (!settings?.is_active) return

    // Günlük kota kontrolü
    const todayCount = await getTodayPublishedCount(platform)
    if (todayCount >= settings.daily_post_limit) return

    // Aktif saat kontrolü
    const now = toTimezone(new Date(), settings.timezone)
    if (!isWithinActiveHours(now, settings)) return

    // Son post zamanı kontrolü
    const lastPostAt = await getLastPostTime(platform)
    if (lastPostAt && hoursSince(lastPostAt) < settings.min_hours_between) return

    // İçerik tipi seç
    const recentPosts = await getRecentPosts(platform, 20)
    const contentType = selectNextContentType(settings, recentPosts)

    // Content item seç (engagement tipi için gerekmez)
    const contentItem = contentType !== 'engagement'
        ? await getNextContentItem(contentType, campaign.campaign_mode, campaign.topics)
        : null

    // Post üret
    const { data: account } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .single()

    if (!account) return

    // ai_config'i al
    const knowledgeBase = await getKnowledgeBase()

    // Açı rotasyonu
    const angleIndex = (campaign.last_angle_index + 1) % SOCIAL_ANGLES.length
    const angle = SOCIAL_ANGLES[angleIndex]

    // Reddit subreddit rotasyonu
    let platformSettings = settings
    if (platform === 'reddit') {
        const redditConfig = settings.platform_config as RedditPlatformConfig
        if (redditConfig?.subreddit_rotation && redditConfig?.default_subreddits?.length > 1) {
            const subIndex = campaign.total_generated % redditConfig.default_subreddits.length
            const rotatedSubreddit = redditConfig.default_subreddits[subIndex]
            platformSettings = {
                ...settings,
                platform_config: { ...redditConfig, default_subreddits: [rotatedSubreddit] },
            }
        }
    }

    try {
        const generated = await generateMarketingPost({
            platform,
            contentType,
            contentItem,
            marketingGoal:   campaign.marketing_goal,
            targetAudience:  campaign.target_audience ?? '',
            tone:            campaign.tone,
            knowledgeBase,
            mandatoryRules:  [],
            avoidTopics:     campaign.avoid_topics,
            ctaUrl:          campaign.cta_url ?? undefined,
            utmParams:       campaign.utm_params,
            channelSettings: platformSettings,
            angle,
            customTopic:     campaign.topics?.[0],
        })

        // Post kaydet
        const { data: newPost } = await supabase
            .from('social_media_posts')
            .insert({
                account_id:      account.id,
                platform,
                campaign_id:     campaign.id,
                content_item_id: contentItem?.id ?? null,
                title:           generated.title ?? null,
                content:         generated.content,
                hashtags:        generated.hashtags,
                content_type:    generated.content_type,
                post_type:       'campaign',
                metadata:        generated.metadata ?? {},
                status:          'publishing',
                scheduled_for:   null,
            } as any)
            .select()
            .single()

        if (!newPost) return

        // Yayınla
        const result = await publishPostById(newPost.id)

        // Kampanya güncelle
        await supabase
            .from('social_media_campaigns')
            .update({
                last_angle_index: angleIndex,
                total_generated:  (campaign.total_generated ?? 0) + 1,
            })
            .eq('id', campaign.id)

        // Content item kullanıldı olarak işaretle
        if (contentItem) {
            await supabase
                .from('social_media_content_library')
                .update({
                    times_used:   (contentItem.times_used ?? 0) + 1,
                    last_used_at: new Date().toISOString(),
                    used_in_posts: [...(contentItem.used_in_posts ?? []), newPost.id],
                    status:       (contentItem.times_used ?? 0) + 1 >= 1 ? 'posted' : 'approved',
                })
                .eq('id', contentItem.id)
        }

        // Run history kaydet
        await supabase.from('social_media_run_history').insert({
            campaign_id:  campaign.id,
            post_id:      newPost.id,
            platform,
            content_type: contentType,
            trigger_type: 'cron_daily',
            status:       result ? 'success' : 'failed',
        })

    } catch (err: unknown) {
        await supabase.from('social_media_run_history').insert({
            campaign_id:  campaign.id,
            platform,
            content_type: contentType,
            trigger_type: 'cron_daily',
            status:       'failed',
            error:        err instanceof Error ? err.message : String(err),
        })
    }
}

// ─── Tek post yayınla ────────────────────────────────────────────────────────

export async function publishPostById(postId: string): Promise<boolean> {
    const supabase = createAdminClient()

    const { data: post } = await supabase
        .from('social_media_posts')
        .select('*, social_media_accounts(*)')
        .eq('id', postId)
        .single()

    if (!post) return false

    const account = post.social_media_accounts
    if (!account?.credentials) {
        await supabase
            .from('social_media_posts')
            .update({ status: 'failed', error_message: 'Hesap bağlı değil' })
            .eq('id', postId)
        return false
    }

    await supabase
        .from('social_media_posts')
        .update({ status: 'publishing' })
        .eq('id', postId)

    // Platform adapter'ı dinamik import ile al
    const { getAdapter } = await import('./index')
    const adapter = getAdapter(post.platform as SocialPlatform)

    const result = await adapter.publishPost(post as any, account.credentials as any)

    if (result.success) {
        await supabase
            .from('social_media_posts')
            .update({
                status:           'published',
                platform_post_id: result.platform_post_id,
                platform_url:     result.platform_url,
                published_at:     new Date().toISOString(),
                error_message:    null,
            })
            .eq('id', postId)

        await supabase
            .from('social_media_accounts')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', account.id)

        return true
    } else {
        const retryCount = (post.retry_count ?? 0) + 1
        const isFinal = retryCount >= 3

        // Rate limit durumunda reschedule
        if (result.rate_limit_reset) {
            await supabase
                .from('social_media_posts')
                .update({
                    status:        'scheduled',
                    scheduled_for: new Date(result.rate_limit_reset + 5 * 60 * 1000).toISOString(),
                    retry_count:   retryCount,
                    error_message: result.error,
                })
                .eq('id', postId)
        } else {
            await supabase
                .from('social_media_posts')
                .update({
                    status:        isFinal ? 'failed' : 'scheduled',
                    scheduled_for: isFinal ? null : getRetryTime(retryCount),
                    retry_count:   retryCount,
                    error_message: result.error,
                })
                .eq('id', postId)
        }

        return false
    }
}

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

function isDue(campaign: SocialMediaCampaign): boolean {
    if (campaign.schedule_type === 'manual') return false
    if (!campaign.last_run_at) return true

    const hours = hoursSince(campaign.last_run_at)
    if (campaign.schedule_type === 'hourly')  return hours >= 1
    if (campaign.schedule_type === 'daily')   return hours >= 23
    if (campaign.schedule_type === 'weekly')  return hours >= 167
    return false
}

function isWithinActiveHours(date: Date, settings: ChannelSettings): boolean {
    const hour = date.getHours()
    const day  = date.getDay() === 0 ? 7 : date.getDay()  // 0=Pazar → 7
    return (
        hour >= settings.active_hours_start &&
        hour < settings.active_hours_end &&
        (settings.active_days ?? [1,2,3,4,5,6,7]).includes(day)
    )
}

function toTimezone(date: Date, tz: string): Date {
    try {
        const str = date.toLocaleString('en-US', { timeZone: tz })
        return new Date(str)
    } catch {
        return date
    }
}

function hoursSince(dateStr: string): number {
    return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function getRetryTime(retryCount: number): string {
    const delays = [5 * 60_000, 30 * 60_000, 2 * 3_600_000]
    const delay = delays[Math.min(retryCount - 1, delays.length - 1)]
    return new Date(Date.now() + delay).toISOString()
}

async function getTodayPublishedCount(platform: SocialPlatform): Promise<number> {
    const supabase = createAdminClient()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
        .from('social_media_posts')
        .select('*', { count: 'exact', head: true })
        .eq('platform', platform)
        .eq('status', 'published')
        .gte('published_at', startOfDay.toISOString())

    return count ?? 0
}

async function getLastPostTime(platform: SocialPlatform): Promise<string | null> {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('social_media_posts')
        .select('published_at')
        .eq('platform', platform)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .single()

    return data?.published_at ?? null
}

async function getRecentPosts(platform: SocialPlatform, limit: number) {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('social_media_posts')
        .select('content_type')
        .eq('platform', platform)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit)

    return (data as any) as Pick<SocialMediaPost, 'content_type'>[] ?? []
}

async function getNextContentItem(
    contentType: ContentType,
    mode: string,
    _topics: string[],
) {
    const supabase = createAdminClient()

    if (mode === 'topic_based') return null

    // content_type eşleşmesi veya feature/faq_highlight için de eğitici kabul et
    const typeFilters = contentType === 'educational'
        ? ['educational', 'faq_highlight', 'feature']
        : contentType === 'promotional'
            ? ['promotional', 'feature']
            : [contentType]

    const { data } = await supabase
        .from('social_media_content_library')
        .select('*')
        .eq('status', 'approved')
        .in('content_type', typeFilters)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    return (data as any) as ContentLibraryItem | null
}

async function getEffectiveChannelSettings(
    platform: SocialPlatform,
    overrides?: Record<string, unknown> | null,
): Promise<ChannelSettings | null> {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('social_media_channel_settings')
        .select('*')
        .eq('platform', platform)
        .single()

    if (!data) return null
    if (!overrides) return data as any

    return { ...data, ...overrides } as any
}

async function getKnowledgeBase(): Promise<string> {
    // ai_config.knowledge_base'i super-admin hesabından al
    // Bu tablo yok, globals'dan alıyoruz - ai_config sistemini referans al
    return process.env.NEXT_PUBLIC_APP_URL
        ? `Jumpix - AI destekli B2B lead yönetimi ve satış otomasyon platformu. ${process.env.NEXT_PUBLIC_APP_URL}`
        : 'Jumpix - AI destekli B2B lead yönetimi ve satış otomasyon platformu.'
}
