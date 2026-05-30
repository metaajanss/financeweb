-- ============================================
-- EK PERFORMANS INDEX'LERİ
-- Tarih: 2026-04-22
-- ============================================

-- 1. Leads tablosu - dashboard filtreleme ve sıralama
--    getLeads: account_id + status + created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
    ON public.leads(account_id, status, created_at DESC);

-- 2. Messages tablosu - konuşma mesaj geçmişi
--    Mesaj geçmişi sorguları: conversation_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. Integrations tablosu - provider bazlı lookup
--    getIntegrations: account_id + provider
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider
    ON public.integrations(account_id, provider);

-- 4. B2B unlocked leads - kullanıcı bazlı hızlı lookup
--    searchB2BCompanies parallel query için
CREATE INDEX IF NOT EXISTS idx_b2b_unlocked_user
    ON public.b2b_unlocked_leads(user_id);

-- 5. Leads tablosu - source bazlı filtreleme (B2B database leads)
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source)
    WHERE source IS NOT NULL;
