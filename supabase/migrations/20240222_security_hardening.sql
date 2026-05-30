-- 1. Leads Table Hardening: Add Unique Constraint for account_id and email
-- This prevents duplicate leads for the same email within the same account
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_account_id_email_key') THEN
        ALTER TABLE public.leads ADD CONSTRAINT leads_account_id_email_key UNIQUE (account_id, email);
    END IF;
END $$;

-- 2. Ensure RLS is enabled for all critical tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for LEADS (Account Isolation)
DROP POLICY IF EXISTS "Leads: Account Isolation (Select)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Select)" ON public.leads
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Insert)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Insert)" ON public.leads
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Update)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Update)" ON public.leads
    FOR UPDATE USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Delete)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Delete)" ON public.leads
    FOR DELETE USING (account_id = get_my_account_id());

-- 4. RLS Policies for CONVERSATIONS
DROP POLICY IF EXISTS "Conversations: Account Isolation (Select)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Select)" ON public.conversations
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Conversations: Account Isolation (Insert)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Insert)" ON public.conversations
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Conversations: Account Isolation (Update)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Update)" ON public.conversations
    FOR UPDATE USING (account_id = get_my_account_id());

-- 5. RLS Policies for MESSAGES (Inherited via Conversation)
-- Messages don't have account_id directly, we check through conversation
DROP POLICY IF EXISTS "Messages: Conversation Isolation (Select)" ON public.messages;
CREATE POLICY "Messages: Conversation Isolation (Select)" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.account_id = get_my_account_id()
        )
    );

DROP POLICY IF EXISTS "Messages: Conversation Isolation (Insert)" ON public.messages;
CREATE POLICY "Messages: Conversation Isolation (Insert)" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.account_id = get_my_account_id()
        )
    );

-- 6. RLS Policies for MEETINGS
DROP POLICY IF EXISTS "Meetings: Account Isolation (Select)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Select)" ON public.meetings
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Insert)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Insert)" ON public.meetings
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Update)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Update)" ON public.meetings
    FOR UPDATE USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Delete)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Delete)" ON public.meetings
    FOR DELETE USING (account_id = get_my_account_id());

-- 7. RLS Policies for INTEGRATIONS
DROP POLICY IF EXISTS "Integrations: Account Isolation (Select)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Select)" ON public.integrations
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Integrations: Account Isolation (Insert)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Insert)" ON public.integrations
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Integrations: Account Isolation (Update)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Update)" ON public.integrations
    FOR UPDATE USING (account_id = get_my_account_id());

-- 8. Storage RLS (Basic Auth Check for avatar bucket)
-- Note: Assuming storage setup via SQL is supported or just documenting the policy
-- Most Supabase Storage policies are handled in the storage schema
CREATE POLICY "Users can only upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar visibility is public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profiles');
