-- Migration: Create lead_groups table and link to leads
-- Date: 2024-02-28

-- 1. Create lead_groups table
CREATE TABLE IF NOT EXISTS public.lead_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for lead_groups
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;

-- Creating policies for lead_groups based on account_id
CREATE POLICY "Users can view lead groups of their account"
    ON public.lead_groups FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lead groups to their account"
    ON public.lead_groups FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update lead groups of their account"
    ON public.lead_groups FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete lead groups of their account"
    ON public.lead_groups FOR DELETE
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Add group_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.lead_groups(id) ON DELETE SET NULL;

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_lead_groups_account_id ON public.lead_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_group_id ON public.leads(group_id);

-- Optional: trigger to automatically update updated_at on lead_groups
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lead_groups_updated_at ON public.lead_groups;
CREATE TRIGGER update_lead_groups_updated_at
    BEFORE UPDATE ON public.lead_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
