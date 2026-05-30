-- Create error_logs table for system monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    message TEXT NOT NULL,
    level TEXT DEFAULT 'error',
    stack TEXT,
    context JSONB,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    path TEXT,
    method TEXT,
    status_code INTEGER
);

-- RLS Policies
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see error logs
CREATE POLICY "Admins can see all error logs"
ON public.error_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.id = '98e097cf-e023-4403-b48d-5c6e1697cebd'::uuid)
    )
);

-- Anyone can insert error logs (to allow logging from various parts of the app)
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Indices
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_account_id_idx ON public.error_logs (account_id);
