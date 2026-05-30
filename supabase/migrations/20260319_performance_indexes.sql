-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- 1. Profiles Table
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- 2. Leads Table
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- 3. Conversations Table
CREATE INDEX IF NOT EXISTS idx_conversations_account_id ON public.conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 4. Messages Table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

-- 5. Meetings Table
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 6. Integrations Table
CREATE INDEX IF NOT EXISTS idx_integrations_account_id ON public.integrations(account_id);
