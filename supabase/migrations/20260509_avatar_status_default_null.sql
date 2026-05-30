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
