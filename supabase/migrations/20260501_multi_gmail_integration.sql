-- Multi-Gmail Integration Migration
-- Allows multiple Gmail accounts per workspace with primary designation

-- 1. Remove single-provider unique constraint from integrations
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_account_id_provider_key;

-- 2. Add is_primary and label columns to integrations
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS label TEXT;

-- 3. Unique index: same Gmail address cannot be added twice to same account
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_gmail_email_idx
    ON public.integrations (account_id, (config->>'email'))
    WHERE provider = 'gmail' AND config->>'email' IS NOT NULL;

-- 4. Unique index: only one primary Gmail per account
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_primary_gmail_idx
    ON public.integrations (account_id)
    WHERE provider = 'gmail' AND is_primary = true;

-- 5. For non-Gmail providers keep original unique behavior
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_provider_non_gmail_idx
    ON public.integrations (account_id, provider)
    WHERE provider != 'gmail';

-- 6. conversations: track which Gmail account handled this conversation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_integration ON public.conversations(integration_id);

-- 7. sequence_enrollments: which Gmail account sends for this enrollment
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

-- 8. sequence_events: track which Gmail sent each event (for per-account reporting)
ALTER TABLE public.sequence_events ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_events_integration ON public.sequence_events(integration_id);

-- 9. leads: preferred Gmail account for this lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

-- 10. Set existing single Gmail integrations as primary automatically
UPDATE public.integrations
SET is_primary = true
WHERE provider = 'gmail'
  AND status = 'connected'
  AND is_primary = false
  AND id IN (
    SELECT DISTINCT ON (account_id) id
    FROM public.integrations
    WHERE provider = 'gmail'
    ORDER BY account_id, created_at ASC
  );
