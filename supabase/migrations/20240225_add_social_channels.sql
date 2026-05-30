-- Update the check constraint on conversations table for channel
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'email', 'widget', 'instagram', 'tiktok'));

-- Comment for clarity
COMMENT ON COLUMN public.conversations.channel IS 'Communication channel used for this conversation. Added instagram and tiktok.';
