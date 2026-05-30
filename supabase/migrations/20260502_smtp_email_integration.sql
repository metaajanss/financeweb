-- Workspace başına birden fazla 'email' (SMTP) hesabına izin ver (gmail gibi)
DROP INDEX IF EXISTS integrations_account_provider_non_gmail_idx;
CREATE UNIQUE INDEX integrations_account_provider_non_gmail_idx
    ON public.integrations (account_id, provider)
    WHERE provider != 'gmail' AND provider != 'email';

-- Aynı SMTP adresi aynı hesaba iki kez eklenemez
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_email_smtp_idx
    ON public.integrations (account_id, (config->>'email'))
    WHERE provider = 'email' AND config->>'email' IS NOT NULL;

-- Hesap başına yalnızca bir birincil SMTP
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_primary_email_idx
    ON public.integrations (account_id)
    WHERE provider = 'email' AND is_primary = true;
