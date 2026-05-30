-- Enable Row Level Security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integrations ENABLE ROW LEVEL SECURITY;

-- 1. Accounts (Tenants)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paddle_customer_id TEXT,
    paddle_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    subscription_current_period_end TIMESTAMP WITH TIME ZONE,
    plan_id TEXT DEFAULT 'free'
);

-- 2. Profiles (Users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'sales_rep')) DEFAULT 'sales_rep',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'unqualified')) DEFAULT 'new',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Conversations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('whatsapp', 'email', 'widget')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'paused', 'closed')) DEFAULT 'active',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('ai', 'lead', 'agent')) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Meetings
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    meeting_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Integrations
CREATE TABLE public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    status TEXT CHECK (status IN ('connected', 'disconnected', 'error')) DEFAULT 'disconnected',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, provider)
);

-- TRIGGER for updating profiles updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- NOTE: Detailed RLS Policies are consolidated in `supabase_rls_policies.sql`
-- 8. Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies are in `supabase_rls_policies.sql`

-- 9. Blog Posts
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    excerpt TEXT,
    cover_image TEXT,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for posts updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS for Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS for Posts are in `supabase_rls_policies.sql`

-- 10. Sequences (Automation Workflows)
CREATE TABLE IF NOT EXISTS public.sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'no_response', 'meeting_booked', 'lead_created', 'custom',
        'hubspot_lead', 'salesforce_lead', 'pipedrive_lead', 'zoho_lead'
    )),
    lead_type TEXT DEFAULT 'all',
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    metrics JSONB DEFAULT '{
        "enrolled": 0,
        "active": 0,
        "completed": 0,
        "email": { "sent": 0, "opened": 0, "replied": 0 },
        "whatsapp": { "sent": 0, "opened": 0, "replied": 0 }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_account ON public.sequences(account_id);
CREATE INDEX IF NOT EXISTS idx_sequences_active  ON public.sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_sequences_trigger ON public.sequences(trigger_type);

CREATE TRIGGER update_sequences_updated_at
BEFORE UPDATE ON public.sequences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

-- RLS for Sequences are in `supabase_rls_policies.sql`

-- 11. Sequence Enrollments
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'completed', 'failed', 'unsubscribed')),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_step_due_at TIMESTAMP WITH TIME ZONE,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_sequence ON public.sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead     ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_account  ON public.sequence_enrollments(account_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status   ON public.sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_due      ON public.sequence_enrollments(next_step_due_at)
    WHERE status = 'active';

CREATE TRIGGER update_sequence_enrollments_updated_at
BEFORE UPDATE ON public.sequence_enrollments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS for Sequence Enrollments are in `supabase_rls_policies.sql`



