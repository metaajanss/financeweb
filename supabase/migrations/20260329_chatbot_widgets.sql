-- Web AI Chatbot Widget table
-- One widget per account but can be embedded on unlimited websites via the same script ID

CREATE TABLE IF NOT EXISTS chatbot_widgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name        VARCHAR NOT NULL DEFAULT 'Web Chatbot',
    is_active   BOOLEAN DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{
        "color": "#7c3aed",
        "position": "bottom-right",
        "greeting": "Hi! I''m your AI assistant. How can I help you today?",
        "collect_email": true,
        "collect_phone": false,
        "bot_name": "AI Assistant",
        "bot_avatar": null,
        "placeholder": "Type your message...",
        "form_title": "Start a conversation"
    }',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE chatbot_widgets ENABLE ROW LEVEL SECURITY;

-- Accounts can only access their own widget
CREATE POLICY "accounts_own_chatbot_widget" ON chatbot_widgets
    FOR ALL USING (account_id = (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- Public read (for the embeddable script CORS requests)
CREATE POLICY "public_read_active_chatbot_widget" ON chatbot_widgets
    FOR SELECT USING (is_active = true);

-- Index
CREATE INDEX IF NOT EXISTS idx_chatbot_widgets_account_id ON chatbot_widgets(account_id);
