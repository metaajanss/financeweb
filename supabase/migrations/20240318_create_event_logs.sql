-- Migration: Create event_logs table for Activity Log
-- Date: 2024-03-18

CREATE TABLE IF NOT EXISTS public.event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view event logs of their account"
ON public.event_logs FOR SELECT
USING (
    account_id IN (
        SELECT account_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_logs_account_id ON public.event_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON public.event_logs(created_at);
