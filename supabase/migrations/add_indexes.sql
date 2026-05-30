-- Supabase (PostgreSQL) Performance Indexes
-- Run this script in your Supabase SQL Editor to speed up common queries.

-- 1. Index on leads (account_id is usually a foreign key used in queries)
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
-- Index on status for filtering leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 2. Index on meetings
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 3. Index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- Note: Depending on your exact schema, some column names (like account_id or start_time) 
-- might differ. Please adjust them if your schema uses different column names.
