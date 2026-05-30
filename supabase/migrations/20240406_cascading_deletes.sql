-- Faz 4: Data Retention ve Cascading Deletes (Veri Tutma ve Kademeli Silme Politikaları)
-- Bu migrasyon, bir ana kayıt (Account veya Lead) silindiğinde ilişkili tüm alt verilerin 
-- otomatik ve temiz bir şekilde silinmesini sağlar.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. ACCOUNTS silindiğinde silinecekler
    -- Profiles
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_account_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_id_fkey;
    END IF;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Leads
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leads_account_id_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_account_id_fkey;
    END IF;
    ALTER TABLE public.leads ADD CONSTRAINT leads_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Integrations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrations_account_id_fkey') THEN
        ALTER TABLE public.integrations DROP CONSTRAINT integrations_account_id_fkey;
    END IF;
    ALTER TABLE public.integrations ADD CONSTRAINT integrations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequences_account_id_fkey') THEN
        ALTER TABLE public.sequences DROP CONSTRAINT sequences_account_id_fkey;
    END IF;
    ALTER TABLE public.sequences ADD CONSTRAINT sequences_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences Enrollments (Account ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_account_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_account_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Webhooks
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhooks_account_id_fkey') THEN
        ALTER TABLE public.webhooks DROP CONSTRAINT webhooks_account_id_fkey;
    END IF;
    ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Event Logs
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_logs_account_id_fkey') THEN
        ALTER TABLE public.event_logs DROP CONSTRAINT event_logs_account_id_fkey;
    END IF;
    ALTER TABLE public.event_logs ADD CONSTRAINT event_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


    -- 2. LEADS silindiğinde silinecekler
    -- Conversations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_lead_id_fkey') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT conversations_lead_id_fkey;
    END IF;
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Meetings
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meetings_lead_id_fkey') THEN
        ALTER TABLE public.meetings DROP CONSTRAINT meetings_lead_id_fkey;
    END IF;
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Sequence Enrollments (Lead ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_lead_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_lead_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


    -- 3. CONVERSATIONS silindiğinde silinecekler
    -- Messages
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_conversation_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_conversation_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

    -- 4. WEBHOOKS silindiğinde silinecekler
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhook_logs_webhook_id_fkey') THEN
        ALTER TABLE public.webhook_logs DROP CONSTRAINT webhook_logs_webhook_id_fkey;
    END IF;
    ALTER TABLE public.webhook_logs ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;

END $$;

-- Rapor: Bu politikalar sayesinde 'supabase.from('leads').delete().eq('id', ...)' komutu çalıştırıldığında
-- lead'e ait tüm konuşmalar, mesajlar ve otomasyon kayıtları otomatik olarak temizlenecektir.
