

-- FILE: 20260409_fix_profiles_email.sql

-- Migration: Add email column to profiles table
-- Date: 2026-04-09
-- Description: Adds the email column to profiles table to support RLS policies and easier identification.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles from auth.users if possible
-- Note: This requires the migration to be run in an environment where auth schema is accessible
-- but even if it doesn't update, the app logic in profile-bootstrap.ts will handle it on next login.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND p.email IS NULL;
  END IF;
END $$;


-- FILE: 20260417_add_now_trigger_type.sql

-- Drop old check constraint and add 'now' as a valid trigger_type
ALTER TABLE public.sequences
  DROP CONSTRAINT IF EXISTS sequences_trigger_type_check;

ALTER TABLE public.sequences
  ADD CONSTRAINT sequences_trigger_type_check
    CHECK (trigger_type IN (
      'instant',
      'now',
      'no_response',
      'meeting_booked',
      'lead_created',
      'custom',
      'hubspot_lead',
      'salesforce_lead',
      'pipedrive_lead',
      'zoho_lead'
    ));


-- FILE: 20260418_critical_composite_indexes.sql

-- ============================================
-- KRÄ°TÄ°K COMPOSITE INDEX'LER
-- Tarih: 2026-04-18
-- ============================================

-- 1. Sequence Processor ana sorgusu
--    processPendingSteps: status=active + next_step_due_at <= now
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_processor
    ON public.sequence_enrollments(account_id, status, next_step_due_at)
    WHERE status = 'active';

-- 2. Conversations dashboard filtresi
--    getConversations: account_id + status
CREATE INDEX IF NOT EXISTS idx_conversations_account_status
    ON public.conversations(account_id, status);

-- 3. WhatsApp webhook duplicate check
--    messages.metadata JSONB Ã¼zerinde GIN index
--    (external_message_id sÃ¼tununa geÃ§iÅŸ yapÄ±lana kadar)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON public.messages USING GIN(metadata);

-- 4. B2B Full Text Search iÃ§in generated tsvector sÃ¼tunu
--    searchB2BCompanies ILIKE yerine FTS kullanacak
ALTER TABLE public.b2b_companies
    ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(hq_location, '') || ' ' ||
            coalesce(industry, '') || ' ' ||
            coalesce(company_type, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_b2b_fts
    ON public.b2b_companies USING GIN(fts);

-- 5. WhatsApp webhook iÃ§in dedicated sÃ¼tun
--    (GÃ¶rev 1.4 ile birlikte kullanÄ±lacak)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_message_id
    ON public.messages(external_message_id)
    WHERE external_message_id IS NOT NULL;


-- FILE: 20260420_missing_performance_indexes.sql

-- ============================================
-- EKSÄ°K PERFORMANCE INDEX'LER
-- Tarih: 2026-04-20
-- ============================================

-- 1. Sequence Events - processor'da NÃ—2 sorgu optimizasyonu iÃ§in
--    Her hesap iÃ§in event sayÄ±mÄ±: account_id + channel + event_type + created_at
CREATE INDEX IF NOT EXISTS idx_seq_events_account_channel_type
    ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- 2. Integrations - JSONB config alanÄ± iÃ§in GIN index
--    config->>'webhook_url', config->>'api_key' gibi sorgular iÃ§in
CREATE INDEX IF NOT EXISTS idx_integrations_config_gin
    ON public.integrations USING GIN(config);


-- FILE: 20260422_additional_performance_indexes.sql

-- ============================================
-- EK PERFORMANS INDEX'LERÄ°
-- Tarih: 2026-04-22
-- ============================================

-- 1. Leads tablosu - dashboard filtreleme ve sÄ±ralama
--    getLeads: account_id + status + created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
    ON public.leads(account_id, status, created_at DESC);

-- 2. Messages tablosu - konuÅŸma mesaj geÃ§miÅŸi
--    Mesaj geÃ§miÅŸi sorgularÄ±: conversation_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. Integrations tablosu - provider bazlÄ± lookup
--    getIntegrations: account_id + provider
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider
    ON public.integrations(account_id, provider);

-- 4. B2B unlocked leads - kullanÄ±cÄ± bazlÄ± hÄ±zlÄ± lookup
--    searchB2BCompanies parallel query iÃ§in
CREATE INDEX IF NOT EXISTS idx_b2b_unlocked_user
    ON public.b2b_unlocked_leads(user_id);

-- 5. Leads tablosu - source bazlÄ± filtreleme (B2B database leads)
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source)
    WHERE source IS NOT NULL;


-- FILE: 20260422_conversations_speed_indexes.sql

-- ============================================
-- CONVERSATIONS SPEED OPTIMIZATION INDEXES
-- Tarih: 2026-04-22
-- ============================================

-- 1. Ana conversations listesi sorgusu iÃ§in kritik composite index
--    getConversations: account_id filtresi + last_message_at sÄ±ralamasÄ±
--    Mevcut ayrÄ± index'ler yerine tek index ile index-only scan saÄŸlar
CREATE INDEX IF NOT EXISTS idx_conversations_account_lastmsg
    ON public.conversations(account_id, last_message_at DESC);

-- 2. Mesaj sayfalama iÃ§in kritik composite index
--    getMessages: conversation_id filtresi + created_at sÄ±ralamasÄ± + cursor pagination
--    Mevcut ayrÄ± index'ler yerine tek index ile Ã§ok daha hÄ±zlÄ± pagination saÄŸlar
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. getUnreadConversationsCount iÃ§in optimize index
--    conversations join messages WHERE sender_type = 'lead'
--    Partial index: sadece lead mesajlarÄ±nÄ± kapsar, daha kÃ¼Ã§Ã¼k ve hÄ±zlÄ±
CREATE INDEX IF NOT EXISTS idx_messages_conv_lead_sender
    ON public.messages(conversation_id)
    WHERE sender_type = 'lead';


-- FILE: 20260423_add_lead_score_column.sql

-- Migration: Add lead score column
-- Date: 2026-04-23
-- Description: Adds scoring capability to leads for AI qualification ranking

-- Add score column to leads table (0-100 range)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100);

-- Add index for efficient filtering and sorting by score
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(account_id, score DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.score IS 'Lead quality score (0-100) based on AI qualification and engagement';

-- Add index for combined account_id + score queries (common for lead lists)
CREATE INDEX IF NOT EXISTS idx_leads_account_score ON public.leads(account_id, score DESC, created_at DESC);


-- FILE: 20260426_blog_agent_generation_mode.sql

-- Blog Agent: generation_mode and keyword rotation tracking

ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'combined',
    -- 'combined'    â†’ all keywords merged into one post per run
    -- 'per_keyword' â†’ one keyword per run, cycling in order
    ADD COLUMN IF NOT EXISTS last_keyword_index INT NOT NULL DEFAULT 0;
    -- tracks which keyword index was last used for per_keyword mode


-- FILE: 20260426_blog_agent_posts_per_run.sql

-- Blog Agent: how many posts to generate per scheduled run
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS posts_per_run INT NOT NULL DEFAULT 1;
-- max enforced in application layer (capped at 10)


-- FILE: 20260426_blog_agent_tables.sql

-- Blog Agent: keyword-driven AI content generation tables

CREATE TABLE IF NOT EXISTS blog_generation_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords    TEXT[]          NOT NULL DEFAULT '{}',
    tone        TEXT            NOT NULL DEFAULT 'informative',  -- informative | persuasive | casual
    length_words INT            NOT NULL DEFAULT 1200,
    target_locale TEXT          NOT NULL DEFAULT 'en',
    auto_publish BOOLEAN        NOT NULL DEFAULT false,
    schedule_type TEXT          NOT NULL DEFAULT 'manual',       -- manual | daily | weekly
    status      TEXT            NOT NULL DEFAULT 'active',       -- active | paused
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_generation_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES blog_generation_topics(id) ON DELETE CASCADE,
    post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending',             -- pending | processing | completed | failed
    generated_title TEXT,
    error_message   TEXT,
    triggered_by    TEXT NOT NULL DEFAULT 'cron',               -- cron | manual
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Track last-run time per topic so cron can respect schedule_type
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Index for queue processing (status + created_at lookup)
CREATE INDEX IF NOT EXISTS idx_blog_gen_queue_status
    ON blog_generation_queue (status, created_at);

-- Index for topic list ordering
CREATE INDEX IF NOT EXISTS idx_blog_gen_topics_created
    ON blog_generation_topics (created_at DESC);

-- RLS: super-admin only (service role bypasses RLS, so client-side calls need policies)
ALTER TABLE blog_generation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_generation_queue  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role to read/write
CREATE POLICY "admin_all_generation_topics" ON blog_generation_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_all_generation_queue" ON blog_generation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );


-- FILE: 20260426_gsc_auto_mode.sql

-- GSC Agent: auto-mode settings per connection
ALTER TABLE gsc_connections
    ADD COLUMN IF NOT EXISTS auto_mode       BOOLEAN NOT NULL DEFAULT false,
    -- When true: after each sync, top recommendations are auto-generated
    ADD COLUMN IF NOT EXISTS auto_publish    BOOLEAN NOT NULL DEFAULT false,
    -- When true: generated posts go live immediately (no draft)
    ADD COLUMN IF NOT EXISTS auto_min_score  INT     NOT NULL DEFAULT 60,
    -- Only process recommendations with priority_score >= this value
    ADD COLUMN IF NOT EXISTS auto_max_per_run INT    NOT NULL DEFAULT 3;
    -- Max posts to generate per sync run


-- FILE: 20260426_seo_optimization.sql

-- SEO Optimization System: GSC connections, raw data, recommendations

-- GSC OAuth connections (per super-admin, not per tenant)
CREATE TABLE IF NOT EXISTS gsc_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_url        TEXT NOT NULL,
    email           TEXT,
    access_token    TEXT,
    refresh_token   TEXT,
    expiry_date     BIGINT,
    status          TEXT NOT NULL DEFAULT 'connected', -- connected | disconnected | error
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw GSC search analytics data (rolling 90 days)
CREATE TABLE IF NOT EXISTS gsc_raw_data (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    page        TEXT,
    clicks      INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    ctr         FLOAT NOT NULL DEFAULT 0,
    position    FLOAT NOT NULL DEFAULT 0,
    date_range  TEXT NOT NULL DEFAULT '90d',
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_raw_query     ON gsc_raw_data (query);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_synced    ON gsc_raw_data (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_position  ON gsc_raw_data (position);

-- SEO recommendations derived from GSC analysis
CREATE TABLE IF NOT EXISTS gsc_recommendations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id    UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query            TEXT NOT NULL,
    category         TEXT NOT NULL,
    -- 'quick_win' | 'ctr_crisis' | 'content_gap' | 'decay' | 'cannibalization' | 'featured_snippet'
    intent           TEXT NOT NULL DEFAULT 'informational',
    -- 'informational' | 'commercial' | 'transactional' | 'navigational'
    priority_score   FLOAT NOT NULL DEFAULT 0,
    recommended_action TEXT NOT NULL,
    -- 'create' | 'update' | 'optimize_title' | 'merge' | 'add_snippet_format'
    matched_post_id  UUID REFERENCES posts(id) ON DELETE SET NULL,
    topic_id         UUID,  -- filled when accepted â†’ blog_generation_topics
    status           TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'accepted' | 'dismissed' | 'in_progress' | 'completed'
    -- Raw metrics
    impressions      INT NOT NULL DEFAULT 0,
    clicks           INT NOT NULL DEFAULT 0,
    ctr              FLOAT NOT NULL DEFAULT 0,
    position         FLOAT NOT NULL DEFAULT 0,
    -- Trend vs previous period (positive = improvement)
    impressions_trend FLOAT DEFAULT 0,
    clicks_trend      FLOAT DEFAULT 0,
    position_trend    FLOAT DEFAULT 0,
    synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_rec_status    ON gsc_recommendations (status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_rec_category  ON gsc_recommendations (category);

-- Posts table additions for SEO lifecycle tracking
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS content_type        TEXT DEFAULT 'standalone',
    -- 'pillar' | 'cluster' | 'standalone'
    ADD COLUMN IF NOT EXISTS pillar_post_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cluster_topic       TEXT,
    ADD COLUMN IF NOT EXISTS needs_update        BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS freshness_score     INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_seo_audit_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rank_at_30d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_60d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_90d         FLOAT;

-- RLS
ALTER TABLE gsc_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_raw_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gsc_connections" ON gsc_connections
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_raw_data" ON gsc_raw_data
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_recommendations" ON gsc_recommendations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));


-- FILE: 20260427_performance_indexes.sql

-- Performance indexes for rate-limiting and common query patterns
-- Run in Supabase SQL Editor or via supabase db push

-- sequence_events: used for daily/monthly send-rate limiting
-- Previously missing â€” causes full table scan on every sequence step
CREATE INDEX IF NOT EXISTS idx_sequence_events_account_channel_type_created
ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- leads: composite index for the most common dashboard query
-- (account_id filter + status filter + created_at sort)
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
ON public.leads(account_id, status, created_at DESC);

-- leads: fast email lookup (dedup check on widget capture)
CREATE INDEX IF NOT EXISTS idx_leads_account_email
ON public.leads(account_id, email);

-- conversations: partial index â€” active conversations only
-- speeds up follow-up cron and chatbot inbox
CREATE INDEX IF NOT EXISTS idx_conversations_active_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'active';

-- conversations: open status for follow-up job
CREATE INDEX IF NOT EXISTS idx_conversations_open_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'open';

-- messages: composite for per-conversation message history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC);

-- meetings: upcoming meeting lookups (reminder cron)
CREATE INDEX IF NOT EXISTS idx_meetings_account_scheduled
ON public.meetings(account_id, scheduled_at DESC)
WHERE status = 'scheduled';

-- integrations: provider lookup per account (used in every cron sync)
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider_status
ON public.integrations(account_id, provider, status);


-- FILE: 20260428_fix_conversation_bugs.sql

-- ============================================
-- CONVERSATION BUG FIXES
-- Tarih: 2026-04-28
-- ============================================

-- Fix 1: Add 'system' sender_type to messages CHECK constraint
-- TypeScript type + cron/webhook routes use 'system' but DB was rejecting it
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check
    CHECK (sender_type IN ('ai', 'lead', 'agent', 'system'));

-- Fix 2: RPC for correct unread conversations count
-- The previous JS query used INNER JOIN which counted message rows, not conversation rows.
-- This function uses EXISTS so each conversation is counted exactly once.
CREATE OR REPLACE FUNCTION get_unread_conversations_count(p_account_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::BIGINT
    FROM conversations c
    WHERE c.account_id = p_account_id
      AND c.status = 'active'
      AND EXISTS (
          SELECT 1 FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_type = 'lead'
      );
$$;


-- FILE: 20260430_leads_account_created_index.sql

-- Dedicated index for the leads list page query
-- getLeads() filters only by account_id (no status filter) + orders by created_at DESC
-- The existing idx_leads_account_status_created has status in the middle, which is
-- sub-optimal for queries that skip the status column entirely.
CREATE INDEX IF NOT EXISTS idx_leads_account_created
ON public.leads(account_id, created_at DESC);


-- FILE: 20260501_multi_gmail_integration.sql

-- Multi-Gmail Integration Migration
-- Allows multiple Gmail accounts per workspace with primary designation

-- 1. Remove single-provider unique constraint from integrations
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_account_id_provider_key;

-- 2. Add is_primary and label columns to integrations
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS label TEXT;

-- 3. Unique index: same Gmail address cannot be added twice to same account
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_gmail_email_idx
    ON public.integrations (account_id, (config->>'email'))
    WHERE provider = 'gmail' AND config->>'email' IS NOT NULL;

-- 4. Unique index: only one primary Gmail per account
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_primary_gmail_idx
    ON public.integrations (account_id)
    WHERE provider = 'gmail' AND is_primary = true;

-- 5. For non-Gmail providers keep original unique behavior
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_provider_non_gmail_idx
    ON public.integrations (account_id, provider)
    WHERE provider != 'gmail';

-- 6. conversations: track which Gmail account handled this conversation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_integration ON public.conversations(integration_id);

-- 7. sequence_enrollments: which Gmail account sends for this enrollment
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

-- 8. sequence_events: track which Gmail sent each event (for per-account reporting)
ALTER TABLE public.sequence_events ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_events_integration ON public.sequence_events(integration_id);

-- 9. leads: preferred Gmail account for this lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

-- 10. Set existing single Gmail integrations as primary automatically
UPDATE public.integrations
SET is_primary = true
WHERE provider = 'gmail'
  AND status = 'connected'
  AND is_primary = false
  AND id IN (
    SELECT DISTINCT ON (account_id) id
    FROM public.integrations
    WHERE provider = 'gmail'
    ORDER BY account_id, created_at ASC
  );


-- FILE: 20260502_smtp_email_integration.sql

-- Workspace baÅŸÄ±na birden fazla 'email' (SMTP) hesabÄ±na izin ver (gmail gibi)
DROP INDEX IF EXISTS integrations_account_provider_non_gmail_idx;
CREATE UNIQUE INDEX integrations_account_provider_non_gmail_idx
    ON public.integrations (account_id, provider)
    WHERE provider != 'gmail' AND provider != 'email';

-- AynÄ± SMTP adresi aynÄ± hesaba iki kez eklenemez
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_email_smtp_idx
    ON public.integrations (account_id, (config->>'email'))
    WHERE provider = 'email' AND config->>'email' IS NOT NULL;

-- Hesap baÅŸÄ±na yalnÄ±zca bir birincil SMTP
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_primary_email_idx
    ON public.integrations (account_id)
    WHERE provider = 'email' AND is_primary = true;


-- FILE: 20260503_ai_persona_rules_feedback.sql

-- Migration: AI Persona, Rules, FAQ, Unanswered Questions Tracker, Message Feedback
-- These features extend the JSONB ai_config column (no schema changes needed there)
-- and rely on existing event_logs + messages.metadata columns.

-- 1. Ensure event_logs has an index on event_type for fast unanswered questions queries
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type_account
    ON event_logs (account_id, event_type, created_at DESC);

-- 2. Ensure messages.metadata is indexed for feedback queries (JSONB GIN index)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON messages USING GIN (metadata jsonb_path_ops);

-- 3. Index for conversations.last_message_at (ghost lead detection)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_account
    ON conversations (account_id, last_message_at DESC)
    WHERE status = 'active';

-- 4. Ensure leads.metadata is indexed for ghost tagging queries
CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin
    ON leads USING GIN (metadata jsonb_path_ops);

-- Note: No new columns needed. All new data is stored in:
--   - accounts.ai_config (JSONB): persona_name, persona_intro, forbidden_topics,
--     mandatory_rules, faq_items
--   - event_logs: new event_type values 'ai.needs_human', 'ai.sentiment.negative',
--     'ai.feedback.positive'
--   - messages.metadata: feedback field ('positive'|'negative'), feedback_correction


-- FILE: 20260503150632_add_lead_language.sql

-- Add language column to leads table
ALTER TABLE public.leads 
ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN public.leads.language IS 'The language the lead prefers to communicate in (e.g., en, tr, de, es). Auto-detected on first message.';


-- FILE: 20260504_rpc_functions_and_indexes.sql

-- ============================================================================
-- MIGRATION: RPC Functions and Performance Indexes for New Features
-- Date: 2026-05-04
-- Description: Creates all RPC functions and missing indexes for:
--   - Super Admin analytics
--   - Sequence processor (atomic locking)
--   - Sequence analytics aggregation
--   - Lead scoring
--   - Multi-Gmail/SMTP integration support
--   - AI Persona & Feedback system
-- ============================================================================

-- ============================================================================
-- SECTION 1: RPC FUNCTIONS FOR SUPER ADMIN ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_super_admin_stats()
RETURNS TABLE (
    total_tenants BIGINT,
    active_subscriptions BIGINT,
    trial_tenants BIGINT,
    mrr_estimate NUMERIC,
    total_leads BIGINT,
    total_conversations BIGINT,
    total_meetings BIGINT,
    avg_leads_per_tenant NUMERIC,
    new_tenants_today BIGINT,
    new_tenants_this_week BIGINT,
    new_tenants_this_month BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    WITH tenant_stats AS (
        SELECT 
            a.id,
            a.subscription_status,
            a.plan_id,
            a.created_at,
            COUNT(l.id) as lead_count
        FROM accounts a
        LEFT JOIN leads l ON l.account_id = a.id
        GROUP BY a.id, a.subscription_status, a.plan_id, a.created_at
    )
    SELECT 
        COUNT(*)::BIGINT as total_tenants,
        COUNT(*) FILTER (WHERE subscription_status = 'active')::BIGINT as active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'trialing')::BIGINT as trial_tenants,
        SUM(
            CASE plan_id 
                WHEN 'starter' THEN 29 
                WHEN 'growth' THEN 79 
                WHEN 'pro' THEN 199 
                WHEN 'business' THEN 499 
                ELSE 0 
            END
        )::NUMERIC as mrr_estimate,
        COALESCE(SUM(lead_count), 0)::BIGINT as total_leads,
        (SELECT COUNT(*)::BIGINT FROM conversations) as total_conversations,
        (SELECT COUNT(*)::BIGINT FROM meetings) as total_meetings,
        COALESCE(AVG(lead_count), 0)::NUMERIC as avg_leads_per_tenant,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as new_tenants_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as new_tenants_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as new_tenants_this_month
    FROM tenant_stats;
$$;

COMMENT ON FUNCTION get_super_admin_stats() IS 'Returns aggregated platform metrics for Super Admin dashboard';

-- ============================================================================
-- SECTION 2: RPC FUNCTIONS FOR SEQUENCE PROCESSOR (ATOMIC LOCKING)
-- ============================================================================

CREATE OR REPLACE FUNCTION grab_pending_enrollments(batch_size_int INTEGER DEFAULT 50)
RETURNS TABLE (
    enrollment_id UUID,
    sequence_id UUID,
    lead_id UUID,
    account_id UUID,
    current_step_index INTEGER,
    retry_count INTEGER,
    next_step_due_at TIMESTAMPTZ,
    steps JSONB,
    trigger_type TEXT,
    sequence_name TEXT,
    lead JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lock_duration INTERVAL := '5 minutes';
BEGIN
    RETURN QUERY
    WITH grabbed AS (
        UPDATE sequence_enrollments se
        SET 
            next_step_due_at = NOW() + lock_duration,
            updated_at = NOW()
        WHERE se.id IN (
            SELECT se2.id
            FROM sequence_enrollments se2
            JOIN sequences s ON s.id = se2.sequence_id
            WHERE se2.status = 'active'
                AND se2.next_step_due_at <= NOW()
                AND s.is_active = true
            ORDER BY se2.next_step_due_at ASC
            LIMIT batch_size_int
            FOR UPDATE SKIP LOCKED
        )
        RETURNING 
            se.id as enrollment_id,
            se.sequence_id,
            se.lead_id,
            se.account_id,
            se.current_step_index,
            se.retry_count,
            se.next_step_due_at
    )
    SELECT 
        g.enrollment_id,
        g.sequence_id,
        g.lead_id,
        g.account_id,
        g.current_step_index,
        g.retry_count,
        g.next_step_due_at,
        s.steps,
        s.trigger_type,
        s.name as sequence_name,
        jsonb_build_object(
            'id', l.id,
            'first_name', l.first_name,
            'last_name', l.last_name,
            'email', l.email,
            'phone', l.phone,
            'metadata', l.metadata
        ) as lead
    FROM grabbed g
    JOIN sequences s ON s.id = g.sequence_id
    JOIN leads l ON l.id = g.lead_id;
END;
$$;

COMMENT ON FUNCTION grab_pending_enrollments(INTEGER) IS 'Atomically grabs and locks pending sequence enrollments for processing';


-- ============================================================================
-- SECTION 3: RPC FUNCTIONS FOR SEQUENCE ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sequence_metrics_batch(p_sequence_ids UUID[])
RETURNS TABLE (
    sequence_id UUID,
    channel TEXT,
    event_type TEXT,
    cnt BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        se.sequence_id,
        se.channel,
        se.event_type,
        COUNT(*)::BIGINT as cnt
    FROM sequence_events se
    WHERE se.sequence_id = ANY(p_sequence_ids)
    GROUP BY se.sequence_id, se.channel, se.event_type;
$$;

COMMENT ON FUNCTION get_sequence_metrics_batch(UUID[]) IS 'Returns aggregated event metrics for multiple sequences';

CREATE OR REPLACE FUNCTION get_sequence_enrollment_counts(p_sequence_ids UUID[])
RETURNS TABLE (
    sequence_id UUID,
    status TEXT,
    cnt BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        se.sequence_id,
        se.status,
        COUNT(*)::BIGINT as cnt
    FROM sequence_enrollments se
    WHERE se.sequence_id = ANY(p_sequence_ids)
    GROUP BY se.sequence_id, se.status;
$$;

COMMENT ON FUNCTION get_sequence_enrollment_counts(UUID[]) IS 'Returns enrollment counts grouped by status for sequences';

CREATE OR REPLACE FUNCTION get_global_sequence_metrics(p_account_id UUID)
RETURNS TABLE (
    total_enrolled BIGINT,
    total_active BIGINT,
    total_completed BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        COUNT(*)::BIGINT as total_enrolled,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT as total_active,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as total_completed
    FROM sequence_enrollments
    WHERE account_id = p_account_id;
$$;

COMMENT ON FUNCTION get_global_sequence_metrics(UUID) IS 'Returns global sequence metrics for an account';

CREATE OR REPLACE FUNCTION get_sequence_daily_stats(
    p_account_id UUID,
    p_days INTEGER DEFAULT 30,
    p_sequence_id UUID DEFAULT NULL
)
RETURNS TABLE (
    event_date TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    replied_count BIGINT,
    failed_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        DATE(created_at)::TEXT as event_date,
        COUNT(*) FILTER (WHERE event_type = 'sent')::BIGINT as sent_count,
        COUNT(*) FILTER (WHERE event_type = 'opened')::BIGINT as opened_count,
        COUNT(*) FILTER (WHERE event_type = 'replied')::BIGINT as replied_count,
        COUNT(*) FILTER (WHERE event_type = 'failed')::BIGINT as failed_count
    FROM sequence_events
    WHERE account_id = p_account_id
        AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        AND (p_sequence_id IS NULL OR sequence_id = p_sequence_id)
    GROUP BY DATE(created_at)
    ORDER BY event_date;
$$;

COMMENT ON FUNCTION get_sequence_daily_stats(UUID, INTEGER, UUID) IS 'Returns daily sequence event stats for analytics';


-- ============================================================================
-- SECTION 4: RPC FUNCTIONS FOR LEAD MANAGEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_account_lead_scores(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    WITH scored_leads AS (
        SELECT 
            l.id,
            CASE 
                WHEN m.message_count >= 10 THEN 100
                WHEN m.message_count >= 5 THEN 75
                WHEN m.message_count >= 2 THEN 50
                WHEN m.message_count >= 1 THEN 25
                ELSE 0
            END as calculated_score
        FROM leads l
        LEFT JOIN (
            SELECT 
                c.lead_id,
                COUNT(*) as message_count
            FROM conversations c
            JOIN messages m ON m.conversation_id = c.id
            WHERE c.account_id = p_account_id
                AND m.sender_type = 'lead'
            GROUP BY c.lead_id
        ) m ON m.lead_id = l.id
        WHERE l.account_id = p_account_id
    )
    UPDATE leads l
    SET 
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('score', s.calculated_score),
        updated_at = NOW()
    FROM scored_leads s
    WHERE l.id = s.id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION recalculate_account_lead_scores(UUID) IS 'Recalculates lead engagement scores for an account';

-- ============================================================================
-- SECTION 5: HELPER RPC FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Safely execute SQL for admin/maintenance operations';

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_account_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================================
-- SECTION 6: PERFORMANCE INDEXES FOR NEW FEATURES
-- ============================================================================

-- Multi-Gmail/SMTP Integration Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider_status 
    ON public.integrations(account_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_integrations_primary_lookup 
    ON public.integrations(account_id, provider, is_primary) 
    WHERE provider IN ('gmail', 'email');

-- Sequence Events Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_events_analytics 
    ON public.sequence_events(account_id, sequence_id, channel, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sequence_events_integration 
    ON public.sequence_events(integration_id) 
    WHERE integration_id IS NOT NULL;

-- Sequence Enrollments Performance Indexes
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead_sequence 
    ON public.sequence_enrollments(lead_id, sequence_id);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_integration 
    ON public.sequence_enrollments(integration_id) 
    WHERE integration_id IS NOT NULL;

-- Conversations Integration Support
CREATE INDEX IF NOT EXISTS idx_conversations_integration 
    ON public.conversations(integration_id) 
    WHERE integration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_channel 
    ON public.conversations(lead_id, channel);

-- Leads Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_preferred_integration 
    ON public.leads(preferred_integration_id) 
    WHERE preferred_integration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_source_created 
    ON public.leads(account_id, source, created_at DESC);

-- Messages Performance Indexes  
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
    ON public.messages(conversation_id, sender_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_external_id 
    ON public.messages(external_message_id) 
    WHERE external_message_id IS NOT NULL;

-- Event Logs for AI Persona & Feedback System
CREATE INDEX IF NOT EXISTS idx_event_logs_ai_feedback 
    ON public.event_logs(account_id, event_type, created_at DESC) 
    WHERE event_type LIKE 'ai.%';

-- GSC Connections Indexes
CREATE INDEX IF NOT EXISTS idx_gsc_connections_account 
    ON public.gsc_connections(account_id);

CREATE INDEX IF NOT EXISTS idx_gsc_connections_site 
    ON public.gsc_connections(site_url);

-- Blog Agent Generation Indexes
CREATE INDEX IF NOT EXISTS idx_blog_agent_runs_account 
    ON public.blog_agent_runs(account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_agent_schedules_account 
    ON public.blog_agent_schedules(account_id, is_active);

-- AI Jumpix Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_ai_jumpix_sessions_account 
    ON public.ai_jumpix_sessions(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_jumpix_sessions_user 
    ON public.ai_jumpix_sessions(user_id, created_at DESC);

