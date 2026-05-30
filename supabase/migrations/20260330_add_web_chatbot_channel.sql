-- Update the check constraint on conversations table for channel to include web_chatbot
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'email', 'widget', 'instagram', 'tiktok', 'web_chatbot'));

-- Also update the leads source check if it exists (Optional step if it fails just ignore)
DO $$
BEGIN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
    ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
    CHECK (source IN ('whatsapp', 'email', 'widget', 'manual', 'import', 'api', 'web_chatbot'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;