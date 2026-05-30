-- ============================================================
-- Social Media Marketing Agent
-- ============================================================

-- Bağlı sosyal medya hesapları
CREATE TABLE social_media_accounts (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform         TEXT NOT NULL CHECK (platform IN ('twitter','reddit','linkedin','instagram','facebook','tiktok','bluesky')),
    account_name     TEXT NOT NULL,
    platform_user_id TEXT,
    credentials      JSONB NOT NULL DEFAULT '{}',
    is_active        BOOLEAN DEFAULT true,
    last_used_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(platform)
);

-- Kanal bazında pazarlama ayarları
CREATE TABLE social_media_channel_settings (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform             TEXT NOT NULL UNIQUE,
    daily_post_limit     INTEGER DEFAULT 3,
    posts_per_run        INTEGER DEFAULT 1,
    min_hours_between    INTEGER DEFAULT 4,
    mix_educational      INTEGER DEFAULT 40,
    mix_industry         INTEGER DEFAULT 25,
    mix_engagement       INTEGER DEFAULT 15,
    mix_social_proof     INTEGER DEFAULT 10,
    mix_promotional      INTEGER DEFAULT 10,
    active_hours_start   INTEGER DEFAULT 9,
    active_hours_end     INTEGER DEFAULT 21,
    active_days          INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    timezone             TEXT DEFAULT 'Europe/Istanbul',
    platform_config      JSONB DEFAULT '{}',
    is_active            BOOLEAN DEFAULT true,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Varsayılan kanal ayarları
INSERT INTO social_media_channel_settings
    (platform, daily_post_limit, posts_per_run, min_hours_between,
     mix_educational, mix_industry, mix_engagement, mix_social_proof, mix_promotional,
     active_hours_start, active_hours_end, platform_config)
VALUES
    ('twitter', 5, 1, 3,  40, 25, 15, 10, 10, 9, 22,
     '{"use_threads":true,"max_hashtags":3,"utm_campaign":"twitter_organic"}'),
    ('reddit',  2, 1, 8,  50, 20, 20,  5,  5, 9, 21,
     '{"default_subreddits":["saas","entrepreneur","startups"],"post_type":"text","value_first":true,"subreddit_rotation":true}');

-- Pazarlama kampanyaları
CREATE TABLE social_media_campaigns (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name               TEXT NOT NULL,
    marketing_goal     TEXT NOT NULL CHECK (marketing_goal IN (
                           'brand_awareness','lead_generation','thought_leadership',
                           'community_building','product_education','problem_awareness'
                       )),
    target_audience    TEXT,
    campaign_mode      TEXT DEFAULT 'context_feed' CHECK (campaign_mode IN ('context_feed','topic_based','mixed')),
    topics             TEXT[] DEFAULT '{}',
    target_platforms   TEXT[] NOT NULL,
    platform_overrides JSONB DEFAULT '{}',
    tone               TEXT DEFAULT 'professional' CHECK (tone IN ('professional','casual','engaging','educational','bold')),
    brand_context      TEXT,
    avoid_topics       TEXT[] DEFAULT '{}',
    cta_url            TEXT,
    utm_params         JSONB DEFAULT '{}',
    schedule_type      TEXT DEFAULT 'daily' CHECK (schedule_type IN ('manual','hourly','daily','weekly')),
    status             TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
    last_run_at        TIMESTAMPTZ,
    last_angle_index   INTEGER DEFAULT 0,
    total_generated    INTEGER DEFAULT 0,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

-- İçerik kütüphanesi
CREATE TABLE social_media_content_library (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title               TEXT NOT NULL,
    body                TEXT NOT NULL,
    content_type        TEXT NOT NULL CHECK (content_type IN (
                            'educational','industry','engagement','social_proof',
                            'promotional','feature','faq_highlight','custom'
                        )),
    source              TEXT DEFAULT 'manual' CHECK (source IN (
                            'manual','ai_config_kb','ai_config_faq','auto_detected'
                        )),
    source_ref          TEXT,
    status              TEXT DEFAULT 'approved' CHECK (status IN (
                            'approved','in_queue','posted','archived','skipped'
                        )),
    priority            INTEGER DEFAULT 5,
    suggested_platforms TEXT[] DEFAULT '{}',
    suggested_tone      TEXT,
    used_in_posts       UUID[] DEFAULT '{}',
    times_used          INTEGER DEFAULT 0,
    last_used_at        TIMESTAMPTZ,
    embedding_hash      TEXT,
    ai_config_snapshot  JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Sosyal medya postları
CREATE TABLE social_media_posts (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id       UUID REFERENCES social_media_accounts(id) ON DELETE SET NULL,
    platform         TEXT NOT NULL,
    campaign_id      UUID REFERENCES social_media_campaigns(id) ON DELETE SET NULL,
    content_item_id  UUID REFERENCES social_media_content_library(id) ON DELETE SET NULL,
    title            TEXT,
    content          TEXT NOT NULL,
    hashtags         TEXT[] DEFAULT '{}',
    content_type     TEXT NOT NULL CHECK (content_type IN (
                         'educational','industry','engagement','social_proof','promotional'
                     )),
    post_type        TEXT DEFAULT 'campaign' CHECK (post_type IN ('manual','ai_generated','campaign')),
    metadata         JSONB DEFAULT '{}',
    status           TEXT DEFAULT 'draft' CHECK (status IN (
                         'draft','scheduled','publishing','published','failed','deleted'
                     )),
    scheduled_for    TIMESTAMPTZ,
    published_at     TIMESTAMPTZ,
    platform_post_id TEXT,
    platform_url     TEXT,
    error_message    TEXT,
    retry_count      INTEGER DEFAULT 0,
    likes_count      INTEGER,
    comments_count   INTEGER,
    shares_count     INTEGER,
    views_count      INTEGER,
    last_stats_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Kampanya çalışma logu
CREATE TABLE social_media_run_history (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id  UUID REFERENCES social_media_campaigns(id) ON DELETE CASCADE,
    post_id      UUID REFERENCES social_media_posts(id) ON DELETE SET NULL,
    platform     TEXT,
    content_type TEXT,
    trigger_type TEXT,
    status       TEXT,
    error        TEXT,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- OAuth state (CSRF koruması, 5 dk TTL)
CREATE TABLE social_media_oauth_states (
    state       TEXT PRIMARY KEY,
    platform    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_social_posts_status     ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled  ON social_media_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform   ON social_media_posts(platform);
CREATE INDEX idx_social_posts_campaign   ON social_media_posts(campaign_id);
CREATE INDEX idx_social_content_status   ON social_media_content_library(status);
CREATE INDEX idx_social_content_type     ON social_media_content_library(content_type);
CREATE INDEX idx_social_content_priority ON social_media_content_library(priority, status);
CREATE INDEX idx_social_campaigns_status ON social_media_campaigns(status);
