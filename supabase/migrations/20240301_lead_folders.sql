-- Migration: Create lead_folders table and link to lead_groups
-- Date: 2024-03-01

-- 1. Create lead_folders table
CREATE TABLE IF NOT EXISTS public.lead_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for lead_folders
ALTER TABLE public.lead_folders ENABLE ROW LEVEL SECURITY;

-- Creating policies for lead_folders based on account_id
CREATE POLICY "Users can view lead folders of their account"
    ON public.lead_folders FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lead folders to their account"
    ON public.lead_folders FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update lead folders of their account"
    ON public.lead_folders FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete lead folders of their account"
    ON public.lead_folders FOR DELETE
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Add folder_id to lead_groups table
ALTER TABLE public.lead_groups 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.lead_folders(id) ON DELETE SET NULL;

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_lead_folders_account_id ON public.lead_folders(account_id);
CREATE INDEX IF NOT EXISTS idx_lead_groups_folder_id ON public.lead_groups(folder_id);

-- 4. Trigger to automatically update updated_at on lead_folders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lead_folders_updated_at ON public.lead_folders;
CREATE TRIGGER update_lead_folders_updated_at
    BEFORE UPDATE ON public.lead_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
