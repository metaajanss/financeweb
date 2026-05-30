-- ============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- Tarih: 2026-03-29
-- ============================================

-- 1. Leads Table - Composite indexes for common query patterns
-- getLeads() sorgusunda account_id + ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_leads_account_created
    ON public.leads(account_id, created_at DESC);

-- Grup bazlı filtreleme (LeadsClient filteredLeads)
CREATE INDEX IF NOT EXISTS idx_leads_group_id
    ON public.leads(group_id);

-- Status bazlı filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_status
    ON public.leads(account_id, status);

-- Source bazlı filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source);

-- 2. Lead Groups Table
-- getLeadGroups() sorgusunda account_id + folder_id
CREATE INDEX IF NOT EXISTS idx_lead_groups_account_folder
    ON public.lead_groups(account_id, folder_id);

-- 3. Lead Folders Table
CREATE INDEX IF NOT EXISTS idx_lead_folders_account
    ON public.lead_folders(account_id, created_at DESC);

-- 4. Meetings Table - Cron job sorgusu (yaklaşan toplantılar)
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_status
    ON public.meetings(scheduled_at, status)
    WHERE status = 'scheduled';

-- 5. Conversations Table - Cron job sorgusu (eski konuşmalar)
CREATE INDEX IF NOT EXISTS idx_conversations_status_last_msg
    ON public.conversations(status, last_message_at DESC)
    WHERE status = 'open';

-- 6. Sequence Enrollments - Lead enrollment sorgularında
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead_account
    ON public.sequence_enrollments(lead_id, account_id);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status
    ON public.sequence_enrollments(status)
    WHERE status = 'active';

