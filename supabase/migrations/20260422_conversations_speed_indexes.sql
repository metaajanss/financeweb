-- ============================================
-- CONVERSATIONS SPEED OPTIMIZATION INDEXES
-- Tarih: 2026-04-22
-- ============================================

-- 1. Ana conversations listesi sorgusu için kritik composite index
--    getConversations: account_id filtresi + last_message_at sıralaması
--    Mevcut ayrı index'ler yerine tek index ile index-only scan sağlar
CREATE INDEX IF NOT EXISTS idx_conversations_account_lastmsg
    ON public.conversations(account_id, last_message_at DESC);

-- 2. Mesaj sayfalama için kritik composite index
--    getMessages: conversation_id filtresi + created_at sıralaması + cursor pagination
--    Mevcut ayrı index'ler yerine tek index ile çok daha hızlı pagination sağlar
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. getUnreadConversationsCount için optimize index
--    conversations join messages WHERE sender_type = 'lead'
--    Partial index: sadece lead mesajlarını kapsar, daha küçük ve hızlı
CREATE INDEX IF NOT EXISTS idx_messages_conv_lead_sender
    ON public.messages(conversation_id)
    WHERE sender_type = 'lead';
