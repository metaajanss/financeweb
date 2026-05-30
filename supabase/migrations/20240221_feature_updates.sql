-- Feature updates for global scaling (RBAC, Webhooks)

-- 1. Update RBAC roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'sales_rep', 'viewer', 'agent', 'member'));

-- 2. Create Webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- e.g. ['lead.created', 'meeting.booked']
    secret TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhooks"
ON public.webhooks FOR SELECT
USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own webhooks"
ON public.webhooks FOR ALL
USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Create Webhook Logs table (for debugging)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook logs"
ON public.webhook_logs FOR SELECT
USING (webhook_id IN (SELECT id FROM public.webhooks WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())));
