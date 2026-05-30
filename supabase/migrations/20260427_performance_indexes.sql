-- Performance indexes for rate-limiting and common query patterns
-- Run in Supabase SQL Editor or via supabase db push

-- sequence_events: used for daily/monthly send-rate limiting
-- Previously missing — causes full table scan on every sequence step
CREATE INDEX IF NOT EXISTS idx_sequence_events_account_channel_type_created
ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- leads: composite index for the most common dashboard query
-- (account_id filter + status filter + created_at sort)
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
ON public.leads(account_id, status, created_at DESC);

-- leads: fast email lookup (dedup check on widget capture)
CREATE INDEX IF NOT EXISTS idx_leads_account_email
ON public.leads(account_id, email);

-- conversations: partial index — active conversations only
-- speeds up follow-up cron and chatbot inbox
CREATE INDEX IF NOT EXISTS idx_conversations_active_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'active';

-- conversations: open status for follow-up job
CREATE INDEX IF NOT EXISTS idx_conversations_open_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'open';

-- messages: composite for per-conversation message history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC);

-- meetings: upcoming meeting lookups (reminder cron)
CREATE INDEX IF NOT EXISTS idx_meetings_account_scheduled
ON public.meetings(account_id, scheduled_at DESC)
WHERE status = 'scheduled';

-- integrations: provider lookup per account (used in every cron sync)
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider_status
ON public.integrations(account_id, provider, status);
