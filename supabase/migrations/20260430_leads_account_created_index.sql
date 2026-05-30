-- Dedicated index for the leads list page query
-- getLeads() filters only by account_id (no status filter) + orders by created_at DESC
-- The existing idx_leads_account_status_created has status in the middle, which is
-- sub-optimal for queries that skip the status column entirely.
CREATE INDEX IF NOT EXISTS idx_leads_account_created
ON public.leads(account_id, created_at DESC);
