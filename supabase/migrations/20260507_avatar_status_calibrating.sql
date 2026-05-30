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
