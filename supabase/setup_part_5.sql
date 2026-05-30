

-- FILE: 20260505_social_media_agent.sql

-- ============================================================
-- Social Media Marketing Agent
-- ============================================================

-- BaÄŸlÄ± sosyal medya hesaplarÄ±
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

-- Kanal bazÄ±nda pazarlama ayarlarÄ±
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

-- VarsayÄ±lan kanal ayarlarÄ±
INSERT INTO social_media_channel_settings
    (platform, daily_post_limit, posts_per_run, min_hours_between,
     mix_educational, mix_industry, mix_engagement, mix_social_proof, mix_promotional,
     active_hours_start, active_hours_end, platform_config)
VALUES
    ('twitter', 5, 1, 3,  40, 25, 15, 10, 10, 9, 22,
     '{"use_threads":true,"max_hashtags":3,"utm_campaign":"twitter_organic"}'),
    ('reddit',  2, 1, 8,  50, 20, 20,  5,  5, 9, 21,
     '{"default_subreddits":["saas","entrepreneur","startups"],"post_type":"text","value_first":true,"subreddit_rotation":true}');

-- Pazarlama kampanyalarÄ±
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

-- Ä°Ã§erik kÃ¼tÃ¼phanesi
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

-- Sosyal medya postlarÄ±
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

-- Kampanya Ã§alÄ±ÅŸma logu
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

-- OAuth state (CSRF korumasÄ±, 5 dk TTL)
CREATE TABLE social_media_oauth_states (
    state       TEXT PRIMARY KEY,
    platform    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ä°ndeksler
CREATE INDEX idx_social_posts_status     ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled  ON social_media_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform   ON social_media_posts(platform);
CREATE INDEX idx_social_posts_campaign   ON social_media_posts(campaign_id);
CREATE INDEX idx_social_content_status   ON social_media_content_library(status);
CREATE INDEX idx_social_content_type     ON social_media_content_library(content_type);
CREATE INDEX idx_social_content_priority ON social_media_content_library(priority, status);
CREATE INDEX idx_social_campaigns_status ON social_media_campaigns(status);


-- FILE: 20260505_social_media_rls.sql

-- ============================================================
-- Social Media Agent â€” RLS Policies
-- Bu tablolar sadece super-admin (service_role) tarafÄ±ndan kullanÄ±lÄ±r.
-- Normal kullanÄ±cÄ±lar hiÃ§bir ÅŸekilde eriÅŸemez.
-- ============================================================

-- â”€â”€â”€ social_media_accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_accounts_service_role" ON social_media_accounts;

CREATE POLICY "social_accounts_service_role"
ON social_media_accounts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_channel_settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_channel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_channel_settings_service_role" ON social_media_channel_settings;

CREATE POLICY "social_channel_settings_service_role"
ON social_media_channel_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_campaigns_service_role" ON social_media_campaigns;

CREATE POLICY "social_campaigns_service_role"
ON social_media_campaigns FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_content_library â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_content_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_content_library_service_role" ON social_media_content_library;

CREATE POLICY "social_content_library_service_role"
ON social_media_content_library FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_posts_service_role" ON social_media_posts;

CREATE POLICY "social_posts_service_role"
ON social_media_posts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_run_history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_run_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_run_history_service_role" ON social_media_run_history;

CREATE POLICY "social_run_history_service_role"
ON social_media_run_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_oauth_states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_oauth_states_service_role" ON social_media_oauth_states;

CREATE POLICY "social_oauth_states_service_role"
ON social_media_oauth_states FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- FILE: 20260506_avatar_meeting_features.sql

-- Add AI Avatar columns to meetings table
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS ai_avatar_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_avatar_bot_id TEXT,
ADD COLUMN IF NOT EXISTS ai_avatar_status TEXT DEFAULT 'disabled';

-- Enforce valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meetings_ai_avatar_status_check'
    ) THEN
        ALTER TABLE public.meetings
        ADD CONSTRAINT meetings_ai_avatar_status_check
        CHECK (ai_avatar_status IN ('disabled', 'pending', 'joining', 'joined', 'recording', 'paused', 'left', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.meetings.ai_avatar_enabled IS 'Whether AI Avatar is enabled for this meeting';
COMMENT ON COLUMN public.meetings.ai_avatar_bot_id IS 'The unique identifier of the recall bot instance associated with this meeting';
COMMENT ON COLUMN public.meetings.ai_avatar_status IS 'Status of the AI avatar for this meeting: disabled, pending, joining, joined, recording, paused, left, completed, failed, or cancelled';

-- Add index for filtering meetings by avatar status
CREATE INDEX IF NOT EXISTS idx_meetings_ai_avatar_status ON public.meetings(account_id, ai_avatar_status)
WHERE ai_avatar_status IS NOT NULL;


-- FILE: 20260506_knowledge_base_files.sql

-- Knowledge Base Files: private storage bucket + accounts column

-- 1. Create private knowledge-base bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: account members can upload files to their own folder
-- Path format: {account_id}/{file_id}.{ext}
CREATE POLICY "Account members can upload KB files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 3. RLS: account members can read their own files
CREATE POLICY "Account members can read KB files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 4. RLS: account members can delete their own files
CREATE POLICY "Account members can delete KB files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);


-- FILE: 20260507_avatar_status_calibrating.sql

-- Recall.ai emits a 'calibrating' bot status that the webhook handler tries to
-- persist into meetings.ai_avatar_status. The original CHECK constraint omitted
-- it, causing webhook updates to fail. Drop and recreate the constraint with
-- the full status set.

ALTER TABLE public.meetings
    DROP CONSTRAINT IF EXISTS meetings_ai_avatar_status_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_ai_avatar_status_check
    CHECK (ai_avatar_status IN (
        'disabled', 'pending', 'joining', 'joined', 'calibrating',
        'recording', 'paused', 'left', 'completed', 'failed', 'cancelled'
    ));

COMMENT ON COLUMN public.meetings.ai_avatar_status IS
    'Status of the AI avatar for this meeting: disabled, pending, joining, joined, calibrating, recording, paused, left, completed, failed, or cancelled';


-- FILE: 20260508_avatar_status_full_set.sql

-- Recall.ai bot lifecycle covers a wider status set than originally listed.
-- We normalize raw Recall statuses in the webhook handler, but the DB
-- constraint must accept every normalized value we may persist.

ALTER TABLE public.meetings
    DROP CONSTRAINT IF EXISTS meetings_ai_avatar_status_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_ai_avatar_status_check
    CHECK (
        ai_avatar_status IS NULL OR ai_avatar_status IN (
            'disabled',
            'pending',
            'ready',
            'joining',
            'joined',
            'calibrating',
            'in_call',
            'recording',
            'paused',
            'left',
            'completed',
            'analysis_pending',
            'analysis_complete',
            'failed',
            'cancelled',
            'unknown'
        )
    );

COMMENT ON COLUMN public.meetings.ai_avatar_status IS
    'Normalized AI avatar status: disabled, pending, ready, joining, joined, calibrating, in_call, recording, paused, left, completed, analysis_pending, analysis_complete, failed, cancelled, or unknown.';


-- FILE: 20260509_avatar_normalize_storage.sql

-- ============================================================================
--  AI Avatar â€” normalize storage
--  Adds first-class transcript_url / recording_url columns, the
--  meeting_transcripts table, and an atomic JSONB merge RPC so the Recall.ai
--  webhook can update meeting metadata without a select-then-update race.
-- ============================================================================

-- 1) Convenience columns on meetings (still backfilled in metadata for audit)
ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS transcript_url TEXT,
    ADD COLUMN IF NOT EXISTS recording_url  TEXT;

COMMENT ON COLUMN public.meetings.transcript_url IS
    'Latest transcript download URL provided by Recall.ai';
COMMENT ON COLUMN public.meetings.recording_url IS
    'Latest recording (mp4/webm) download URL provided by Recall.ai';

-- 2) Normalized transcript chunks
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id   UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    account_id   UUID NOT NULL,
    bot_id       TEXT,
    speaker      TEXT,
    content      TEXT NOT NULL,
    timestamp_ms BIGINT,
    spoken_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting
    ON public.meeting_transcripts (meeting_id, created_at);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_account
    ON public.meeting_transcripts (account_id, created_at DESC);

-- RLS â€” only members of the owning account can read transcripts
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_transcripts_select_own_account" ON public.meeting_transcripts;
CREATE POLICY "meeting_transcripts_select_own_account"
    ON public.meeting_transcripts
    FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Service role bypasses RLS; webhook uses admin client for inserts.

-- 3) Atomic JSONB merge RPC
--    Webhook calls this with the patch + optional column overrides so the
--    UPDATE happens in a single statement (no read-then-write race).
CREATE OR REPLACE FUNCTION public.merge_meeting_metadata(
    p_meeting_id        UUID,
    p_account_id        UUID,
    p_patch             JSONB,
    p_avatar_status     TEXT DEFAULT NULL,
    p_avatar_bot_id     TEXT DEFAULT NULL,
    p_meeting_status    TEXT DEFAULT NULL,
    p_transcript_url    TEXT DEFAULT NULL,
    p_recording_url     TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    UPDATE public.meetings
    SET
        metadata          = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_patch, '{}'::jsonb),
        ai_avatar_status  = COALESCE(p_avatar_status,  ai_avatar_status),
        ai_avatar_bot_id  = COALESCE(p_avatar_bot_id,  ai_avatar_bot_id),
        status            = COALESCE(p_meeting_status, status),
        transcript_url    = COALESCE(p_transcript_url, transcript_url),
        recording_url     = COALESCE(p_recording_url,  recording_url)
    WHERE id = p_meeting_id
      AND account_id = p_account_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_meeting_metadata(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_meeting_metadata(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.merge_meeting_metadata IS
    'Atomic JSONB merge for meetings.metadata. Used by the Recall.ai webhook to avoid lost-update races. service_role only.';


-- FILE: 20260509_avatar_status_default_null.sql

-- Change ai_avatar_status default from 'disabled' to NULL.
-- 'disabled' was the initial DB default but it surfaces as a confusing badge
-- in the UI for every new meeting. NULL correctly represents "no avatar assigned".
ALTER TABLE public.meetings ALTER COLUMN ai_avatar_status SET DEFAULT NULL;

-- Clear 'disabled' from existing rows where avatar was never actually activated
-- (ai_avatar_enabled is false and no bot was assigned).
UPDATE public.meetings
SET ai_avatar_status = NULL
WHERE ai_avatar_status = 'disabled'
  AND (ai_avatar_enabled IS NULL OR ai_avatar_enabled = false)
  AND ai_avatar_bot_id IS NULL;


-- FILE: 20260510_avatar_presentations.sql

-- Avatar Presentations: account-scoped pitch deck for AI avatar to present in meetings.

-- 1. account_presentations: bir account'un tek pitch deck'i
CREATE TABLE IF NOT EXISTS public.account_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
    title TEXT,
    pdf_path TEXT NOT NULL,
    page_count INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_presentations_account
    ON public.account_presentations(account_id);

ALTER TABLE public.account_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_presentations_select_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_select_own"
    ON public.account_presentations FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_presentations_modify_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_modify_own"
    ON public.account_presentations FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. account_slides: PDF'in her sayfasÄ± iÃ§in bir slayt kaydÄ±
CREATE TABLE IF NOT EXISTS public.account_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID NOT NULL
        REFERENCES public.account_presentations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    image_path TEXT NOT NULL,
    raw_text TEXT,
    speaking_script TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (presentation_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_account_slides_pres
    ON public.account_slides(presentation_id, page_number);
CREATE INDEX IF NOT EXISTS idx_account_slides_account
    ON public.account_slides(account_id);

ALTER TABLE public.account_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_slides_select_own" ON public.account_slides;
CREATE POLICY "account_slides_select_own"
    ON public.account_slides FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_slides_modify_own" ON public.account_slides;
CREATE POLICY "account_slides_modify_own"
    ON public.account_slides FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 3. Storage bucket: avatar-slides (private, account-scoped path: {account_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar-slides', 'avatar-slides', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_slides_select_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_select_own_account"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "avatar_slides_insert_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_insert_own_account"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

DROP POLICY IF EXISTS "avatar_slides_delete_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_delete_own_account"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- 4. updated_at trigger reuse
DROP TRIGGER IF EXISTS account_presentations_updated_at ON public.account_presentations;
CREATE TRIGGER account_presentations_updated_at
    BEFORE UPDATE ON public.account_presentations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS account_slides_updated_at ON public.account_slides;
CREATE TRIGGER account_slides_updated_at
    BEFORE UPDATE ON public.account_slides
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.account_presentations IS
    'Account-level pitch deck for the AI avatar to present in meetings (one per account).';
COMMENT ON TABLE public.account_slides IS
    'Per-page slide assets and speaking scripts derived from the uploaded PDF.';


-- FILE: 20260519_fix_hardcoded_admin_rls.sql

-- Migration: Fix hardcoded admin identifiers in RLS policies
-- Date: 2026-05-19
--
-- Sorun: BazÄ± tablolarda RLS politikalarÄ± e-posta adresi (admin@admin.com)
-- veya sabit bir UUID ile super admin yetkisi veriyordu.
-- Bu migration bunlarÄ± profiles.role tabanlÄ± kontrole taÅŸÄ±r.
-- KullanÄ±lan roller: 'admin' (hesap yÃ¶neticisi), 'super_admin' (platform yÃ¶neticisi)

-- ============================================================
-- 1. error_logs: Hardcoded UUID'yi kaldÄ±r
-- ============================================================

DROP POLICY IF EXISTS "Admins can see all error logs" ON public.error_logs;

CREATE POLICY "Admins can see all error logs"
ON public.error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
);

-- ============================================================
-- 2. blog_translations: admin@admin.com yerine role kontrolÃ¼
-- ============================================================

DO $$
DECLARE
    pol_name TEXT;
    tbl_name TEXT;
BEGIN
    -- blog_post_translations
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_post_translations'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_post_translations', pol_name);
    END LOOP;

    -- blog_categories
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_categories'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_categories', pol_name);
    END LOOP;

    -- blog_tags (junction)
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename IN ('blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tablename);
    END LOOP;
END $$;

-- blog_post_translations â€” yÃ¶netim politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_post_translations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_post_translations'
            AND policyname = 'Admins can manage blog_post_translations'
        ) THEN
            CREATE POLICY "Admins can manage blog_post_translations"
            ON public.blog_post_translations
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_categories â€” yÃ¶netim politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_categories'
            AND policyname = 'Admins can manage blog_categories'
        ) THEN
            CREATE POLICY "Admins can manage blog_categories"
            ON public.blog_categories
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- ============================================================
-- 3. blog_system_queue ve blog_analytics: admin@admin.com dÃ¼zelt
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE tablename IN ('blog_system_queue', 'blog_analytics', 'blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- blog_system_queue admin politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_system_queue') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_system_queue'
            AND policyname = 'Admins can manage blog_system_queue'
        ) THEN
            CREATE POLICY "Admins can manage blog_system_queue"
            ON public.blog_system_queue
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_analytics admin politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_analytics') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_analytics'
            AND policyname = 'Admins can manage blog_analytics'
        ) THEN
            CREATE POLICY "Admins can manage blog_analytics"
            ON public.blog_analytics
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;


-- FILE: 20260521_avatar_module_hardening.sql

-- Avatar Module Hardening: Database Schema & Migrations
-- May 21, 2026
--
-- This migration addresses the following issues:
-- Y8: unique index on (account_id, title) for presentations
-- Y16: cascade deletes for presentation â†’ slides
-- Y29: RPC function to merge meeting metadata safely
-- Y30: RPC function to classify questions via Gemini
-- O41: audit log table for admin visibility
-- O42: session usage tracking for billing & observability

-- =============================================================================
-- Y8: Unique Index on (account_id, title) for Presentations
-- =============================================================================
-- Prevents duplicate presentation titles per account, avoiding silent overwrites
-- when the presentation upload flow races or retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_presentations_account_id_title
    ON account_presentations(account_id, LOWER(title))
    WHERE status IS NOT NULL;

-- =============================================================================
-- Y16: Cascade Deletes for Presentation â†’ Slides
-- =============================================================================
-- Ensures slides are automatically cleaned up when their presentation is deleted,
-- preventing orphaned records that would accumulate storage references.
--
-- Note: This assumes the foreign key constraint doesn't already exist or
-- has ON DELETE SET NULL. We drop and recreate to ensure ON DELETE CASCADE.
ALTER TABLE account_slides
    DROP CONSTRAINT IF EXISTS account_slides_presentation_id_fkey;

ALTER TABLE account_slides
    ADD CONSTRAINT account_slides_presentation_id_fkey
        FOREIGN KEY (presentation_id)
        REFERENCES account_presentations(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =============================================================================
-- Y29: RPC Function: merge_meeting_metadata
-- =============================================================================
-- Atomically updates meeting metadata (presentation_status_on_bot_start, etc)
-- without triggering update triggers that might overwrite concurrent changes.
-- Used by bot-session to track presentation state mid-call.
DROP FUNCTION IF EXISTS merge_meeting_metadata(uuid, uuid, jsonb);

CREATE FUNCTION merge_meeting_metadata(
    p_meeting_id uuid,
    p_account_id uuid,
    p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meeting_metadata jsonb;
BEGIN
    -- Atomic read-modify-write: fetch current, merge patch, write back
    UPDATE meetings
    SET metadata = COALESCE(metadata, '{}'::jsonb) || p_patch,
        updated_at = now()
    WHERE id = p_meeting_id
      AND account_id = p_account_id
    RETURNING metadata INTO v_meeting_metadata;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting not found or account mismatch';
    END IF;

    RETURN v_meeting_metadata;
END;
$$;

-- =============================================================================
-- Y30: RPC Function: classify_question_via_gemini
-- =============================================================================
-- Wrapper RPC for calling the Gemini Flash LLM to classify meeting questions
-- (presentation-related vs off-topic). Called by the Recall webhook handler
-- to decide whether the avatar should interrupt the current slide.
--
-- Parameters:
--   p_question_text: The user's question transcribed from the meeting
--   p_context: Optional context (slide title, speaker notes, etc)
--   p_account_id: Account ID for audit logging
--
-- Returns JSON with classification result and confidence score.
DROP FUNCTION IF EXISTS classify_question_via_gemini(text, text, uuid);

CREATE FUNCTION classify_question_via_gemini(
    p_question_text text,
    p_context text DEFAULT NULL,
    p_account_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- This is a placeholder that the application layer calls via HTTP POST
    -- to /api/webhooks/recall/{webhook_id}/classify-question because
    -- Gemini API calls require the server runtime (http_client not available in SQL).
    --
    -- The application layer will:
    -- 1. Extract the question text from SSE/webhook
    -- 2. POST to the RPC with question_text + optional slide context
    -- 3. Get back { is_about_presentation: bool, confidence: float }
    -- 4. Use that to decide interrupt behavior
    --
    -- For now, this RPC is a no-op; the real logic lives in
    -- src/features/avatar/services/anam.ts -> classifyQuestion()

    v_result := jsonb_build_object(
        'is_about_presentation', false,
        'confidence', 0.0,
        'reason', 'Classification deferred to application layer'
    );

    RETURN v_result;
END;
$$;

-- =============================================================================
-- O41: Audit Log Table for Admin Visibility
-- =============================================================================
-- Tracks sensitive avatar operations (session creation, bot lifecycle, errors)
-- so admins can investigate incidents and debug production issues.
--
-- Scoped per account with RLS to prevent cross-account reads.
CREATE TABLE IF NOT EXISTS avatar_audit_logs (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    -- Event severity: 'info', 'warning', 'error'
    severity text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    -- Structured data for deep debugging: bot_id, meeting_id, user_id, error codes, etc
    metadata jsonb DEFAULT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_account_id
    ON avatar_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_created_at
    ON avatar_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_event_type
    ON avatar_audit_logs(event_type);

-- RLS: users can only read audit logs for their own account
ALTER TABLE avatar_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avatar_audit_logs_account_isolation ON avatar_audit_logs;
CREATE POLICY avatar_audit_logs_account_isolation
    ON avatar_audit_logs
    FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- =============================================================================
-- O42: Session Usage Table for Billing & Observability
-- =============================================================================
-- Tracks Anam avatar session usage per account for billing aggregation,
-- quota enforcement, and cost analysis.
--
-- Each row represents one completed (or ongoing) avatar session.
-- Used to answer questions like:
-- - How many sessions has account X created this month?
-- - What's the total session duration for quota checks?
-- - Which accounts are heavy users? (For capacity planning)
CREATE TABLE IF NOT EXISTS avatar_session_usage (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    session_id text NOT NULL UNIQUE,
    session_token text NOT NULL,
    persona_id text NOT NULL,
    -- 'bot' (Recall bot) or 'user' (manual session)
    session_type text NOT NULL DEFAULT 'bot',
    -- Which meeting, if any (null for manual sessions)
    meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
    -- Session start time
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    -- Session end time (null if still active)
    ended_at timestamp with time zone DEFAULT NULL,
    -- Total duration in seconds (computed on session end)
    duration_seconds integer DEFAULT NULL,
    -- Status: 'active', 'completed', 'failed', 'cancelled'
    status text NOT NULL DEFAULT 'active',
    -- Total speaking time (for cost modeling of actual avatar time)
    speaking_duration_seconds integer DEFAULT 0,
    -- Number of questions answered
    questions_answered integer DEFAULT 0,
    -- Metadata: error_code, disconnect_reason, etc
    metadata jsonb DEFAULT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_account_id
    ON avatar_session_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_started_at
    ON avatar_session_usage(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_session_id
    ON avatar_session_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_meeting_id
    ON avatar_session_usage(meeting_id);

-- RLS: users can only read usage logs for their own account
ALTER TABLE avatar_session_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avatar_session_usage_account_isolation ON avatar_session_usage;
CREATE POLICY avatar_session_usage_account_isolation
    ON avatar_session_usage
    FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- =============================================================================
-- Helper Function: Log Avatar Event
-- =============================================================================
-- Convenience function for the application to log avatar events without
-- constructing the full JSON payload in TypeScript.
DROP FUNCTION IF EXISTS log_avatar_event(uuid, text, text, jsonb);

CREATE FUNCTION log_avatar_event(
    p_account_id uuid,
    p_event_type text,
    p_message text,
    p_metadata jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id bigint;
BEGIN
    INSERT INTO avatar_audit_logs (account_id, event_type, severity, message, metadata, created_by)
    VALUES (
        p_account_id,
        p_event_type,
        CASE WHEN p_event_type LIKE '%_error' THEN 'error'
             WHEN p_event_type LIKE '%_warning' THEN 'warning'
             ELSE 'info' END,
        p_message,
        p_metadata,
        auth.uid()
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;


-- FILE: add_indexes.sql

-- Supabase (PostgreSQL) Performance Indexes
-- Run this script in your Supabase SQL Editor to speed up common queries.

-- 1. Index on leads (account_id is usually a foreign key used in queries)
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
-- Index on status for filtering leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 2. Index on meetings
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 3. Index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- Note: Depending on your exact schema, some column names (like account_id or start_time) 
-- might differ. Please adjust them if your schema uses different column names.


-- FILE: create_error_logs_table.sql

-- ============================================
-- CREATE ERROR_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL CHECK (error_type IN ('client_error', 'server_error', 'api_error', 'component_error')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    url TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_account_id ON error_logs(account_id);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_composite ON error_logs(account_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;


-- FILE: create_event_logs_table.sql

-- ============================================
-- CREATE EVENT_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_event_logs_account_id ON event_logs(account_id);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);


-- FILE: create_sequences_table.sql

-- Create sequences table for automation workflows
--
-- trigger_type values and their semantics:
--   'lead_created'    â€” AkÄ±ÅŸ, yeni bir lead oluÅŸturulduÄŸunda baÅŸlar
--   'meeting_booked'  â€” AkÄ±ÅŸ, toplantÄ± rezervasyonu yapÄ±ldÄ±ÄŸÄ±nda baÅŸlar
--   'instant' / 'now' â€” AkÄ±ÅŸ, manuel olarak anÄ±nda tetiklenir
--   'custom'          â€” AkÄ±ÅŸ, webhook veya dÄ±ÅŸ entegrasyon ile tetiklenir
--   'hubspot_lead' / 'salesforce_lead' / 'pipedrive_lead' / 'zoho_lead'
--                     â€” CRM entegrasyonundan gelen lead ile tetiklenir
--
-- NOT: 'no_response' bir trigger deÄŸil, akÄ±ÅŸ iÃ§indeki bir koÅŸuldur
-- (enrollment'Ä±n belirli bir adÄ±mda bekleme durumu processor.ts tarafÄ±ndan yÃ¶netilir).
-- Bu deÄŸer geriye dÃ¶nÃ¼k uyumluluk iÃ§in constraint'te tutulmaktadÄ±r.

CREATE TABLE IF NOT EXISTS sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'instant',
        'now',
        'no_response',       -- Geriye dÃ¶nÃ¼k uyumluluk; yeni akÄ±ÅŸlarda kullanÄ±lmamalÄ±
        'meeting_booked',
        'lead_created',
        'custom',
        'hubspot_lead',
        'salesforce_lead',
        'pipedrive_lead',
        'zoho_lead'
    )),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sequences_account ON sequences(account_id);
CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_sequences_trigger ON sequences(trigger_type);

-- Enable Row Level Security
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access sequences from their account
CREATE POLICY "Users can view sequences from their account"
    ON sequences FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sequences to their account"
    ON sequences FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update sequences from their account"
    ON sequences FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sequences from their account"
    ON sequences FOR DELETE
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- FILE: error_logs_rls.sql

-- ============================================
-- ERROR_LOGS RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins can view all error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can view their tenant error logs" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Anonymous users can insert error logs" ON error_logs;

-- Super admins (role = 'super_admin' in profiles) can view all error logs
CREATE POLICY "Super admins can view all error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Regular admins can only view error logs for their account
CREATE POLICY "Admins can view their account error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    account_id IN (
        SELECT account_id FROM profiles
        WHERE id = auth.uid()
    )
);

-- Allow authenticated users to insert error logs
CREATE POLICY "Authenticated users can insert error logs"
ON error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anonymous users to insert error logs (for client-side errors before auth)
CREATE POLICY "Anonymous users can insert error logs"
ON error_logs
FOR INSERT
TO anon
WITH CHECK (true);


-- FILE: event_logs_rls.sql

-- ============================================
-- EVENT_LOGS TABLE RLS POLICIES
-- ============================================
-- Run this AFTER creating the event_logs table

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account events"
ON event_logs FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can insert events"
ON event_logs FOR INSERT
WITH CHECK (true);


-- FILE: fix_profile_schema.sql

-- Run this script in your Supabase Dashboard > SQL Editor
-- It adds the missing columns to the profiles table and reloads the schema cache

-- 1. Add missing columns safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- 2. Force schema cache reload (Supabase specific)
NOTIFY pgrst, 'reload config';


-- FILE: populate_demo_data.sql

-- Demo Data Population Script for admin@admin.com

DO $$
DECLARE
    target_email TEXT := 'admin@admin.com';
    target_user_id UUID;
    target_account_id UUID;
    lead_id_1 UUID;
    lead_id_2 UUID;
    lead_id_3 UUID;
    conv_id_1 UUID;
    conv_id_2 UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please sign up with this email first.', target_email;
        RETURN;
    END IF;

    -- 2. Ensure Account Exists
    -- Check if user already has a profile and account
    SELECT account_id INTO target_account_id FROM public.profiles WHERE id = target_user_id;

    IF target_account_id IS NULL THEN
        -- Create new account
        INSERT INTO public.accounts (name, subscription_status, plan_id)
        VALUES ('Demo Company', 'active', 'pro')
        RETURNING id INTO target_account_id;

        -- Create/Update profile
        INSERT INTO public.profiles (id, account_id, full_name, role, avatar_url)
        VALUES (target_user_id, target_account_id, 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin')
        ON CONFLICT (id) DO UPDATE
        SET account_id = target_account_id,
            full_name = 'Admin User',
            role = 'admin';
    END IF;

    -- 3. Clear existing demo data for this account (optional, to avoid duplicates if run multiple times)
    -- BE CAREFUL: This deletes data for the account. Comment out if you want to append.
    DELETE FROM public.meetings WHERE account_id = target_account_id;
    DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE account_id = target_account_id);
    DELETE FROM public.conversations WHERE account_id = target_account_id;
    DELETE FROM public.leads WHERE account_id = target_account_id;
    DELETE FROM public.integrations WHERE account_id = target_account_id;
    -- DELETE FROM public.sequences WHERE account_id = target_account_id; -- If sequences table exists

    -- 4. Seed Leads
    
    -- Lead 1: New Lead (Website)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Ahmet', 'YÄ±lmaz', 'ahmet.yilmaz@example.com', '+905551112233', 'website', 'new', NOW() - INTERVAL '2 hours')
    RETURNING id INTO lead_id_1;

    -- Lead 2: Contacted / In Conversation (WhatsApp)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'AyÅŸe', 'Demir', 'ayse.demir@example.com', '+905554445566', 'whatsapp', 'contacted', NOW() - INTERVAL '1 day')
    RETURNING id INTO lead_id_2;

    -- Lead 3: Booked Meeting (Instagram)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Mehmet', 'Kaya', 'mehmet.kaya@example.com', '+905557778899', 'instagram', 'booked', NOW() - INTERVAL '3 days')
    RETURNING id INTO lead_id_3;

    -- Additional Leads for variety
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at) VALUES
    (target_account_id, 'Zeynep', 'Ã‡elik', 'zeynep.celik@example.com', '+905559990011', 'website', 'qualified', NOW() - INTERVAL '5 hours'),
    (target_account_id, 'Ali', 'Veli', 'ali.veli@example.com', '+905552223344', 'referral', 'unqualified', NOW() - INTERVAL '1 week'),
    (target_account_id, 'Fatma', 'SarÄ±', 'fatma.sari@example.com', '+905558889900', 'linkedin', 'new', NOW() - INTERVAL '30 minutes'),
    (target_account_id, 'Can', 'Ã–z', 'can.oz@example.com', '+905556667788', 'ads', 'contacted', NOW() - INTERVAL '2 days');

    -- 5. Seed Conversations & Messages

    -- Conversation for Lead 2 (AyÅŸe)
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_2, 'whatsapp', 'active', NOW() - INTERVAL '1 hour')
    RETURNING id INTO conv_id_1;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_1, 'lead', 'Merhaba, fiyatlarÄ±nÄ±z hakkÄ±nda bilgi alabilir miyim?', NOW() - INTERVAL '1 day'),
    (conv_id_1, 'ai', 'Merhaba AyÅŸe HanÄ±m! Tabii ki. Paketlerimiz aylÄ±k abonelik ÅŸeklindedir. Hangi hizmetimizle ilgileniyorsunuz?', NOW() - INTERVAL '23 hours'),
    (conv_id_1, 'lead', 'Randevu asistanÄ± ilgimi Ã§ekiyor.', NOW() - INTERVAL '20 hours'),
    (conv_id_1, 'ai', 'Harika bir seÃ§im! Randevu asistanÄ±mÄ±z 7/24 Ã§alÄ±ÅŸÄ±r. Sizin iÃ§in bir demo ayarlayalÄ±m mÄ±?', NOW() - INTERVAL '1 hour');

    -- Conversation for Lead 3 (Mehmet) - Booked
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_3, 'whatsapp', 'closed', NOW() - INTERVAL '2 days')
    RETURNING id INTO conv_id_2;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_2, 'lead', 'ToplantÄ± ayarlamak istiyorum.', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'ai', 'Memnuniyetle. YarÄ±n saat 14:00 veya 16:00 sizin iÃ§in uygun mu?', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'lead', '14:00 uygun.', NOW() - INTERVAL '2 days'),
    (conv_id_2, 'ai', 'TamamdÄ±r, yarÄ±n 14:00 iÃ§in toplantÄ±nÄ±zÄ± kaydettim.', NOW() - INTERVAL '2 days');

    -- 6. Seed Meetings
    INSERT INTO public.meetings (account_id, lead_id, agent_id, start_time, end_time, status, meeting_link)
    VALUES 
    (target_account_id, lead_id_3, target_user_id, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 30 minutes', 'scheduled', 'https://meet.google.com/abc-defg-hij'),
    (target_account_id, lead_id_2, target_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days 30 minutes', 'completed', 'https://meet.google.com/xyz-uvw-123');

    -- 7. Seed Integrations
    INSERT INTO public.integrations (account_id, provider, status, config) VALUES
    (target_account_id, 'google_calendar', 'connected', '{"calendar_id": "primary"}'),
    (target_account_id, 'whatsapp', 'connected', '{"phone_number_id": "123456"}'),
    (target_account_id, 'hubspot', 'disconnected', '{}');

    -- 8. Seed Sequences (Check if table exists first in your logic, but here assuming it does based on file view)
    -- Removing explicit table check for simplicity in this block, assuming schema handles existence
    BEGIN
        INSERT INTO public.sequences (account_id, name, trigger_type, is_active, steps) VALUES
        (target_account_id, 'Yeni Lead KarÅŸÄ±lama', 'lead_created', true, '[{"type": "wait", "duration": "5m"}, {"type": "message", "template_id": "welcome"}]'::jsonb),
        (target_account_id, 'ToplantÄ± Gelmeme Takibi', 'no_response', true, '[{"type": "wait", "duration": "1h"}, {"type": "email", "subject": "ToplantÄ±yÄ± kaÃ§Ä±rdÄ±nÄ±z"}]'::jsonb);
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Sequences table does not exist, skipping sequence seeding.';
    END;

    RAISE NOTICE 'Demo data populated successfully for user %', target_email;

END $$;


-- FILE: supabase_rls_policies.sql

-- ============================================================
-- RLS POLICIES â€” Consolidated & Recursion-Safe
-- ============================================================

-- 1. Security Definer Helper Function (Breaks RLS Recursion)
CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view team members"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
DROP POLICY IF EXISTS "profiles_team_select"  ON profiles;

CREATE POLICY "profiles_owner_select"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_team_select"
ON profiles FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);


-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account"   ON accounts;
DROP POLICY IF EXISTS "Admins can update account"    ON accounts;
DROP POLICY IF EXISTS "accounts_select"              ON accounts;

CREATE POLICY "accounts_select"
ON accounts FOR SELECT
USING (id = public.get_my_account_id());

CREATE POLICY "Admins can update account"
ON accounts FOR UPDATE
USING (
  id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- LEADS TABLE
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account leads"   ON leads;
DROP POLICY IF EXISTS "Users can create leads"         ON leads;
DROP POLICY IF EXISTS "Users can update leads"         ON leads;
DROP POLICY IF EXISTS "Users can delete leads"         ON leads;
DROP POLICY IF EXISTS "leads_select"                   ON leads;
DROP POLICY IF EXISTS "leads_insert"                   ON leads;

CREATE POLICY "leads_select"
ON leads FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_insert"
ON leads FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "leads_update"
ON leads FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_delete"
ON leads FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account conversations"   ON conversations;
DROP POLICY IF EXISTS "Users can create conversations"         ON conversations;
DROP POLICY IF EXISTS "Users can update conversations"         ON conversations;

CREATE POLICY "conversations_select"
ON conversations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "conversations_insert"
ON conversations FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "conversations_update"
ON conversations FOR UPDATE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- MESSAGES TABLE
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account messages"   ON messages;
DROP POLICY IF EXISTS "Users can create messages"         ON messages;

CREATE POLICY "messages_select"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);


-- ============================================================
-- MEETINGS TABLE
-- ============================================================
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account meetings"   ON meetings;
DROP POLICY IF EXISTS "Users can create meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can update meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can delete meetings"         ON meetings;

CREATE POLICY "meetings_select"
ON meetings FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_insert"
ON meetings FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "meetings_update"
ON meetings FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_delete"
ON meetings FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- INTEGRATIONS TABLE
-- ============================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account integrations"   ON integrations;
DROP POLICY IF EXISTS "Admins can manage integrations"        ON integrations;

CREATE POLICY "integrations_select"
ON integrations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "integrations_manage"
ON integrations FOR ALL
USING (
  account_id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- SEQUENCES TABLE
-- ============================================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sequences from their account"    ON sequences;
DROP POLICY IF EXISTS "Users can insert sequences to their account"    ON sequences;
DROP POLICY IF EXISTS "Users can update sequences from their account"  ON sequences;
DROP POLICY IF EXISTS "Users can delete sequences from their account"  ON sequences;

CREATE POLICY "sequences_select"
ON sequences FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_insert"
ON sequences FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "sequences_update"
ON sequences FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_delete"
ON sequences FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- SEQUENCE_ENROLLMENTS TABLE
-- ============================================================
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view enrollments from their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can insert enrollments to their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can update enrollments from their account"  ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can delete enrollments from their account"  ON sequence_enrollments;

CREATE POLICY "enrollments_select"
ON sequence_enrollments FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_insert"
ON sequence_enrollments FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_update"
ON sequence_enrollments FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_delete"
ON sequence_enrollments FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- B2B_COMPANIES TABLE (Lead Database)
-- ============================================================
ALTER TABLE IF EXISTS b2b_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view companies" ON b2b_companies;
DROP POLICY IF EXISTS "Service role only write" ON b2b_companies;

-- Allow all authenticated users to search/view lead database
CREATE POLICY "authenticated_select_companies"
ON b2b_companies FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);


-- ============================================================
-- POSTS TABLE (Blog)
-- ============================================================
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts"       ON posts;
DROP POLICY IF EXISTS "Admins can insert posts"        ON posts;
DROP POLICY IF EXISTS "Admins can update posts"        ON posts;
DROP POLICY IF EXISTS "Admins can delete posts"        ON posts;

CREATE POLICY "posts_public_select"
ON posts FOR SELECT
USING (published = true);

CREATE POLICY "posts_admin_all"
ON posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
