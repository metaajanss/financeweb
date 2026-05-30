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
