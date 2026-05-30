export type SocialPlatform = 'twitter' | 'reddit' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'bluesky'

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'deleted'

export type PostType = 'manual' | 'ai_generated' | 'campaign'

export type ContentType = 'educational' | 'industry' | 'engagement' | 'social_proof' | 'promotional'

export type LibraryContentType = ContentType | 'feature' | 'faq_highlight' | 'custom'

export type LibrarySource = 'manual' | 'ai_config_kb' | 'ai_config_faq' | 'auto_detected'

export type LibraryStatus = 'approved' | 'in_queue' | 'posted' | 'archived' | 'skipped'

export type CampaignTone = 'professional' | 'casual' | 'engaging' | 'educational' | 'bold'

export type MarketingGoal =
    | 'brand_awareness'
    | 'lead_generation'
    | 'thought_leadership'
    | 'community_building'
    | 'product_education'
    | 'problem_awareness'

export type CampaignMode = 'context_feed' | 'topic_based' | 'mixed'

export type ScheduleType = 'manual' | 'hourly' | 'daily' | 'weekly'

// ─── Platform Adapter Contract ───────────────────────────────────────────────

export interface PlatformAdapter {
    readonly platform: SocialPlatform
    readonly maxChars: number | null
    readonly supportsMedia: boolean
    readonly supportsThreads: boolean

    publishPost(post: SocialMediaPost, creds: PlatformCredentials): Promise<PublishResult>
    deletePost?(postId: string, creds: PlatformCredentials): Promise<void>
    validateCredentials(creds: PlatformCredentials): Promise<boolean>
    refreshToken(creds: PlatformCredentials): Promise<PlatformCredentials>
    getOAuthUrl(state: string): string
    exchangeCodeForToken(code: string, codeVerifier?: string): Promise<PlatformCredentials>
    getUserInfo(creds: PlatformCredentials): Promise<{ id: string; username: string }>
}

export interface PlatformCredentials {
    access_token: string
    refresh_token?: string
    expires_at?: number
    platform_user_id?: string
    token_type?: string
    scope?: string
}

export interface PublishResult {
    success: boolean
    platform_post_id?: string
    platform_url?: string
    error?: string
    rate_limit_reset?: number
}

// ─── Platform-Specific Metadata ──────────────────────────────────────────────

export interface TwitterPostMetadata {
    is_thread?: boolean
    thread_parts?: string[]
    reply_to_id?: string
}

export interface RedditPostMetadata {
    subreddit: string
    post_type: 'text' | 'link'
    flair_id?: string
    link_url?: string
    nsfw?: boolean
}

export type PostMetadata = TwitterPostMetadata | RedditPostMetadata | Record<string, unknown>

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface SocialMediaAccount {
    id: string
    platform: SocialPlatform
    account_name: string
    platform_user_id: string | null
    is_active: boolean
    last_used_at: string | null
    created_at: string
    updated_at: string
    // credentials field excluded — never sent to client
}

export interface ChannelSettings {
    id: string
    platform: SocialPlatform
    daily_post_limit: number
    posts_per_run: number
    min_hours_between: number
    mix_educational: number
    mix_industry: number
    mix_engagement: number
    mix_social_proof: number
    mix_promotional: number
    active_hours_start: number
    active_hours_end: number
    active_days: number[]
    timezone: string
    platform_config: TwitterPlatformConfig | RedditPlatformConfig | Record<string, unknown>
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TwitterPlatformConfig {
    use_threads: boolean
    max_hashtags: number
    utm_campaign?: string
}

export interface RedditPlatformConfig {
    default_subreddits: string[]
    post_type: 'text' | 'link'
    value_first: boolean
    subreddit_rotation: boolean
}

export interface ContentMix {
    educational: number
    industry: number
    engagement: number
    social_proof: number
    promotional: number
}

export interface SocialMediaCampaign {
    id: string
    name: string
    marketing_goal: MarketingGoal
    target_audience: string | null
    campaign_mode: CampaignMode
    topics: string[]
    target_platforms: SocialPlatform[]
    platform_overrides: Record<string, Partial<ChannelSettings>>
    tone: CampaignTone
    brand_context: string | null
    avoid_topics: string[]
    cta_url: string | null
    utm_params: Record<string, string>
    schedule_type: ScheduleType
    status: 'active' | 'paused' | 'archived'
    last_run_at: string | null
    last_angle_index: number
    total_generated: number
    created_at: string
    updated_at: string
}

export interface ContentLibraryItem {
    id: string
    title: string
    body: string
    content_type: LibraryContentType
    source: LibrarySource
    source_ref: string | null
    status: LibraryStatus
    priority: number
    suggested_platforms: SocialPlatform[]
    suggested_tone: CampaignTone | null
    used_in_posts: string[]
    times_used: number
    last_used_at: string | null
    embedding_hash: string | null
    created_at: string
    updated_at: string
}

export interface SocialMediaPost {
    id: string
    account_id: string | null
    platform: SocialPlatform
    campaign_id: string | null
    content_item_id: string | null
    title: string | null
    content: string
    hashtags: string[]
    content_type: ContentType
    post_type: PostType
    metadata: PostMetadata
    status: PostStatus
    scheduled_for: string | null
    published_at: string | null
    platform_post_id: string | null
    platform_url: string | null
    error_message: string | null
    retry_count: number
    likes_count: number | null
    comments_count: number | null
    shares_count: number | null
    views_count: number | null
    created_at: string
    updated_at: string
}

export interface RunHistory {
    id: string
    campaign_id: string
    post_id: string | null
    platform: SocialPlatform
    content_type: ContentType
    trigger_type: 'manual' | 'cron_daily' | 'cron_hourly' | 'cron_weekly'
    status: 'success' | 'failed' | 'skipped'
    error: string | null
    generated_at: string
}

// ─── Input Types (Actions) ────────────────────────────────────────────────────

export interface CreatePostInput {
    platform: SocialPlatform
    content: string
    title?: string
    hashtags?: string[]
    content_type: ContentType
    metadata?: PostMetadata
    scheduled_for?: string
    campaign_id?: string
    content_item_id?: string
}

export interface CreateCampaignInput {
    name: string
    marketing_goal: MarketingGoal
    target_audience?: string
    campaign_mode: CampaignMode
    topics?: string[]
    target_platforms: SocialPlatform[]
    platform_overrides?: Record<string, unknown>
    tone?: CampaignTone
    brand_context?: string
    avoid_topics?: string[]
    cta_url?: string
    utm_params?: Record<string, string>
    schedule_type: ScheduleType
}

export interface UpdateChannelSettingsInput {
    daily_post_limit?: number
    posts_per_run?: number
    min_hours_between?: number
    mix_educational?: number
    mix_industry?: number
    mix_engagement?: number
    mix_social_proof?: number
    mix_promotional?: number
    active_hours_start?: number
    active_hours_end?: number
    active_days?: number[]
    timezone?: string
    platform_config?: Record<string, unknown>
    is_active?: boolean
}

export interface GeneratedSocialPost {
    content: string
    title?: string
    hashtags: string[]
    content_type: ContentType
    metadata?: PostMetadata
    estimated_engagement?: 'high' | 'medium' | 'low'
}

// ─── Platform UI Metadata ─────────────────────────────────────────────────────

export const PLATFORM_META: Record<SocialPlatform, {
    label: string
    charLimit: number | null
    color: string
    bgClass: string
    textClass: string
}> = {
    twitter:   { label: 'X (Twitter)', charLimit: 280,  color: '#000000', bgClass: 'bg-black',       textClass: 'text-white' },
    reddit:    { label: 'Reddit',      charLimit: null,  color: '#FF4500', bgClass: 'bg-orange-600',  textClass: 'text-white' },
    linkedin:  { label: 'LinkedIn',    charLimit: 3000,  color: '#0A66C2', bgClass: 'bg-blue-700',    textClass: 'text-white' },
    instagram: { label: 'Instagram',   charLimit: 2200,  color: '#E1306C', bgClass: 'bg-pink-600',    textClass: 'text-white' },
    facebook:  { label: 'Facebook',    charLimit: null,  color: '#1877F2', bgClass: 'bg-blue-600',    textClass: 'text-white' },
    tiktok:    { label: 'TikTok',      charLimit: 2200,  color: '#010101', bgClass: 'bg-black',       textClass: 'text-white' },
    bluesky:   { label: 'Bluesky',     charLimit: 300,   color: '#0085FF', bgClass: 'bg-sky-500',     textClass: 'text-white' },
}

export const MARKETING_GOAL_LABELS: Record<MarketingGoal, string> = {
    brand_awareness:    'Marka Bilinirliği',
    lead_generation:    'Lead Üretimi',
    thought_leadership: 'Thought Leadership',
    community_building: 'Topluluk Büyütme',
    product_education:  'Ürün Eğitimi',
    problem_awareness:  'Problem Farkındalığı',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    educational:  'Eğitici',
    industry:     'Sektör',
    engagement:   'Etkileşim',
    social_proof: 'Sosyal Kanıt',
    promotional:  'Promosyon',
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
    educational:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
    industry:     'bg-purple-500/10 text-purple-500 border-purple-500/20',
    engagement:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
    social_proof: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    promotional:  'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

// İçerik açıları (rotation için)
export const SOCIAL_ANGLES = [
    'problem_solution',
    'feature_spotlight',
    'social_proof',
    'industry_stat',
    'quick_tip',
    'question_engagement',
    'comparison',
    'use_case_story',
    'myth_busting',
    'behind_the_scenes',
] as const

export type SocialAngle = typeof SOCIAL_ANGLES[number]
