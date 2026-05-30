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

