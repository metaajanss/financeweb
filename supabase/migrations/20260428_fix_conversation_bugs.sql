-- ============================================
-- CONVERSATION BUG FIXES
-- Tarih: 2026-04-28
-- ============================================

-- Fix 1: Add 'system' sender_type to messages CHECK constraint
-- TypeScript type + cron/webhook routes use 'system' but DB was rejecting it
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check
    CHECK (sender_type IN ('ai', 'lead', 'agent', 'system'));

-- Fix 2: RPC for correct unread conversations count
-- The previous JS query used INNER JOIN which counted message rows, not conversation rows.
-- This function uses EXISTS so each conversation is counted exactly once.
CREATE OR REPLACE FUNCTION get_unread_conversations_count(p_account_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::BIGINT
    FROM conversations c
    WHERE c.account_id = p_account_id
      AND c.status = 'active'
      AND EXISTS (
          SELECT 1 FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_type = 'lead'
      );
$$;
