-- Add language column to leads table
ALTER TABLE public.leads 
ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN public.leads.language IS 'The language the lead prefers to communicate in (e.g., en, tr, de, es). Auto-detected on first message.';