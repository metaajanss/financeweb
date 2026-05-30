-- Migration: AI Persona, Rules, FAQ, Unanswered Questions Tracker, Message Feedback
-- These features extend the JSONB ai_config column (no schema changes needed there)
-- and rely on existing event_logs + messages.metadata columns.

-- 1. Ensure event_logs has an index on event_type for fast unanswered questions queries
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type_account
    ON event_logs (account_id, event_type, created_at DESC);

-- 2. Ensure messages.metadata is indexed for feedback queries (JSONB GIN index)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON messages USING GIN (metadata jsonb_path_ops);

-- 3. Index for conversations.last_message_at (ghost lead detection)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_account
    ON conversations (account_id, last_message_at DESC)
    WHERE status = 'active';

-- 4. Ensure leads.metadata is indexed for ghost tagging queries
CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin
    ON leads USING GIN (metadata jsonb_path_ops);

-- Note: No new columns needed. All new data is stored in:
--   - accounts.ai_config (JSONB): persona_name, persona_intro, forbidden_topics,
--     mandatory_rules, faq_items
--   - event_logs: new event_type values 'ai.needs_human', 'ai.sentiment.negative',
--     'ai.feedback.positive'
--   - messages.metadata: feedback field ('positive'|'negative'), feedback_correction
