-- Avatar Module Hardening: Database Schema & Migrations
-- May 21, 2026
--
-- This migration addresses the following issues:
-- Y8: unique index on (account_id, title) for presentations
-- Y16: cascade deletes for presentation → slides
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
-- Y16: Cascade Deletes for Presentation → Slides
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
