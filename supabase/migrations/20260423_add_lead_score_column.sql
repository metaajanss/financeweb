-- Migration: Add lead score column
-- Date: 2026-04-23
-- Description: Adds scoring capability to leads for AI qualification ranking

-- Add score column to leads table (0-100 range)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100);

-- Add index for efficient filtering and sorting by score
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(account_id, score DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.score IS 'Lead quality score (0-100) based on AI qualification and engagement';

-- Add index for combined account_id + score queries (common for lead lists)
CREATE INDEX IF NOT EXISTS idx_leads_account_score ON public.leads(account_id, score DESC, created_at DESC);
