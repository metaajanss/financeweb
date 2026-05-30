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
