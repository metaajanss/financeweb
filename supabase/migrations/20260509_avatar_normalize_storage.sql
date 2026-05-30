-- ============================================================================
--  AI Avatar — normalize storage
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

-- RLS — only members of the owning account can read transcripts
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
