-- ============================================
-- KRİTİK COMPOSITE INDEX'LER
-- Tarih: 2026-04-18
-- ============================================

-- 1. Sequence Processor ana sorgusu
--    processPendingSteps: status=active + next_step_due_at <= now
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_processor
    ON public.sequence_enrollments(account_id, status, next_step_due_at)
    WHERE status = 'active';

-- 2. Conversations dashboard filtresi
--    getConversations: account_id + status
CREATE INDEX IF NOT EXISTS idx_conversations_account_status
    ON public.conversations(account_id, status);

-- 3. WhatsApp webhook duplicate check
--    messages.metadata JSONB üzerinde GIN index
--    (external_message_id sütununa geçiş yapılana kadar)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON public.messages USING GIN(metadata);

-- 4. B2B Full Text Search için generated tsvector sütunu
--    searchB2BCompanies ILIKE yerine FTS kullanacak
ALTER TABLE public.b2b_companies
    ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(hq_location, '') || ' ' ||
            coalesce(industry, '') || ' ' ||
            coalesce(company_type, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_b2b_fts
    ON public.b2b_companies USING GIN(fts);

-- 5. WhatsApp webhook için dedicated sütun
--    (Görev 1.4 ile birlikte kullanılacak)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_message_id
    ON public.messages(external_message_id)
    WHERE external_message_id IS NOT NULL;
