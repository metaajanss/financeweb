-- ============================================
-- EKSİK PERFORMANCE INDEX'LER
-- Tarih: 2026-04-20
-- ============================================

-- 1. Sequence Events - processor'da N×2 sorgu optimizasyonu için
--    Her hesap için event sayımı: account_id + channel + event_type + created_at
CREATE INDEX IF NOT EXISTS idx_seq_events_account_channel_type
    ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- 2. Integrations - JSONB config alanı için GIN index
--    config->>'webhook_url', config->>'api_key' gibi sorgular için
CREATE INDEX IF NOT EXISTS idx_integrations_config_gin
    ON public.integrations USING GIN(config);
