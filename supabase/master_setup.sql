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






-- FILE: 20240218_add_profile_created_at.sql

-- Add missing created_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have a created_at value if they don't (though default NOW() handles new rows)
UPDATE public.profiles SET created_at = updated_at WHERE created_at IS NULL;


-- FILE: 20240218_fix_profile_delete.sql

-- Allow admins to delete profiles in their account (remove team members)
DROP POLICY IF EXISTS "Admins can delete profiles in their account" ON public.profiles;
CREATE POLICY "Admins can delete profiles in their account"
ON public.profiles
FOR DELETE
USING (
    account_id = get_my_account_id()
    AND (get_my_account_id() IS NOT NULL)
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND id != auth.uid() -- Protect self-deletion here too for extra safety
);


-- FILE: 20240218_fix_rls.sql

-- Allow users to view profiles that belong to the same account
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;
CREATE POLICY "Users can view profiles in their account"
ON public.profiles
FOR SELECT
USING (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Note: The previous "Users can view their own account" policy on accounts table is likely preventing 
-- access if not correctly set up, but let's assume accounts table is fine.
-- If the user sees "Active Members (0)", it means they can't see even themselves IF the query does filtering.
-- Or they see themselves but the array mapping fails? No.

-- Let's also ensure invitations are visible
DROP POLICY IF EXISTS "Admins can view invitations for their account" ON public.team_invitations;
CREATE POLICY "Admins can view invitations for their account"
ON public.team_invitations
FOR SELECT
USING (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Ensure admins can delete invitations (fix for removeTeamMember)
DROP POLICY IF EXISTS "Admins can delete invitations for their account" ON public.team_invitations;
CREATE POLICY "Admins can delete invitations for their account"
ON public.team_invitations
FOR DELETE
USING (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);


-- FILE: 20240218_fix_rls_recursion.sql

-- Helper function to get current user's account ID securely
-- This breaks the infinite recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_my_account_id()
RETURNS UUID AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view team members" ON public.profiles;

-- 1. Allow users to view their OWN profile (Critical for getting account_id initially)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Allow users to view other profiles in the same account using the helper function
CREATE POLICY "Users can view team members"
ON public.profiles
FOR SELECT
USING (
    account_id = get_my_account_id()
);

-- Fix team_invitations policies to use the helper function as well
DROP POLICY IF EXISTS "Admins can view invitations for their account" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.team_invitations;

CREATE POLICY "Admins can view invitations"
ON public.team_invitations
FOR SELECT
USING (
    account_id = get_my_account_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can create invitations for their account" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON public.team_invitations;

CREATE POLICY "Admins can insert invitations"
ON public.team_invitations
FOR INSERT
WITH CHECK (
    account_id = get_my_account_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete invitations for their account" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.team_invitations;

CREATE POLICY "Admins can delete invitations"
ON public.team_invitations
FOR DELETE
USING (
    account_id = get_my_account_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);


-- FILE: 20240218_fix_roles.sql

-- Fix profiles table role constraint to match application roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated constraint allowing admin, agent, member (and keeping sales_rep for safety)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'agent', 'member', 'sales_rep'));


-- FILE: 20240218_team_invitations.sql

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'agent', 'member')) DEFAULT 'agent',
    token TEXT DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    UNIQUE(account_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invitations
CREATE POLICY "Admins can view invitations for their account"
ON public.team_invitations
FOR SELECT
USING (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can insert invitations for their account"
ON public.team_invitations
FOR INSERT
WITH CHECK (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can delete invitations for their account"
ON public.team_invitations
FOR DELETE
USING (
    account_id IN (
        SELECT account_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Function to handle new user signup and link to account if invited
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record record;
    new_account_id uuid;
BEGIN
    -- Check if there is a pending invitation for this email
    SELECT * INTO invitation_record 
    FROM public.team_invitations 
    WHERE email = NEW.email 
    AND status = 'pending'
    LIMIT 1;

    IF invitation_record IS NOT NULL THEN
        -- Link new profile to the account
        INSERT INTO public.profiles (id, account_id, full_name, role)
        VALUES (
            NEW.id, 
            invitation_record.account_id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            invitation_record.role
        );

        -- Update invitation status
        UPDATE public.team_invitations 
        SET status = 'accepted' 
        WHERE id = invitation_record.id;
    ELSE
        -- Create new account for non-invited user
        INSERT INTO public.accounts (name, subscription_status)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
            'trialing'
        )
        RETURNING id INTO new_account_id;

        -- Create admin profile linked to new account
        INSERT INTO public.profiles (id, account_id, full_name, role)
        VALUES (
            NEW.id, 
            new_account_id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            'admin'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- FILE: 20240219_add_profile_columns.sql

-- Migration: Add missing profile columns and notification preferences
-- Date: 2024-02-19

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- Update full_name check trigger if needed, but usually we handle this in app logic


-- FILE: 20240220_create_widgets.sql

-- Create widgets table
CREATE TABLE IF NOT EXISTS public.widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'WhatsApp Widget',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{
        "phone": "",
        "message": "Hello, I am interested in your services.",
        "button_text": "Chat with us",
        "position": "bottom-right",
        "color": "#25D366",
        "bubble_text": "Need help?"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id) -- One widget per account for now
);

-- Enable Row Level Security
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own widgets" ON public.widgets
    FOR SELECT USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own widgets" ON public.widgets
    FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own widgets" ON public.widgets
    FOR UPDATE USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own widgets" ON public.widgets
    FOR DELETE USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

-- Public can view widgets by ID (for the script)
CREATE POLICY "Public can view active widgets by ID" ON public.widgets
    FOR SELECT USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_widgets_updated_at
BEFORE UPDATE ON public.widgets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- FILE: 20240221_feature_updates.sql

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


-- FILE: 20240222_security_hardening.sql

-- 1. Leads Table Hardening: Add Unique Constraint for account_id and email
-- This prevents duplicate leads for the same email within the same account
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_account_id_email_key') THEN
        ALTER TABLE public.leads ADD CONSTRAINT leads_account_id_email_key UNIQUE (account_id, email);
    END IF;
END $$;

-- 2. Ensure RLS is enabled for all critical tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for LEADS (Account Isolation)
DROP POLICY IF EXISTS "Leads: Account Isolation (Select)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Select)" ON public.leads
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Insert)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Insert)" ON public.leads
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Update)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Update)" ON public.leads
    FOR UPDATE USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Leads: Account Isolation (Delete)" ON public.leads;
CREATE POLICY "Leads: Account Isolation (Delete)" ON public.leads
    FOR DELETE USING (account_id = get_my_account_id());

-- 4. RLS Policies for CONVERSATIONS
DROP POLICY IF EXISTS "Conversations: Account Isolation (Select)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Select)" ON public.conversations
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Conversations: Account Isolation (Insert)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Insert)" ON public.conversations
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Conversations: Account Isolation (Update)" ON public.conversations;
CREATE POLICY "Conversations: Account Isolation (Update)" ON public.conversations
    FOR UPDATE USING (account_id = get_my_account_id());

-- 5. RLS Policies for MESSAGES (Inherited via Conversation)
-- Messages don't have account_id directly, we check through conversation
DROP POLICY IF EXISTS "Messages: Conversation Isolation (Select)" ON public.messages;
CREATE POLICY "Messages: Conversation Isolation (Select)" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.account_id = get_my_account_id()
        )
    );

DROP POLICY IF EXISTS "Messages: Conversation Isolation (Insert)" ON public.messages;
CREATE POLICY "Messages: Conversation Isolation (Insert)" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.account_id = get_my_account_id()
        )
    );

-- 6. RLS Policies for MEETINGS
DROP POLICY IF EXISTS "Meetings: Account Isolation (Select)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Select)" ON public.meetings
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Insert)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Insert)" ON public.meetings
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Update)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Update)" ON public.meetings
    FOR UPDATE USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Meetings: Account Isolation (Delete)" ON public.meetings;
CREATE POLICY "Meetings: Account Isolation (Delete)" ON public.meetings
    FOR DELETE USING (account_id = get_my_account_id());

-- 7. RLS Policies for INTEGRATIONS
DROP POLICY IF EXISTS "Integrations: Account Isolation (Select)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Select)" ON public.integrations
    FOR SELECT USING (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Integrations: Account Isolation (Insert)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Insert)" ON public.integrations
    FOR INSERT WITH CHECK (account_id = get_my_account_id());

DROP POLICY IF EXISTS "Integrations: Account Isolation (Update)" ON public.integrations;
CREATE POLICY "Integrations: Account Isolation (Update)" ON public.integrations
    FOR UPDATE USING (account_id = get_my_account_id());

-- 8. Storage RLS (Basic Auth Check for avatar bucket)
-- Note: Assuming storage setup via SQL is supported or just documenting the policy
-- Most Supabase Storage policies are handled in the storage schema
CREATE POLICY "Users can only upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar visibility is public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profiles');


-- FILE: 20240224_add_sequence_metrics.sql

-- Add metrics column to sequences table
ALTER TABLE public.sequences 
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{
  "enrolled": 0,
  "active": 0,
  "completed": 0,
  "email": {
    "sent": 0,
    "opened": 0,
    "replied": 0
  },
  "whatsapp": {
    "sent": 0,
    "opened": 0,
    "replied": 0
  }
}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.sequences.metrics IS 'Aggregated analytics for the sequence enrollment and message performance.';


-- FILE: 20240225_add_social_channels.sql

-- Update the check constraint on conversations table for channel
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'email', 'widget', 'instagram', 'tiktok'));

-- Comment for clarity
COMMENT ON COLUMN public.conversations.channel IS 'Communication channel used for this conversation. Added instagram and tiktok.';


-- FILE: 20240226_support_tickets.sql

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_admin_reply BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets Policies
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Users can insert their own tickets
CREATE POLICY "Users can insert their own tickets"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update tickets (status, etc)
CREATE POLICY "Admins can update tickets"
ON public.tickets FOR UPDATE
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Ticket Messages Policies
-- Users can view messages for their tickets
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND (tickets.user_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    )
);

-- Users can insert messages for their tickets
CREATE POLICY "Users can insert messages to their own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_id
        AND tickets.user_id = auth.uid()
    ) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Create simple trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- FILE: 20240227_b2b_database.sql

-- Migration: Create B2B Database tables and structure
-- Date: 2024-02-27

-- 1. Add credits to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS b2b_credits INTEGER DEFAULT 150;

-- 2. Create b2b_companies table
CREATE TABLE IF NOT EXISTS public.b2b_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    logo_url TEXT,
    description TEXT,
    hq_location TEXT,
    industry TEXT,
    size TEXT, -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'
    company_type TEXT,
    keywords TEXT[],
    founded_year INTEGER,
    technologies TEXT[],
    funding_amount TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search indexing
CREATE INDEX IF NOT EXISTS b2b_companies_name_idx ON public.b2b_companies (name);
CREATE INDEX IF NOT EXISTS b2b_companies_industry_idx ON public.b2b_companies (industry);

-- 3. Create b2b_unlocked_leads table
CREATE TABLE IF NOT EXISTS public.b2b_unlocked_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- RLS for b2b_companies (everyone can read for searching, but full details might be hidden in API layer until unlocked)
ALTER TABLE public.b2b_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can search b2b_companies" ON public.b2b_companies
    FOR SELECT USING (true);

-- Admin can manage b2b_companies
CREATE POLICY "Admins can manage b2b_companies" ON public.b2b_companies
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- RLS for b2b_unlocked_leads
ALTER TABLE public.b2b_unlocked_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can View their own unlocked leads" ON public.b2b_unlocked_leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked leads" ON public.b2b_unlocked_leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert dummy seed data for testing if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.b2b_companies) THEN
        INSERT INTO public.b2b_companies 
        (name, domain, description, hq_location, industry, size, company_type, keywords, founded_year, technologies, funding_amount)
        VALUES 
        ('Acme Corp', 'acme.com', 'Leading manufacturer of road runner traps.', 'New York, USA', 'Manufacturing', '51-200', 'Private', ARRAY['hardware', 'b2b'], 1990, ARRAY['react', 'node'], '$10M'),
        ('TechNova', 'technova.io', 'Innovative cloud solutions for startups.', 'San Francisco, USA', 'Technology', '11-50', 'Startup', ARRAY['saas', 'cloud', 'ai'], 2021, ARRAY['aws', 'python'], '$2M'),
        ('Global Finance', 'globalfinance.net', 'Investment banking and asset management.', 'London, UK', 'Finance', '1001-5000', 'Public', ARRAY['finance', 'banking'], 1950, ARRAY['java', 'oracle'], '$1B'),
        ('EcoEnergy', 'ecoenergy.org', 'Renewable energy research and development.', 'Berlin, Germany', 'Energy', '201-500', 'Private', ARRAY['green', 'solar'], 2010, ARRAY['go', 'postgres'], '$50M'),
        ('HealthPlus', 'healthplus.com', 'Digital healthcare platform.', 'Toronto, Canada', 'Healthcare', '51-200', 'Private', ARRAY['healthtech', 'telemedicine'], 2015, ARRAY['react native', 'graphql'], '$15M'),
        ('EduSmart', 'edusmart.edu', 'EdTech solutions for higher education.', 'Boston, USA', 'Education', '11-50', 'Startup', ARRAY['edtech', 'learning'], 2018, ARRAY['vue', 'elixir'], '$5M'),
        ('RetailGiant', 'retailgiant.com', 'Global retail chain.', 'Chicago, USA', 'Retail', '10001+', 'Public', ARRAY['ecommerce', 'logistics'], 1980, ARRAY['c#', 'azure'], '$5B'),
        ('AgriTech Solutions', 'agritech.co', 'Smart farming technologies.', 'Amsterdam, Netherlands', 'Agriculture', '51-200', 'Private', ARRAY['agritech', 'iot'], 2012, ARRAY['python', 'mqtt'], '$12M'),
        ('LogiCorp', 'logicorp.net', 'International logistics and shipping.', 'Singapore', 'Logistics', '501-1000', 'Private', ARRAY['shipping', 'supply chain'], 2000, ARRAY['java', 'spring'], '$100M'),
        ('MediaStream', 'mediastream.tv', 'Next-gen streaming services.', 'Los Angeles, USA', 'Media', '201-500', 'Public', ARRAY['streaming', 'video'], 2016, ARRAY['ruby on rails', 'aws'], '$80M');
    END IF;
END $$;


-- FILE: 20240228_lead_groups.sql

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


-- FILE: 20240301_lead_folders.sql

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


-- FILE: 20240314000000_add_is_ai_active.sql

ALTER TABLE conversations ADD COLUMN is_ai_active BOOLEAN DEFAULT TRUE;


-- FILE: 20240318_create_event_logs.sql

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


-- FILE: 20240322_support_tickets_fix.sql

-- Support Tickets Role Consistency Fix
-- Ensure admins can view all tickets regardless of tenant isolation

-- Add policy for platform admins to view all profiles (used by joins)
DROP POLICY IF EXISTS "Platform Admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (id = auth.uid()) -- Own profile
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- Admin access
    OR (auth.jwt() ->> 'email' = 'admin@admin.com') -- Special admin access
);

-- Update tickets policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (
    auth.uid() = user_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR (auth.jwt() ->> 'email' = 'admin@admin.com')
);

-- Update ticket messages (admin can view everything)
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);

-- Update insert policies for admin replies
DROP POLICY IF EXISTS "Users can insert messages to their own tickets" ON public.ticket_messages;
CREATE POLICY "Users can insert messages to their own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);


-- FILE: 20240323_create_error_logs.sql

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


-- FILE: 20240324_fix_infinite_recursion.sql

-- Fix Infinite Recursion introduced in the previous support tickets migration

-- 1. Create a SECURITY DEFINER function to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Platform Admins can view all profiles" ON public.profiles;

-- 3. Recreate the policy using the non-recursive helper function
CREATE POLICY "Platform Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (id = auth.uid()) 
    OR (public.get_my_role() = 'admin') 
    OR (auth.jwt() ->> 'email' = 'admin@admin.com')
);

-- 4. Update the tickets policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (
    auth.uid() = user_id 
    OR (public.get_my_role() = 'admin')
    OR (auth.jwt() ->> 'email' = 'admin@admin.com')
);

-- 5. Update the ticket_messages select policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (public.get_my_role() = 'admin')
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);

-- 6. Update the ticket_messages insert policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can insert messages to their own tickets" ON public.ticket_messages;
CREATE POLICY "Users can insert messages to their own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (public.get_my_role() = 'admin')
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);


-- FILE: 20240325_add_is_read_to_support.sql

-- Add is_read column to ticket_messages to track read status of admin replies
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Update existing messages: assume everything in the past is read to avoid mass notifications
UPDATE public.ticket_messages SET is_read = TRUE WHERE is_admin_reply = TRUE AND is_read = FALSE;

-- RLS should already cover this table, but ensure users can update their own messages' read status
-- Actually, the user needs to update messages where is_admin_reply = TRUE for their OWN tickets.
CREATE POLICY "Users can mark admin replies as read"
ON public.ticket_messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
);


-- FILE: 20240406_cascading_deletes.sql

-- Faz 4: Data Retention ve Cascading Deletes (Veri Tutma ve Kademeli Silme PolitikalarÄ±)
-- Bu migrasyon, bir ana kayÄ±t (Account veya Lead) silindiÄŸinde iliÅŸkili tÃ¼m alt verilerin 
-- otomatik ve temiz bir ÅŸekilde silinmesini saÄŸlar.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. ACCOUNTS silindiÄŸinde silinecekler
    -- Profiles
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_account_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_id_fkey;
    END IF;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Leads
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leads_account_id_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_account_id_fkey;
    END IF;
    ALTER TABLE public.leads ADD CONSTRAINT leads_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Integrations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrations_account_id_fkey') THEN
        ALTER TABLE public.integrations DROP CONSTRAINT integrations_account_id_fkey;
    END IF;
    ALTER TABLE public.integrations ADD CONSTRAINT integrations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequences_account_id_fkey') THEN
        ALTER TABLE public.sequences DROP CONSTRAINT sequences_account_id_fkey;
    END IF;
    ALTER TABLE public.sequences ADD CONSTRAINT sequences_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences Enrollments (Account ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_account_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_account_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Webhooks
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhooks_account_id_fkey') THEN
        ALTER TABLE public.webhooks DROP CONSTRAINT webhooks_account_id_fkey;
    END IF;
    ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Event Logs
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_logs_account_id_fkey') THEN
        ALTER TABLE public.event_logs DROP CONSTRAINT event_logs_account_id_fkey;
    END IF;
    ALTER TABLE public.event_logs ADD CONSTRAINT event_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


    -- 2. LEADS silindiÄŸinde silinecekler
    -- Conversations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_lead_id_fkey') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT conversations_lead_id_fkey;
    END IF;
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Meetings
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meetings_lead_id_fkey') THEN
        ALTER TABLE public.meetings DROP CONSTRAINT meetings_lead_id_fkey;
    END IF;
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Sequence Enrollments (Lead ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_lead_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_lead_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


    -- 3. CONVERSATIONS silindiÄŸinde silinecekler
    -- Messages
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_conversation_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_conversation_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

    -- 4. WEBHOOKS silindiÄŸinde silinecekler
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhook_logs_webhook_id_fkey') THEN
        ALTER TABLE public.webhook_logs DROP CONSTRAINT webhook_logs_webhook_id_fkey;
    END IF;
    ALTER TABLE public.webhook_logs ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;

END $$;

-- Rapor: Bu politikalar sayesinde 'supabase.from('leads').delete().eq('id', ...)' komutu Ã§alÄ±ÅŸtÄ±rÄ±ldÄ±ÄŸÄ±nda
-- lead'e ait tÃ¼m konuÅŸmalar, mesajlar ve otomasyon kayÄ±tlarÄ± otomatik olarak temizlenecektir.


-- FILE: 20240406_storage_rls.sql

-- Phase 3: Supabase Storage Security Hardening
-- This migration ensures that storage buckets are protected by RLS and strictly isolated.

-- 1. Ensure buckets exist
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('chatbot', 'chatbot', true)
on conflict (id) do update set public = true;

-- 2. Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- 3. PROFILES BUCKET POLICIES

-- Allow public read access to avatars
create policy "Public Access to Avatars"
on storage.objects for select
using ( bucket_id = 'profiles' );

-- Allow users to upload their own avatar
-- Path format: avatars/{user_id}-{random}.ext
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);


-- 4. CHATBOT BUCKET POLICIES (Admin Only)

-- Allow public read access to chatbot assets
create policy "Public Access to Chatbot Assets"
on storage.objects for select
using ( bucket_id = 'chatbot' );

-- Allow admins to upload chatbot assets
-- Path format: {account_id}/logos/{filename}
create policy "Admins can upload chatbot assets"
on storage.objects for insert
with check (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);

-- Allow admins to delete chatbot assets
create policy "Admins can delete chatbot assets"
on storage.objects for delete
using (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);


-- FILE: 20250502000000_add_ai_training_wizard.sql

-- Add AI Training Setup Wizard columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_wizard_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS setup_wizard_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN accounts.setup_wizard_completed IS 'Whether the AI training setup wizard has been completed';
COMMENT ON COLUMN accounts.setup_wizard_step IS 'Current step (1-6) of the AI training setup wizard';
COMMENT ON COLUMN accounts.setup_wizard_data IS 'Temporary storage for wizard data during setup process';


-- FILE: 20260226_paddle_migration.sql

-- Rename Stripe columns to Paddle columns
ALTER TABLE public.accounts
RENAME COLUMN stripe_customer_id TO paddle_customer_id;

ALTER TABLE public.accounts
RENAME COLUMN stripe_subscription_id TO paddle_subscription_id;


-- FILE: 20260319_performance_indexes.sql

-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- 1. Profiles Table
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- 2. Leads Table
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- 3. Conversations Table
CREATE INDEX IF NOT EXISTS idx_conversations_account_id ON public.conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 4. Messages Table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

-- 5. Meetings Table
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 6. Integrations Table
CREATE INDEX IF NOT EXISTS idx_integrations_account_id ON public.integrations(account_id);


-- FILE: 20260329_additional_performance_indexes.sql

-- ============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- Tarih: 2026-03-29
-- ============================================

-- 1. Leads Table - Composite indexes for common query patterns
-- getLeads() sorgusunda account_id + ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_leads_account_created
    ON public.leads(account_id, created_at DESC);

-- Grup bazlÄ± filtreleme (LeadsClient filteredLeads)
CREATE INDEX IF NOT EXISTS idx_leads_group_id
    ON public.leads(group_id);

-- Status bazlÄ± filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_status
    ON public.leads(account_id, status);

-- Source bazlÄ± filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source);

-- 2. Lead Groups Table
-- getLeadGroups() sorgusunda account_id + folder_id
CREATE INDEX IF NOT EXISTS idx_lead_groups_account_folder
    ON public.lead_groups(account_id, folder_id);

-- 3. Lead Folders Table
CREATE INDEX IF NOT EXISTS idx_lead_folders_account
    ON public.lead_folders(account_id, created_at DESC);

-- 4. Meetings Table - Cron job sorgusu (yaklaÅŸan toplantÄ±lar)
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_status
    ON public.meetings(scheduled_at, status)
    WHERE status = 'scheduled';

-- 5. Conversations Table - Cron job sorgusu (eski konuÅŸmalar)
CREATE INDEX IF NOT EXISTS idx_conversations_status_last_msg
    ON public.conversations(status, last_message_at DESC)
    WHERE status = 'open';

-- 6. Sequence Enrollments - Lead enrollment sorgularÄ±nda
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead_account
    ON public.sequence_enrollments(lead_id, account_id);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status
    ON public.sequence_enrollments(status)
    WHERE status = 'active';



-- FILE: 20260329_chatbot_widgets.sql

-- Web AI Chatbot Widget table
-- One widget per account but can be embedded on unlimited websites via the same script ID

CREATE TABLE IF NOT EXISTS chatbot_widgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name        VARCHAR NOT NULL DEFAULT 'Web Chatbot',
    is_active   BOOLEAN DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{
        "color": "#7c3aed",
        "position": "bottom-right",
        "greeting": "Hi! I''m your AI assistant. How can I help you today?",
        "collect_email": true,
        "collect_phone": false,
        "bot_name": "AI Assistant",
        "bot_avatar": null,
        "placeholder": "Type your message...",
        "form_title": "Start a conversation"
    }',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE chatbot_widgets ENABLE ROW LEVEL SECURITY;

-- Accounts can only access their own widget
CREATE POLICY "accounts_own_chatbot_widget" ON chatbot_widgets
    FOR ALL USING (account_id = (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- Public read (for the embeddable script CORS requests)
CREATE POLICY "public_read_active_chatbot_widget" ON chatbot_widgets
    FOR SELECT USING (is_active = true);

-- Index
CREATE INDEX IF NOT EXISTS idx_chatbot_widgets_account_id ON chatbot_widgets(account_id);


-- FILE: 20260330_add_metadata_to_conversations.sql

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


-- FILE: 20260330_add_web_chatbot_channel.sql


-- Update the check constraint on conversations table for channel to include web_chatbot
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'email', 'widget', 'instagram', 'tiktok', 'web_chatbot'));

-- Also update the leads source check if it exists (Optional step if it fails just ignore)
DO $$ 
BEGIN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
    ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
    CHECK (source IN ('whatsapp', 'email', 'widget', 'manual', 'import', 'api', 'web_chatbot'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;


-- FILE: 20260404_add_sequence_reporting.sql

-- Migration: Add Sequence Reporting Table and Settings Config
-- Date: 2026-04-04

-- 1. Create sequence_events table
CREATE TABLE IF NOT EXISTS sequence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'sent' | 'opened' | 'clicked' | 'replied' | 'failed' | 'unsubscribed'
    channel TEXT NOT NULL,    -- 'email' | 'whatsapp'
    step_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect against existing RLS policy if running idempotently
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sequence_events' AND policyname = 'Tenant isolation for sequence_events'
    ) THEN
        ALTER TABLE sequence_events ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Tenant isolation for sequence_events" ON sequence_events
          USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- Drop and recreate indexes
DROP INDEX IF EXISTS idx_sequence_events_account_time;
DROP INDEX IF EXISTS idx_sequence_events_sequence;
CREATE INDEX idx_sequence_events_account_time ON sequence_events(account_id, created_at DESC);
CREATE INDEX idx_sequence_events_sequence ON sequence_events(sequence_id);

-- 2. Add sequence_settings to accounts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'sequence_settings'
    ) THEN
        ALTER TABLE accounts ADD COLUMN sequence_settings JSONB DEFAULT '{
            "dailyEmailLimit": 200,
            "dailyWhatsappLimit": 100,
            "blackoutStartHour": 22,
            "blackoutEndHour": 8,
            "blackoutAction": "delay",
            "defaultTimezone": "Europe/Istanbul",
            "respectUnsubscribes": true
        }'::jsonb;
    END IF;
END $$;


-- FILE: 20260404_blog_translations.sql

-- Blog Ã§evirileri iÃ§in tablo ekleme
CREATE TABLE IF NOT EXISTS public.post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL, -- 'en', 'tr', 'de', vb.
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, language),
    UNIQUE(slug, language)
);

-- RLS (Row Level Security) EtkinleÅŸtirme
ALTER TABLE public.post_translations ENABLE ROW LEVEL SECURITY;

-- Politikalar: Herkes okuyabilir (Blog makaleleri halka aÃ§Ä±ktÄ±r)
CREATE POLICY "Allow public read for post translations"
ON public.post_translations
FOR SELECT
USING (true);

-- Politikalar: Sadece adminler ve yetkili profiller ekleyebilir/dÃ¼zenleyebilir
CREATE POLICY "Allow admin to manage post translations"
ON public.post_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at tetikleyicisi ekleyelim
CREATE TRIGGER update_post_translations_updated_at
BEFORE UPDATE ON public.post_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- FILE: 20260405_add_blog_posts_columns.sql

-- Migration: Add missing columns to posts table for blog system
-- Task: 1.1 Create blog_posts table with all required columns
-- Requirement: 10.1
-- Note: The posts table already exists. This migration adds 6 missing columns.

-- Add missing columns to existing posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add indexes for query performance (as specified in design document)
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.posts(author_id);

-- Add comment to document the table purpose
COMMENT ON TABLE public.posts IS 'Blog posts table with multi-language support. Source content is in English, translations stored in post_translations table.';
COMMENT ON COLUMN public.posts.featured_image_url IS 'URL of the featured/hero image for SEO and blog cards (og:image)';
COMMENT ON COLUMN public.posts.seo_title IS 'Custom meta title for SEO (50-60 characters optimal). Falls back to title if not set.';
COMMENT ON COLUMN public.posts.seo_description IS 'Custom meta description for SEO (150-160 characters optimal). Falls back to excerpt if not set.';
COMMENT ON COLUMN public.posts.seo_keywords IS 'Array of keywords for SEO analysis and optimization';
COMMENT ON COLUMN public.posts.reading_time_minutes IS 'Estimated reading time based on word count (200-250 words/minute)';
COMMENT ON COLUMN public.posts.view_count IS 'Cached count of total page views, aggregated from blog_analytics table';


-- FILE: 20260406_add_seo_columns_to_post_translations.sql

-- Add missing SEO columns to post_translations table
-- Task 1.2: Create blog_post_translations table (modified to add columns to existing table)
-- Requirement 10.2: Blog post translations table with SEO fields

-- Add translated_seo_title column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_title TEXT;

-- Add translated_seo_description column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.post_translations.translated_seo_title IS 'Translated SEO meta title for search engines (50-60 characters recommended)';
COMMENT ON COLUMN public.post_translations.translated_seo_description IS 'Translated SEO meta description for search engines (150-160 characters recommended)';


-- FILE: 20260407_create_blog_categories.sql

-- Migration: Create blog_categories and blog_category_translations tables
-- Task: 1.3 Create blog_categories and blog_category_translations tables
-- Requirement: 10.3
-- Date: 2026-04-07

-- ============================================================================
-- Table: blog_categories
-- ============================================================================
-- Stores blog post categories with English as the source language
-- Translations are stored in blog_category_translations table

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for slug lookups (used in category filtering)
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Add comments for documentation
COMMENT ON TABLE public.blog_categories IS 'Blog post categories. Source content is in English, translations stored in blog_category_translations table.';
COMMENT ON COLUMN public.blog_categories.slug IS 'URL-safe unique identifier for the category (e.g., "marketing", "sales")';
COMMENT ON COLUMN public.blog_categories.name IS 'Category name in English (source language)';
COMMENT ON COLUMN public.blog_categories.description IS 'Optional category description in English';

-- ============================================================================
-- Table: blog_category_translations
-- ============================================================================
-- Stores translated category names and descriptions for all active locales

CREATE TABLE IF NOT EXISTS public.blog_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  UNIQUE(category_id, locale)
);

-- Add index for efficient translation lookups
CREATE INDEX IF NOT EXISTS idx_blog_category_translations_category_locale 
  ON public.blog_category_translations(category_id, locale);

-- Add comments for documentation
COMMENT ON TABLE public.blog_category_translations IS 'Translated category names and descriptions for all supported locales (tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN public.blog_category_translations.locale IS 'Locale code (e.g., "tr", "de", "ar"). Must match locales defined in src/config/locales.ts';
COMMENT ON COLUMN public.blog_category_translations.translated_name IS 'Category name translated into the target locale';
COMMENT ON COLUMN public.blog_category_translations.translated_description IS 'Optional category description translated into the target locale';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;

-- Public read access (categories are public information)
CREATE POLICY "Allow public read for blog categories"
ON public.blog_categories
FOR SELECT
USING (true);

CREATE POLICY "Allow public read for blog category translations"
ON public.blog_category_translations
FOR SELECT
USING (true);

-- Admin write access (only super admins can manage categories)
CREATE POLICY "Allow admin to manage blog categories"
ON public.blog_categories
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

CREATE POLICY "Allow admin to manage blog category translations"
ON public.blog_category_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample categories
INSERT INTO public.blog_categories (slug, name, description) VALUES
  ('marketing', 'Marketing', 'Marketing strategies and best practices'),
  ('sales', 'Sales', 'Sales techniques and lead generation'),
  ('automation', 'Automation', 'Business process automation and AI'),
  ('product-updates', 'Product Updates', 'Latest features and improvements')
ON CONFLICT (slug) DO NOTHING;

-- Note: Translations will be added by the Gemini translation service
-- when categories are synced from Google Sheets or created via the admin UI


-- FILE: 20260408_create_blog_tags.sql

-- Migration: Create blog_tags and blog_tag_translations tables
-- Date: 2026-04-08
-- Description: Creates tables for blog tags with multi-language support

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- Add comment to table
COMMENT ON TABLE blog_tags IS 'Stores blog tags (English names as source)';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly unique identifier for the tag';
COMMENT ON COLUMN blog_tags.name IS 'English name of the tag';

-- Create blog_tag_translations table
CREATE TABLE IF NOT EXISTS blog_tag_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  CONSTRAINT unique_tag_locale UNIQUE(tag_id, locale)
);

-- Create index on (tag_id, locale) for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tag_translations_tag_locale ON blog_tag_translations(tag_id, locale);

-- Add comments to table
COMMENT ON TABLE blog_tag_translations IS 'Stores translated tag names for all supported locales';
COMMENT ON COLUMN blog_tag_translations.tag_id IS 'Foreign key to blog_tags table';
COMMENT ON COLUMN blog_tag_translations.locale IS 'Locale code (e.g., tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN blog_tag_translations.translated_name IS 'Translated tag name for the locale';


-- FILE: 20260409_blog_system_queue_and_sync.sql

-- Migration: Blog System Queue and Sync Tracking
-- Date: 2026-04-09
-- Description: Adds translation queue, redirect management, and sync metadata.

-- 1. Add metadata column to posts table if missing
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create blog_translation_queue table
CREATE TABLE IF NOT EXISTS public.blog_translation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    target_locale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, target_locale)
);

-- 3. Create blog_redirects table (Requirement 4.23)
CREATE TABLE IF NOT EXISTS public.blog_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE, -- Usually global for blog, but keeping account_id for consistency
    old_slug TEXT NOT NULL,
    new_slug TEXT NOT NULL,
    locale TEXT NOT NULL,
    status_code INTEGER DEFAULT 301, -- 301 Permanent, 302 Temporary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(old_slug, locale)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_translation_queue_status ON public.blog_translation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_redirects_old_slug ON public.blog_redirects(old_slug, locale);

-- RLS Enforcement
ALTER TABLE public.blog_translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_redirects ENABLE ROW LEVEL SECURITY;

-- Policies for Translation Queue (Admin only)
CREATE POLICY "Allow admin to manage translation queue"
ON public.blog_translation_queue
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Policies for Redirects (Public read, Admin manage)
CREATE POLICY "Allow public read for redirects"
ON public.blog_redirects
FOR SELECT
USING (true);

CREATE POLICY "Allow admin to manage redirects"
ON public.blog_redirects
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at trigger for queue
CREATE TRIGGER update_blog_translation_queue_updated_at
BEFORE UPDATE ON public.blog_translation_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.blog_translation_queue IS 'Queue for background blog translations using Gemini';
COMMENT ON TABLE public.blog_redirects IS 'Handles 301/302 redirects for changed blog slugs to preserve SEO';


-- FILE: 20260409_create_blog_analytics.sql

-- Migration: Create blog_analytics table
-- Task: 1.6 Create blog_analytics table
-- Requirements: 10.9
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_analytics_post ON public.blog_analytics(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_locale ON public.blog_analytics(locale, created_at DESC);

COMMENT ON TABLE public.blog_analytics IS 'Tracks page views for blog posts per locale';
COMMENT ON COLUMN public.blog_analytics.post_id IS 'FK to posts table (ON DELETE CASCADE)';
COMMENT ON COLUMN public.blog_analytics.locale IS 'Locale of the visitor (e.g., en, tr, de)';
COMMENT ON COLUMN public.blog_analytics.referrer IS 'HTTP Referer header value';
COMMENT ON COLUMN public.blog_analytics.user_agent IS 'HTTP User-Agent header value';
COMMENT ON COLUMN public.blog_analytics.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, TR)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can record a view)
CREATE POLICY "Allow public insert for blog_analytics"
ON public.blog_analytics FOR INSERT WITH CHECK (true);

-- Admin read access only
CREATE POLICY "Allow admin to read blog_analytics"
ON public.blog_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);


-- FILE: 20260409_create_blog_junction_tables.sql

-- Migration: Create junction tables for blog post categories and tags
-- Task: 1.5 Create junction tables for categories and tags
-- Requirements: 10.5, 10.6
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_post_categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post ON public.blog_post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category ON public.blog_post_categories(category_id);

COMMENT ON TABLE public.blog_post_categories IS 'Junction table linking blog posts to categories (many-to-many)';

-- ============================================================================
-- Table: blog_post_tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags(tag_id);

COMMENT ON TABLE public.blog_post_tags IS 'Junction table linking blog posts to tags (many-to-many)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read for blog_post_categories"
ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY "Allow public read for blog_post_tags"
ON public.blog_post_tags FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Allow admin to manage blog_post_categories"
ON public.blog_post_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);

CREATE POLICY "Allow admin to manage blog_post_tags"
ON public.blog_post_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);


-- FILE: 20260409_fix_profiles_email.sql

-- Migration: Add email column to profiles table
-- Date: 2026-04-09
-- Description: Adds the email column to profiles table to support RLS policies and easier identification.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles from auth.users if possible
-- Note: This requires the migration to be run in an environment where auth schema is accessible
-- but even if it doesn't update, the app logic in profile-bootstrap.ts will handle it on next login.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND p.email IS NULL;
  END IF;
END $$;


-- FILE: 20260417_add_now_trigger_type.sql

-- Drop old check constraint and add 'now' as a valid trigger_type
ALTER TABLE public.sequences
  DROP CONSTRAINT IF EXISTS sequences_trigger_type_check;

ALTER TABLE public.sequences
  ADD CONSTRAINT sequences_trigger_type_check
    CHECK (trigger_type IN (
      'instant',
      'now',
      'no_response',
      'meeting_booked',
      'lead_created',
      'custom',
      'hubspot_lead',
      'salesforce_lead',
      'pipedrive_lead',
      'zoho_lead'
    ));


-- FILE: 20260418_critical_composite_indexes.sql

-- ============================================
-- KRÄ°TÄ°K COMPOSITE INDEX'LER
-- Tarih: 2026-04-18
-- ============================================

-- 1. Sequence Processor ana sorgusu
--    processPendingSteps: status=active + next_step_due_at <= now
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_processor
    ON public.sequence_enrollments(account_id, status, next_step_due_at)
    WHERE status = 'active';

-- 2. Conversations dashboard filtresi
--    getConversations: account_id + status
CREATE INDEX IF NOT EXISTS idx_conversations_account_status
    ON public.conversations(account_id, status);

-- 3. WhatsApp webhook duplicate check
--    messages.metadata JSONB Ã¼zerinde GIN index
--    (external_message_id sÃ¼tununa geÃ§iÅŸ yapÄ±lana kadar)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON public.messages USING GIN(metadata);

-- 4. B2B Full Text Search iÃ§in generated tsvector sÃ¼tunu
--    searchB2BCompanies ILIKE yerine FTS kullanacak
ALTER TABLE public.b2b_companies
    ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(hq_location, '') || ' ' ||
            coalesce(industry, '') || ' ' ||
            coalesce(company_type, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_b2b_fts
    ON public.b2b_companies USING GIN(fts);

-- 5. WhatsApp webhook iÃ§in dedicated sÃ¼tun
--    (GÃ¶rev 1.4 ile birlikte kullanÄ±lacak)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_message_id
    ON public.messages(external_message_id)
    WHERE external_message_id IS NOT NULL;


-- FILE: 20260420_missing_performance_indexes.sql

-- ============================================
-- EKSÄ°K PERFORMANCE INDEX'LER
-- Tarih: 2026-04-20
-- ============================================

-- 1. Sequence Events - processor'da NÃ—2 sorgu optimizasyonu iÃ§in
--    Her hesap iÃ§in event sayÄ±mÄ±: account_id + channel + event_type + created_at
CREATE INDEX IF NOT EXISTS idx_seq_events_account_channel_type
    ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- 2. Integrations - JSONB config alanÄ± iÃ§in GIN index
--    config->>'webhook_url', config->>'api_key' gibi sorgular iÃ§in
CREATE INDEX IF NOT EXISTS idx_integrations_config_gin
    ON public.integrations USING GIN(config);


-- FILE: 20260422_additional_performance_indexes.sql

-- ============================================
-- EK PERFORMANS INDEX'LERÄ°
-- Tarih: 2026-04-22
-- ============================================

-- 1. Leads tablosu - dashboard filtreleme ve sÄ±ralama
--    getLeads: account_id + status + created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
    ON public.leads(account_id, status, created_at DESC);

-- 2. Messages tablosu - konuÅŸma mesaj geÃ§miÅŸi
--    Mesaj geÃ§miÅŸi sorgularÄ±: conversation_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. Integrations tablosu - provider bazlÄ± lookup
--    getIntegrations: account_id + provider
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider
    ON public.integrations(account_id, provider);

-- 4. B2B unlocked leads - kullanÄ±cÄ± bazlÄ± hÄ±zlÄ± lookup
--    searchB2BCompanies parallel query iÃ§in
CREATE INDEX IF NOT EXISTS idx_b2b_unlocked_user
    ON public.b2b_unlocked_leads(user_id);

-- 5. Leads tablosu - source bazlÄ± filtreleme (B2B database leads)
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source)
    WHERE source IS NOT NULL;


-- FILE: 20260422_conversations_speed_indexes.sql

-- ============================================
-- CONVERSATIONS SPEED OPTIMIZATION INDEXES
-- Tarih: 2026-04-22
-- ============================================

-- 1. Ana conversations listesi sorgusu iÃ§in kritik composite index
--    getConversations: account_id filtresi + last_message_at sÄ±ralamasÄ±
--    Mevcut ayrÄ± index'ler yerine tek index ile index-only scan saÄŸlar
CREATE INDEX IF NOT EXISTS idx_conversations_account_lastmsg
    ON public.conversations(account_id, last_message_at DESC);

-- 2. Mesaj sayfalama iÃ§in kritik composite index
--    getMessages: conversation_id filtresi + created_at sÄ±ralamasÄ± + cursor pagination
--    Mevcut ayrÄ± index'ler yerine tek index ile Ã§ok daha hÄ±zlÄ± pagination saÄŸlar
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
    ON public.messages(conversation_id, created_at DESC);

-- 3. getUnreadConversationsCount iÃ§in optimize index
--    conversations join messages WHERE sender_type = 'lead'
--    Partial index: sadece lead mesajlarÄ±nÄ± kapsar, daha kÃ¼Ã§Ã¼k ve hÄ±zlÄ±
CREATE INDEX IF NOT EXISTS idx_messages_conv_lead_sender
    ON public.messages(conversation_id)
    WHERE sender_type = 'lead';


-- FILE: 20260423_add_lead_score_column.sql

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


-- FILE: 20260426_blog_agent_generation_mode.sql

-- Blog Agent: generation_mode and keyword rotation tracking

ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'combined',
    -- 'combined'    â†’ all keywords merged into one post per run
    -- 'per_keyword' â†’ one keyword per run, cycling in order
    ADD COLUMN IF NOT EXISTS last_keyword_index INT NOT NULL DEFAULT 0;
    -- tracks which keyword index was last used for per_keyword mode


-- FILE: 20260426_blog_agent_posts_per_run.sql

-- Blog Agent: how many posts to generate per scheduled run
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS posts_per_run INT NOT NULL DEFAULT 1;
-- max enforced in application layer (capped at 10)


-- FILE: 20260426_blog_agent_tables.sql

-- Blog Agent: keyword-driven AI content generation tables

CREATE TABLE IF NOT EXISTS blog_generation_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords    TEXT[]          NOT NULL DEFAULT '{}',
    tone        TEXT            NOT NULL DEFAULT 'informative',  -- informative | persuasive | casual
    length_words INT            NOT NULL DEFAULT 1200,
    target_locale TEXT          NOT NULL DEFAULT 'en',
    auto_publish BOOLEAN        NOT NULL DEFAULT false,
    schedule_type TEXT          NOT NULL DEFAULT 'manual',       -- manual | daily | weekly
    status      TEXT            NOT NULL DEFAULT 'active',       -- active | paused
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_generation_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES blog_generation_topics(id) ON DELETE CASCADE,
    post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending',             -- pending | processing | completed | failed
    generated_title TEXT,
    error_message   TEXT,
    triggered_by    TEXT NOT NULL DEFAULT 'cron',               -- cron | manual
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Track last-run time per topic so cron can respect schedule_type
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Index for queue processing (status + created_at lookup)
CREATE INDEX IF NOT EXISTS idx_blog_gen_queue_status
    ON blog_generation_queue (status, created_at);

-- Index for topic list ordering
CREATE INDEX IF NOT EXISTS idx_blog_gen_topics_created
    ON blog_generation_topics (created_at DESC);

-- RLS: super-admin only (service role bypasses RLS, so client-side calls need policies)
ALTER TABLE blog_generation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_generation_queue  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role to read/write
CREATE POLICY "admin_all_generation_topics" ON blog_generation_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_all_generation_queue" ON blog_generation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );


-- FILE: 20260426_gsc_auto_mode.sql

-- GSC Agent: auto-mode settings per connection
ALTER TABLE gsc_connections
    ADD COLUMN IF NOT EXISTS auto_mode       BOOLEAN NOT NULL DEFAULT false,
    -- When true: after each sync, top recommendations are auto-generated
    ADD COLUMN IF NOT EXISTS auto_publish    BOOLEAN NOT NULL DEFAULT false,
    -- When true: generated posts go live immediately (no draft)
    ADD COLUMN IF NOT EXISTS auto_min_score  INT     NOT NULL DEFAULT 60,
    -- Only process recommendations with priority_score >= this value
    ADD COLUMN IF NOT EXISTS auto_max_per_run INT    NOT NULL DEFAULT 3;
    -- Max posts to generate per sync run


-- FILE: 20260426_seo_optimization.sql

-- SEO Optimization System: GSC connections, raw data, recommendations

-- GSC OAuth connections (per super-admin, not per tenant)
CREATE TABLE IF NOT EXISTS gsc_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_url        TEXT NOT NULL,
    email           TEXT,
    access_token    TEXT,
    refresh_token   TEXT,
    expiry_date     BIGINT,
    status          TEXT NOT NULL DEFAULT 'connected', -- connected | disconnected | error
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw GSC search analytics data (rolling 90 days)
CREATE TABLE IF NOT EXISTS gsc_raw_data (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    page        TEXT,
    clicks      INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    ctr         FLOAT NOT NULL DEFAULT 0,
    position    FLOAT NOT NULL DEFAULT 0,
    date_range  TEXT NOT NULL DEFAULT '90d',
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_raw_query     ON gsc_raw_data (query);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_synced    ON gsc_raw_data (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_position  ON gsc_raw_data (position);

-- SEO recommendations derived from GSC analysis
CREATE TABLE IF NOT EXISTS gsc_recommendations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id    UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query            TEXT NOT NULL,
    category         TEXT NOT NULL,
    -- 'quick_win' | 'ctr_crisis' | 'content_gap' | 'decay' | 'cannibalization' | 'featured_snippet'
    intent           TEXT NOT NULL DEFAULT 'informational',
    -- 'informational' | 'commercial' | 'transactional' | 'navigational'
    priority_score   FLOAT NOT NULL DEFAULT 0,
    recommended_action TEXT NOT NULL,
    -- 'create' | 'update' | 'optimize_title' | 'merge' | 'add_snippet_format'
    matched_post_id  UUID REFERENCES posts(id) ON DELETE SET NULL,
    topic_id         UUID,  -- filled when accepted â†’ blog_generation_topics
    status           TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'accepted' | 'dismissed' | 'in_progress' | 'completed'
    -- Raw metrics
    impressions      INT NOT NULL DEFAULT 0,
    clicks           INT NOT NULL DEFAULT 0,
    ctr              FLOAT NOT NULL DEFAULT 0,
    position         FLOAT NOT NULL DEFAULT 0,
    -- Trend vs previous period (positive = improvement)
    impressions_trend FLOAT DEFAULT 0,
    clicks_trend      FLOAT DEFAULT 0,
    position_trend    FLOAT DEFAULT 0,
    synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_rec_status    ON gsc_recommendations (status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_rec_category  ON gsc_recommendations (category);

-- Posts table additions for SEO lifecycle tracking
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS content_type        TEXT DEFAULT 'standalone',
    -- 'pillar' | 'cluster' | 'standalone'
    ADD COLUMN IF NOT EXISTS pillar_post_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cluster_topic       TEXT,
    ADD COLUMN IF NOT EXISTS needs_update        BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS freshness_score     INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_seo_audit_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rank_at_30d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_60d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_90d         FLOAT;

-- RLS
ALTER TABLE gsc_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_raw_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gsc_connections" ON gsc_connections
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_raw_data" ON gsc_raw_data
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_recommendations" ON gsc_recommendations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));


-- FILE: 20260427_performance_indexes.sql

-- Performance indexes for rate-limiting and common query patterns
-- Run in Supabase SQL Editor or via supabase db push

-- sequence_events: used for daily/monthly send-rate limiting
-- Previously missing â€” causes full table scan on every sequence step
CREATE INDEX IF NOT EXISTS idx_sequence_events_account_channel_type_created
ON public.sequence_events(account_id, channel, event_type, created_at DESC);

-- leads: composite index for the most common dashboard query
-- (account_id filter + status filter + created_at sort)
CREATE INDEX IF NOT EXISTS idx_leads_account_status_created
ON public.leads(account_id, status, created_at DESC);

-- leads: fast email lookup (dedup check on widget capture)
CREATE INDEX IF NOT EXISTS idx_leads_account_email
ON public.leads(account_id, email);

-- conversations: partial index â€” active conversations only
-- speeds up follow-up cron and chatbot inbox
CREATE INDEX IF NOT EXISTS idx_conversations_active_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'active';

-- conversations: open status for follow-up job
CREATE INDEX IF NOT EXISTS idx_conversations_open_last_message
ON public.conversations(account_id, last_message_at DESC)
WHERE status = 'open';

-- messages: composite for per-conversation message history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC);

-- meetings: upcoming meeting lookups (reminder cron)
CREATE INDEX IF NOT EXISTS idx_meetings_account_scheduled
ON public.meetings(account_id, scheduled_at DESC)
WHERE status = 'scheduled';

-- integrations: provider lookup per account (used in every cron sync)
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider_status
ON public.integrations(account_id, provider, status);


-- FILE: 20260428_fix_conversation_bugs.sql

-- ============================================
-- CONVERSATION BUG FIXES
-- Tarih: 2026-04-28
-- ============================================

-- Fix 1: Add 'system' sender_type to messages CHECK constraint
-- TypeScript type + cron/webhook routes use 'system' but DB was rejecting it
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check
    CHECK (sender_type IN ('ai', 'lead', 'agent', 'system'));

-- Fix 2: RPC for correct unread conversations count
-- The previous JS query used INNER JOIN which counted message rows, not conversation rows.
-- This function uses EXISTS so each conversation is counted exactly once.
CREATE OR REPLACE FUNCTION get_unread_conversations_count(p_account_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::BIGINT
    FROM conversations c
    WHERE c.account_id = p_account_id
      AND c.status = 'active'
      AND EXISTS (
          SELECT 1 FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_type = 'lead'
      );
$$;


-- FILE: 20260430_leads_account_created_index.sql

-- Dedicated index for the leads list page query
-- getLeads() filters only by account_id (no status filter) + orders by created_at DESC
-- The existing idx_leads_account_status_created has status in the middle, which is
-- sub-optimal for queries that skip the status column entirely.
CREATE INDEX IF NOT EXISTS idx_leads_account_created
ON public.leads(account_id, created_at DESC);


-- FILE: 20260501_multi_gmail_integration.sql

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


-- FILE: 20260502_smtp_email_integration.sql

-- Workspace baÅŸÄ±na birden fazla 'email' (SMTP) hesabÄ±na izin ver (gmail gibi)
DROP INDEX IF EXISTS integrations_account_provider_non_gmail_idx;
CREATE UNIQUE INDEX integrations_account_provider_non_gmail_idx
    ON public.integrations (account_id, provider)
    WHERE provider != 'gmail' AND provider != 'email';

-- AynÄ± SMTP adresi aynÄ± hesaba iki kez eklenemez
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_email_smtp_idx
    ON public.integrations (account_id, (config->>'email'))
    WHERE provider = 'email' AND config->>'email' IS NOT NULL;

-- Hesap baÅŸÄ±na yalnÄ±zca bir birincil SMTP
CREATE UNIQUE INDEX IF NOT EXISTS integrations_account_primary_email_idx
    ON public.integrations (account_id)
    WHERE provider = 'email' AND is_primary = true;


-- FILE: 20260503150632_add_lead_language.sql

-- Add language column to leads table
ALTER TABLE public.leads 
ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN public.leads.language IS 'The language the lead prefers to communicate in (e.g., en, tr, de, es). Auto-detected on first message.';


-- FILE: 20260503_ai_persona_rules_feedback.sql

-- Migration: AI Persona, Rules, FAQ, Unanswered Questions Tracker, Message Feedback
-- These features extend the JSONB ai_config column (no schema changes needed there)
-- and rely on existing event_logs + messages.metadata columns.

-- 1. Ensure event_logs has an index on event_type for fast unanswered questions queries
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type_account
    ON event_logs (account_id, event_type, created_at DESC);

-- 2. Ensure messages.metadata is indexed for feedback queries (JSONB GIN index)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
    ON messages USING GIN (metadata jsonb_path_ops);

-- 3. Index for conversations.last_message_at (ghost lead detection)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_account
    ON conversations (account_id, last_message_at DESC)
    WHERE status = 'active';

-- 4. Ensure leads.metadata is indexed for ghost tagging queries
CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin
    ON leads USING GIN (metadata jsonb_path_ops);

-- Note: No new columns needed. All new data is stored in:
--   - accounts.ai_config (JSONB): persona_name, persona_intro, forbidden_topics,
--     mandatory_rules, faq_items
--   - event_logs: new event_type values 'ai.needs_human', 'ai.sentiment.negative',
--     'ai.feedback.positive'
--   - messages.metadata: feedback field ('positive'|'negative'), feedback_correction


-- FILE: 20260504_rpc_functions_and_indexes.sql

-- ============================================================================
-- MIGRATION: RPC Functions and Performance Indexes for New Features
-- Date: 2026-05-04
-- Description: Creates all RPC functions and missing indexes for:
--   - Super Admin analytics
--   - Sequence processor (atomic locking)
--   - Sequence analytics aggregation
--   - Lead scoring
--   - Multi-Gmail/SMTP integration support
--   - AI Persona & Feedback system
-- ============================================================================

-- ============================================================================
-- SECTION 1: RPC FUNCTIONS FOR SUPER ADMIN ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_super_admin_stats()
RETURNS TABLE (
    total_tenants BIGINT,
    active_subscriptions BIGINT,
    trial_tenants BIGINT,
    mrr_estimate NUMERIC,
    total_leads BIGINT,
    total_conversations BIGINT,
    total_meetings BIGINT,
    avg_leads_per_tenant NUMERIC,
    new_tenants_today BIGINT,
    new_tenants_this_week BIGINT,
    new_tenants_this_month BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    WITH tenant_stats AS (
        SELECT 
            a.id,
            a.subscription_status,
            a.plan_id,
            a.created_at,
            COUNT(l.id) as lead_count
        FROM accounts a
        LEFT JOIN leads l ON l.account_id = a.id
        GROUP BY a.id, a.subscription_status, a.plan_id, a.created_at
    )
    SELECT 
        COUNT(*)::BIGINT as total_tenants,
        COUNT(*) FILTER (WHERE subscription_status = 'active')::BIGINT as active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'trialing')::BIGINT as trial_tenants,
        SUM(
            CASE plan_id 
                WHEN 'starter' THEN 29 
                WHEN 'growth' THEN 79 
                WHEN 'pro' THEN 199 
                WHEN 'business' THEN 499 
                ELSE 0 
            END
        )::NUMERIC as mrr_estimate,
        COALESCE(SUM(lead_count), 0)::BIGINT as total_leads,
        (SELECT COUNT(*)::BIGINT FROM conversations) as total_conversations,
        (SELECT COUNT(*)::BIGINT FROM meetings) as total_meetings,
        COALESCE(AVG(lead_count), 0)::NUMERIC as avg_leads_per_tenant,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as new_tenants_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as new_tenants_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as new_tenants_this_month
    FROM tenant_stats;
$$;

COMMENT ON FUNCTION get_super_admin_stats() IS 'Returns aggregated platform metrics for Super Admin dashboard';

-- ============================================================================
-- SECTION 2: RPC FUNCTIONS FOR SEQUENCE PROCESSOR (ATOMIC LOCKING)
-- ============================================================================

CREATE OR REPLACE FUNCTION grab_pending_enrollments(batch_size_int INTEGER DEFAULT 50)
RETURNS TABLE (
    enrollment_id UUID,
    sequence_id UUID,
    lead_id UUID,
    account_id UUID,
    current_step_index INTEGER,
    retry_count INTEGER,
    next_step_due_at TIMESTAMPTZ,
    steps JSONB,
    trigger_type TEXT,
    sequence_name TEXT,
    lead JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lock_duration INTERVAL := '5 minutes';
BEGIN
    RETURN QUERY
    WITH grabbed AS (
        UPDATE sequence_enrollments se
        SET 
            next_step_due_at = NOW() + lock_duration,
            updated_at = NOW()
        WHERE se.id IN (
            SELECT se2.id
            FROM sequence_enrollments se2
            JOIN sequences s ON s.id = se2.sequence_id
            WHERE se2.status = 'active'
                AND se2.next_step_due_at <= NOW()
                AND s.is_active = true
            ORDER BY se2.next_step_due_at ASC
            LIMIT batch_size_int
            FOR UPDATE SKIP LOCKED
        )
        RETURNING 
            se.id as enrollment_id,
            se.sequence_id,
            se.lead_id,
            se.account_id,
            se.current_step_index,
            se.retry_count,
            se.next_step_due_at
    )
    SELECT 
        g.enrollment_id,
        g.sequence_id,
        g.lead_id,
        g.account_id,
        g.current_step_index,
        g.retry_count,
        g.next_step_due_at,
        s.steps,
        s.trigger_type,
        s.name as sequence_name,
        jsonb_build_object(
            'id', l.id,
            'first_name', l.first_name,
            'last_name', l.last_name,
            'email', l.email,
            'phone', l.phone,
            'metadata', l.metadata
        ) as lead
    FROM grabbed g
    JOIN sequences s ON s.id = g.sequence_id
    JOIN leads l ON l.id = g.lead_id;
END;
$$;

COMMENT ON FUNCTION grab_pending_enrollments(INTEGER) IS 'Atomically grabs and locks pending sequence enrollments for processing';


-- ============================================================================
-- SECTION 3: RPC FUNCTIONS FOR SEQUENCE ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sequence_metrics_batch(p_sequence_ids UUID[])
RETURNS TABLE (
    sequence_id UUID,
    channel TEXT,
    event_type TEXT,
    cnt BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        se.sequence_id,
        se.channel,
        se.event_type,
        COUNT(*)::BIGINT as cnt
    FROM sequence_events se
    WHERE se.sequence_id = ANY(p_sequence_ids)
    GROUP BY se.sequence_id, se.channel, se.event_type;
$$;

COMMENT ON FUNCTION get_sequence_metrics_batch(UUID[]) IS 'Returns aggregated event metrics for multiple sequences';

CREATE OR REPLACE FUNCTION get_sequence_enrollment_counts(p_sequence_ids UUID[])
RETURNS TABLE (
    sequence_id UUID,
    status TEXT,
    cnt BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        se.sequence_id,
        se.status,
        COUNT(*)::BIGINT as cnt
    FROM sequence_enrollments se
    WHERE se.sequence_id = ANY(p_sequence_ids)
    GROUP BY se.sequence_id, se.status;
$$;

COMMENT ON FUNCTION get_sequence_enrollment_counts(UUID[]) IS 'Returns enrollment counts grouped by status for sequences';

CREATE OR REPLACE FUNCTION get_global_sequence_metrics(p_account_id UUID)
RETURNS TABLE (
    total_enrolled BIGINT,
    total_active BIGINT,
    total_completed BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        COUNT(*)::BIGINT as total_enrolled,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT as total_active,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as total_completed
    FROM sequence_enrollments
    WHERE account_id = p_account_id;
$$;

COMMENT ON FUNCTION get_global_sequence_metrics(UUID) IS 'Returns global sequence metrics for an account';

CREATE OR REPLACE FUNCTION get_sequence_daily_stats(
    p_account_id UUID,
    p_days INTEGER DEFAULT 30,
    p_sequence_id UUID DEFAULT NULL
)
RETURNS TABLE (
    event_date TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    replied_count BIGINT,
    failed_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        DATE(created_at)::TEXT as event_date,
        COUNT(*) FILTER (WHERE event_type = 'sent')::BIGINT as sent_count,
        COUNT(*) FILTER (WHERE event_type = 'opened')::BIGINT as opened_count,
        COUNT(*) FILTER (WHERE event_type = 'replied')::BIGINT as replied_count,
        COUNT(*) FILTER (WHERE event_type = 'failed')::BIGINT as failed_count
    FROM sequence_events
    WHERE account_id = p_account_id
        AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        AND (p_sequence_id IS NULL OR sequence_id = p_sequence_id)
    GROUP BY DATE(created_at)
    ORDER BY event_date;
$$;

COMMENT ON FUNCTION get_sequence_daily_stats(UUID, INTEGER, UUID) IS 'Returns daily sequence event stats for analytics';


-- ============================================================================
-- SECTION 4: RPC FUNCTIONS FOR LEAD MANAGEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_account_lead_scores(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    WITH scored_leads AS (
        SELECT 
            l.id,
            CASE 
                WHEN m.message_count >= 10 THEN 100
                WHEN m.message_count >= 5 THEN 75
                WHEN m.message_count >= 2 THEN 50
                WHEN m.message_count >= 1 THEN 25
                ELSE 0
            END as calculated_score
        FROM leads l
        LEFT JOIN (
            SELECT 
                c.lead_id,
                COUNT(*) as message_count
            FROM conversations c
            JOIN messages m ON m.conversation_id = c.id
            WHERE c.account_id = p_account_id
                AND m.sender_type = 'lead'
            GROUP BY c.lead_id
        ) m ON m.lead_id = l.id
        WHERE l.account_id = p_account_id
    )
    UPDATE leads l
    SET 
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('score', s.calculated_score),
        updated_at = NOW()
    FROM scored_leads s
    WHERE l.id = s.id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION recalculate_account_lead_scores(UUID) IS 'Recalculates lead engagement scores for an account';

-- ============================================================================
-- SECTION 5: HELPER RPC FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Safely execute SQL for admin/maintenance operations';

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_account_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================================
-- SECTION 6: PERFORMANCE INDEXES FOR NEW FEATURES
-- ============================================================================

-- Multi-Gmail/SMTP Integration Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_account_provider_status 
    ON public.integrations(account_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_integrations_primary_lookup 
    ON public.integrations(account_id, provider, is_primary) 
    WHERE provider IN ('gmail', 'email');

-- Sequence Events Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_events_analytics 
    ON public.sequence_events(account_id, sequence_id, channel, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sequence_events_integration 
    ON public.sequence_events(integration_id) 
    WHERE integration_id IS NOT NULL;

-- Sequence Enrollments Performance Indexes
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead_sequence 
    ON public.sequence_enrollments(lead_id, sequence_id);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_integration 
    ON public.sequence_enrollments(integration_id) 
    WHERE integration_id IS NOT NULL;

-- Conversations Integration Support
CREATE INDEX IF NOT EXISTS idx_conversations_integration 
    ON public.conversations(integration_id) 
    WHERE integration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_channel 
    ON public.conversations(lead_id, channel);

-- Leads Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_preferred_integration 
    ON public.leads(preferred_integration_id) 
    WHERE preferred_integration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_source_created 
    ON public.leads(account_id, source, created_at DESC);

-- Messages Performance Indexes  
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
    ON public.messages(conversation_id, sender_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_external_id 
    ON public.messages(external_message_id) 
    WHERE external_message_id IS NOT NULL;

-- Event Logs for AI Persona & Feedback System
CREATE INDEX IF NOT EXISTS idx_event_logs_ai_feedback 
    ON public.event_logs(account_id, event_type, created_at DESC) 
    WHERE event_type LIKE 'ai.%';

-- GSC Connections Indexes
CREATE INDEX IF NOT EXISTS idx_gsc_connections_account 
    ON public.gsc_connections(account_id);

CREATE INDEX IF NOT EXISTS idx_gsc_connections_site 
    ON public.gsc_connections(site_url);

-- Blog Agent Generation Indexes
CREATE INDEX IF NOT EXISTS idx_blog_agent_runs_account 
    ON public.blog_agent_runs(account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_agent_schedules_account 
    ON public.blog_agent_schedules(account_id, is_active);

-- AI Jumpix Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_ai_jumpix_sessions_account 
    ON public.ai_jumpix_sessions(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_jumpix_sessions_user 
    ON public.ai_jumpix_sessions(user_id, created_at DESC);



-- FILE: 20260505_social_media_agent.sql

-- ============================================================
-- Social Media Marketing Agent
-- ============================================================

-- BaÄŸlÄ± sosyal medya hesaplarÄ±
CREATE TABLE social_media_accounts (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform         TEXT NOT NULL CHECK (platform IN ('twitter','reddit','linkedin','instagram','facebook','tiktok','bluesky')),
    account_name     TEXT NOT NULL,
    platform_user_id TEXT,
    credentials      JSONB NOT NULL DEFAULT '{}',
    is_active        BOOLEAN DEFAULT true,
    last_used_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(platform)
);

-- Kanal bazÄ±nda pazarlama ayarlarÄ±
CREATE TABLE social_media_channel_settings (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform             TEXT NOT NULL UNIQUE,
    daily_post_limit     INTEGER DEFAULT 3,
    posts_per_run        INTEGER DEFAULT 1,
    min_hours_between    INTEGER DEFAULT 4,
    mix_educational      INTEGER DEFAULT 40,
    mix_industry         INTEGER DEFAULT 25,
    mix_engagement       INTEGER DEFAULT 15,
    mix_social_proof     INTEGER DEFAULT 10,
    mix_promotional      INTEGER DEFAULT 10,
    active_hours_start   INTEGER DEFAULT 9,
    active_hours_end     INTEGER DEFAULT 21,
    active_days          INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    timezone             TEXT DEFAULT 'Europe/Istanbul',
    platform_config      JSONB DEFAULT '{}',
    is_active            BOOLEAN DEFAULT true,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- VarsayÄ±lan kanal ayarlarÄ±
INSERT INTO social_media_channel_settings
    (platform, daily_post_limit, posts_per_run, min_hours_between,
     mix_educational, mix_industry, mix_engagement, mix_social_proof, mix_promotional,
     active_hours_start, active_hours_end, platform_config)
VALUES
    ('twitter', 5, 1, 3,  40, 25, 15, 10, 10, 9, 22,
     '{"use_threads":true,"max_hashtags":3,"utm_campaign":"twitter_organic"}'),
    ('reddit',  2, 1, 8,  50, 20, 20,  5,  5, 9, 21,
     '{"default_subreddits":["saas","entrepreneur","startups"],"post_type":"text","value_first":true,"subreddit_rotation":true}');

-- Pazarlama kampanyalarÄ±
CREATE TABLE social_media_campaigns (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name               TEXT NOT NULL,
    marketing_goal     TEXT NOT NULL CHECK (marketing_goal IN (
                           'brand_awareness','lead_generation','thought_leadership',
                           'community_building','product_education','problem_awareness'
                       )),
    target_audience    TEXT,
    campaign_mode      TEXT DEFAULT 'context_feed' CHECK (campaign_mode IN ('context_feed','topic_based','mixed')),
    topics             TEXT[] DEFAULT '{}',
    target_platforms   TEXT[] NOT NULL,
    platform_overrides JSONB DEFAULT '{}',
    tone               TEXT DEFAULT 'professional' CHECK (tone IN ('professional','casual','engaging','educational','bold')),
    brand_context      TEXT,
    avoid_topics       TEXT[] DEFAULT '{}',
    cta_url            TEXT,
    utm_params         JSONB DEFAULT '{}',
    schedule_type      TEXT DEFAULT 'daily' CHECK (schedule_type IN ('manual','hourly','daily','weekly')),
    status             TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
    last_run_at        TIMESTAMPTZ,
    last_angle_index   INTEGER DEFAULT 0,
    total_generated    INTEGER DEFAULT 0,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Ä°Ã§erik kÃ¼tÃ¼phanesi
CREATE TABLE social_media_content_library (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title               TEXT NOT NULL,
    body                TEXT NOT NULL,
    content_type        TEXT NOT NULL CHECK (content_type IN (
                            'educational','industry','engagement','social_proof',
                            'promotional','feature','faq_highlight','custom'
                        )),
    source              TEXT DEFAULT 'manual' CHECK (source IN (
                            'manual','ai_config_kb','ai_config_faq','auto_detected'
                        )),
    source_ref          TEXT,
    status              TEXT DEFAULT 'approved' CHECK (status IN (
                            'approved','in_queue','posted','archived','skipped'
                        )),
    priority            INTEGER DEFAULT 5,
    suggested_platforms TEXT[] DEFAULT '{}',
    suggested_tone      TEXT,
    used_in_posts       UUID[] DEFAULT '{}',
    times_used          INTEGER DEFAULT 0,
    last_used_at        TIMESTAMPTZ,
    embedding_hash      TEXT,
    ai_config_snapshot  JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Sosyal medya postlarÄ±
CREATE TABLE social_media_posts (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id       UUID REFERENCES social_media_accounts(id) ON DELETE SET NULL,
    platform         TEXT NOT NULL,
    campaign_id      UUID REFERENCES social_media_campaigns(id) ON DELETE SET NULL,
    content_item_id  UUID REFERENCES social_media_content_library(id) ON DELETE SET NULL,
    title            TEXT,
    content          TEXT NOT NULL,
    hashtags         TEXT[] DEFAULT '{}',
    content_type     TEXT NOT NULL CHECK (content_type IN (
                         'educational','industry','engagement','social_proof','promotional'
                     )),
    post_type        TEXT DEFAULT 'campaign' CHECK (post_type IN ('manual','ai_generated','campaign')),
    metadata         JSONB DEFAULT '{}',
    status           TEXT DEFAULT 'draft' CHECK (status IN (
                         'draft','scheduled','publishing','published','failed','deleted'
                     )),
    scheduled_for    TIMESTAMPTZ,
    published_at     TIMESTAMPTZ,
    platform_post_id TEXT,
    platform_url     TEXT,
    error_message    TEXT,
    retry_count      INTEGER DEFAULT 0,
    likes_count      INTEGER,
    comments_count   INTEGER,
    shares_count     INTEGER,
    views_count      INTEGER,
    last_stats_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Kampanya Ã§alÄ±ÅŸma logu
CREATE TABLE social_media_run_history (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id  UUID REFERENCES social_media_campaigns(id) ON DELETE CASCADE,
    post_id      UUID REFERENCES social_media_posts(id) ON DELETE SET NULL,
    platform     TEXT,
    content_type TEXT,
    trigger_type TEXT,
    status       TEXT,
    error        TEXT,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- OAuth state (CSRF korumasÄ±, 5 dk TTL)
CREATE TABLE social_media_oauth_states (
    state       TEXT PRIMARY KEY,
    platform    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ä°ndeksler
CREATE INDEX idx_social_posts_status     ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled  ON social_media_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform   ON social_media_posts(platform);
CREATE INDEX idx_social_posts_campaign   ON social_media_posts(campaign_id);
CREATE INDEX idx_social_content_status   ON social_media_content_library(status);
CREATE INDEX idx_social_content_type     ON social_media_content_library(content_type);
CREATE INDEX idx_social_content_priority ON social_media_content_library(priority, status);
CREATE INDEX idx_social_campaigns_status ON social_media_campaigns(status);


-- FILE: 20260505_social_media_rls.sql

-- ============================================================
-- Social Media Agent â€” RLS Policies
-- Bu tablolar sadece super-admin (service_role) tarafÄ±ndan kullanÄ±lÄ±r.
-- Normal kullanÄ±cÄ±lar hiÃ§bir ÅŸekilde eriÅŸemez.
-- ============================================================

-- â”€â”€â”€ social_media_accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_accounts_service_role" ON social_media_accounts;

CREATE POLICY "social_accounts_service_role"
ON social_media_accounts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_channel_settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_channel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_channel_settings_service_role" ON social_media_channel_settings;

CREATE POLICY "social_channel_settings_service_role"
ON social_media_channel_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_campaigns_service_role" ON social_media_campaigns;

CREATE POLICY "social_campaigns_service_role"
ON social_media_campaigns FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_content_library â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_content_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_content_library_service_role" ON social_media_content_library;

CREATE POLICY "social_content_library_service_role"
ON social_media_content_library FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_posts_service_role" ON social_media_posts;

CREATE POLICY "social_posts_service_role"
ON social_media_posts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_run_history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_run_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_run_history_service_role" ON social_media_run_history;

CREATE POLICY "social_run_history_service_role"
ON social_media_run_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- â”€â”€â”€ social_media_oauth_states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE social_media_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_oauth_states_service_role" ON social_media_oauth_states;

CREATE POLICY "social_oauth_states_service_role"
ON social_media_oauth_states FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- FILE: 20260506_avatar_meeting_features.sql

-- Add AI Avatar columns to meetings table
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS ai_avatar_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_avatar_bot_id TEXT,
ADD COLUMN IF NOT EXISTS ai_avatar_status TEXT DEFAULT 'disabled';

-- Enforce valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meetings_ai_avatar_status_check'
    ) THEN
        ALTER TABLE public.meetings
        ADD CONSTRAINT meetings_ai_avatar_status_check
        CHECK (ai_avatar_status IN ('disabled', 'pending', 'joining', 'joined', 'recording', 'paused', 'left', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.meetings.ai_avatar_enabled IS 'Whether AI Avatar is enabled for this meeting';
COMMENT ON COLUMN public.meetings.ai_avatar_bot_id IS 'The unique identifier of the recall bot instance associated with this meeting';
COMMENT ON COLUMN public.meetings.ai_avatar_status IS 'Status of the AI avatar for this meeting: disabled, pending, joining, joined, recording, paused, left, completed, failed, or cancelled';

-- Add index for filtering meetings by avatar status
CREATE INDEX IF NOT EXISTS idx_meetings_ai_avatar_status ON public.meetings(account_id, ai_avatar_status)
WHERE ai_avatar_status IS NOT NULL;


-- FILE: 20260506_knowledge_base_files.sql

-- Knowledge Base Files: private storage bucket + accounts column

-- 1. Create private knowledge-base bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: account members can upload files to their own folder
-- Path format: {account_id}/{file_id}.{ext}
CREATE POLICY "Account members can upload KB files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 3. RLS: account members can read their own files
CREATE POLICY "Account members can read KB files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 4. RLS: account members can delete their own files
CREATE POLICY "Account members can delete KB files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);


-- FILE: 20260507_avatar_status_calibrating.sql

-- Recall.ai emits a 'calibrating' bot status that the webhook handler tries to
-- persist into meetings.ai_avatar_status. The original CHECK constraint omitted
-- it, causing webhook updates to fail. Drop and recreate the constraint with
-- the full status set.

ALTER TABLE public.meetings
    DROP CONSTRAINT IF EXISTS meetings_ai_avatar_status_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_ai_avatar_status_check
    CHECK (ai_avatar_status IN (
        'disabled', 'pending', 'joining', 'joined', 'calibrating',
        'recording', 'paused', 'left', 'completed', 'failed', 'cancelled'
    ));

COMMENT ON COLUMN public.meetings.ai_avatar_status IS
    'Status of the AI avatar for this meeting: disabled, pending, joining, joined, calibrating, recording, paused, left, completed, failed, or cancelled';


-- FILE: 20260508_avatar_status_full_set.sql

-- Recall.ai bot lifecycle covers a wider status set than originally listed.
-- We normalize raw Recall statuses in the webhook handler, but the DB
-- constraint must accept every normalized value we may persist.

ALTER TABLE public.meetings
    DROP CONSTRAINT IF EXISTS meetings_ai_avatar_status_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_ai_avatar_status_check
    CHECK (
        ai_avatar_status IS NULL OR ai_avatar_status IN (
            'disabled',
            'pending',
            'ready',
            'joining',
            'joined',
            'calibrating',
            'in_call',
            'recording',
            'paused',
            'left',
            'completed',
            'analysis_pending',
            'analysis_complete',
            'failed',
            'cancelled',
            'unknown'
        )
    );

COMMENT ON COLUMN public.meetings.ai_avatar_status IS
    'Normalized AI avatar status: disabled, pending, ready, joining, joined, calibrating, in_call, recording, paused, left, completed, analysis_pending, analysis_complete, failed, cancelled, or unknown.';


-- FILE: 20260509_avatar_normalize_storage.sql

-- ============================================================================
--  AI Avatar â€” normalize storage
--  Adds first-class transcript_url / recording_url columns, the
--  meeting_transcripts table, and an atomic JSONB merge RPC so the Recall.ai
--  webhook can update meeting metadata without a select-then-update race.
-- ============================================================================

-- 1) Convenience columns on meetings (still backfilled in metadata for audit)
ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS transcript_url TEXT,
    ADD COLUMN IF NOT EXISTS recording_url  TEXT;

COMMENT ON COLUMN public.meetings.transcript_url IS
    'Latest transcript download URL provided by Recall.ai';
COMMENT ON COLUMN public.meetings.recording_url IS
    'Latest recording (mp4/webm) download URL provided by Recall.ai';

-- 2) Normalized transcript chunks
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id   UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    account_id   UUID NOT NULL,
    bot_id       TEXT,
    speaker      TEXT,
    content      TEXT NOT NULL,
    timestamp_ms BIGINT,
    spoken_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting
    ON public.meeting_transcripts (meeting_id, created_at);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_account
    ON public.meeting_transcripts (account_id, created_at DESC);

-- RLS â€” only members of the owning account can read transcripts
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_transcripts_select_own_account" ON public.meeting_transcripts;
CREATE POLICY "meeting_transcripts_select_own_account"
    ON public.meeting_transcripts
    FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Service role bypasses RLS; webhook uses admin client for inserts.

-- 3) Atomic JSONB merge RPC
--    Webhook calls this with the patch + optional column overrides so the
--    UPDATE happens in a single statement (no read-then-write race).
CREATE OR REPLACE FUNCTION public.merge_meeting_metadata(
    p_meeting_id        UUID,
    p_account_id        UUID,
    p_patch             JSONB,
    p_avatar_status     TEXT DEFAULT NULL,
    p_avatar_bot_id     TEXT DEFAULT NULL,
    p_meeting_status    TEXT DEFAULT NULL,
    p_transcript_url    TEXT DEFAULT NULL,
    p_recording_url     TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    UPDATE public.meetings
    SET
        metadata          = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_patch, '{}'::jsonb),
        ai_avatar_status  = COALESCE(p_avatar_status,  ai_avatar_status),
        ai_avatar_bot_id  = COALESCE(p_avatar_bot_id,  ai_avatar_bot_id),
        status            = COALESCE(p_meeting_status, status),
        transcript_url    = COALESCE(p_transcript_url, transcript_url),
        recording_url     = COALESCE(p_recording_url,  recording_url)
    WHERE id = p_meeting_id
      AND account_id = p_account_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_meeting_metadata(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_meeting_metadata(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.merge_meeting_metadata IS
    'Atomic JSONB merge for meetings.metadata. Used by the Recall.ai webhook to avoid lost-update races. service_role only.';


-- FILE: 20260509_avatar_status_default_null.sql

-- Change ai_avatar_status default from 'disabled' to NULL.
-- 'disabled' was the initial DB default but it surfaces as a confusing badge
-- in the UI for every new meeting. NULL correctly represents "no avatar assigned".
ALTER TABLE public.meetings ALTER COLUMN ai_avatar_status SET DEFAULT NULL;

-- Clear 'disabled' from existing rows where avatar was never actually activated
-- (ai_avatar_enabled is false and no bot was assigned).
UPDATE public.meetings
SET ai_avatar_status = NULL
WHERE ai_avatar_status = 'disabled'
  AND (ai_avatar_enabled IS NULL OR ai_avatar_enabled = false)
  AND ai_avatar_bot_id IS NULL;


-- FILE: 20260510_avatar_presentations.sql

-- Avatar Presentations: account-scoped pitch deck for AI avatar to present in meetings.

-- 1. account_presentations: bir account'un tek pitch deck'i
CREATE TABLE IF NOT EXISTS public.account_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
    title TEXT,
    pdf_path TEXT NOT NULL,
    page_count INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_presentations_account
    ON public.account_presentations(account_id);

ALTER TABLE public.account_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_presentations_select_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_select_own"
    ON public.account_presentations FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_presentations_modify_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_modify_own"
    ON public.account_presentations FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. account_slides: PDF'in her sayfasÄ± iÃ§in bir slayt kaydÄ±
CREATE TABLE IF NOT EXISTS public.account_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID NOT NULL
        REFERENCES public.account_presentations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    image_path TEXT NOT NULL,
    raw_text TEXT,
    speaking_script TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (presentation_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_account_slides_pres
    ON public.account_slides(presentation_id, page_number);
CREATE INDEX IF NOT EXISTS idx_account_slides_account
    ON public.account_slides(account_id);

ALTER TABLE public.account_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_slides_select_own" ON public.account_slides;
CREATE POLICY "account_slides_select_own"
    ON public.account_slides FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_slides_modify_own" ON public.account_slides;
CREATE POLICY "account_slides_modify_own"
    ON public.account_slides FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 3. Storage bucket: avatar-slides (private, account-scoped path: {account_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar-slides', 'avatar-slides', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_slides_select_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_select_own_account"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "avatar_slides_insert_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_insert_own_account"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

DROP POLICY IF EXISTS "avatar_slides_delete_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_delete_own_account"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- 4. updated_at trigger reuse
DROP TRIGGER IF EXISTS account_presentations_updated_at ON public.account_presentations;
CREATE TRIGGER account_presentations_updated_at
    BEFORE UPDATE ON public.account_presentations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS account_slides_updated_at ON public.account_slides;
CREATE TRIGGER account_slides_updated_at
    BEFORE UPDATE ON public.account_slides
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.account_presentations IS
    'Account-level pitch deck for the AI avatar to present in meetings (one per account).';
COMMENT ON TABLE public.account_slides IS
    'Per-page slide assets and speaking scripts derived from the uploaded PDF.';


-- FILE: 20260519_fix_hardcoded_admin_rls.sql

-- Migration: Fix hardcoded admin identifiers in RLS policies
-- Date: 2026-05-19
--
-- Sorun: BazÄ± tablolarda RLS politikalarÄ± e-posta adresi (admin@admin.com)
-- veya sabit bir UUID ile super admin yetkisi veriyordu.
-- Bu migration bunlarÄ± profiles.role tabanlÄ± kontrole taÅŸÄ±r.
-- KullanÄ±lan roller: 'admin' (hesap yÃ¶neticisi), 'super_admin' (platform yÃ¶neticisi)

-- ============================================================
-- 1. error_logs: Hardcoded UUID'yi kaldÄ±r
-- ============================================================

DROP POLICY IF EXISTS "Admins can see all error logs" ON public.error_logs;

CREATE POLICY "Admins can see all error logs"
ON public.error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
);

-- ============================================================
-- 2. blog_translations: admin@admin.com yerine role kontrolÃ¼
-- ============================================================

DO $$
DECLARE
    pol_name TEXT;
    tbl_name TEXT;
BEGIN
    -- blog_post_translations
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_post_translations'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_post_translations', pol_name);
    END LOOP;

    -- blog_categories
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_categories'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_categories', pol_name);
    END LOOP;

    -- blog_tags (junction)
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename IN ('blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tablename);
    END LOOP;
END $$;

-- blog_post_translations â€” yÃ¶netim politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_post_translations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_post_translations'
            AND policyname = 'Admins can manage blog_post_translations'
        ) THEN
            CREATE POLICY "Admins can manage blog_post_translations"
            ON public.blog_post_translations
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_categories â€” yÃ¶netim politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_categories'
            AND policyname = 'Admins can manage blog_categories'
        ) THEN
            CREATE POLICY "Admins can manage blog_categories"
            ON public.blog_categories
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- ============================================================
-- 3. blog_system_queue ve blog_analytics: admin@admin.com dÃ¼zelt
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE tablename IN ('blog_system_queue', 'blog_analytics', 'blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- blog_system_queue admin politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_system_queue') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_system_queue'
            AND policyname = 'Admins can manage blog_system_queue'
        ) THEN
            CREATE POLICY "Admins can manage blog_system_queue"
            ON public.blog_system_queue
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_analytics admin politikasÄ±
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_analytics') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_analytics'
            AND policyname = 'Admins can manage blog_analytics'
        ) THEN
            CREATE POLICY "Admins can manage blog_analytics"
            ON public.blog_analytics
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;


-- FILE: 20260521_avatar_module_hardening.sql

-- Avatar Module Hardening: Database Schema & Migrations
-- May 21, 2026
--
-- This migration addresses the following issues:
-- Y8: unique index on (account_id, title) for presentations
-- Y16: cascade deletes for presentation â†’ slides
-- Y29: RPC function to merge meeting metadata safely
-- Y30: RPC function to classify questions via Gemini
-- O41: audit log table for admin visibility
-- O42: session usage tracking for billing & observability

-- =============================================================================
-- Y8: Unique Index on (account_id, title) for Presentations
-- =============================================================================
-- Prevents duplicate presentation titles per account, avoiding silent overwrites
-- when the presentation upload flow races or retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_presentations_account_id_title
    ON account_presentations(account_id, LOWER(title))
    WHERE status IS NOT NULL;

-- =============================================================================
-- Y16: Cascade Deletes for Presentation â†’ Slides
-- =============================================================================
-- Ensures slides are automatically cleaned up when their presentation is deleted,
-- preventing orphaned records that would accumulate storage references.
--
-- Note: This assumes the foreign key constraint doesn't already exist or
-- has ON DELETE SET NULL. We drop and recreate to ensure ON DELETE CASCADE.
ALTER TABLE account_slides
    DROP CONSTRAINT IF EXISTS account_slides_presentation_id_fkey;

ALTER TABLE account_slides
    ADD CONSTRAINT account_slides_presentation_id_fkey
        FOREIGN KEY (presentation_id)
        REFERENCES account_presentations(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =============================================================================
-- Y29: RPC Function: merge_meeting_metadata
-- =============================================================================
-- Atomically updates meeting metadata (presentation_status_on_bot_start, etc)
-- without triggering update triggers that might overwrite concurrent changes.
-- Used by bot-session to track presentation state mid-call.
DROP FUNCTION IF EXISTS merge_meeting_metadata(uuid, uuid, jsonb);

CREATE FUNCTION merge_meeting_metadata(
    p_meeting_id uuid,
    p_account_id uuid,
    p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meeting_metadata jsonb;
BEGIN
    -- Atomic read-modify-write: fetch current, merge patch, write back
    UPDATE meetings
    SET metadata = COALESCE(metadata, '{}'::jsonb) || p_patch,
        updated_at = now()
    WHERE id = p_meeting_id
      AND account_id = p_account_id
    RETURNING metadata INTO v_meeting_metadata;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting not found or account mismatch';
    END IF;

    RETURN v_meeting_metadata;
END;
$$;

-- =============================================================================
-- Y30: RPC Function: classify_question_via_gemini
-- =============================================================================
-- Wrapper RPC for calling the Gemini Flash LLM to classify meeting questions
-- (presentation-related vs off-topic). Called by the Recall webhook handler
-- to decide whether the avatar should interrupt the current slide.
--
-- Parameters:
--   p_question_text: The user's question transcribed from the meeting
--   p_context: Optional context (slide title, speaker notes, etc)
--   p_account_id: Account ID for audit logging
--
-- Returns JSON with classification result and confidence score.
DROP FUNCTION IF EXISTS classify_question_via_gemini(text, text, uuid);

CREATE FUNCTION classify_question_via_gemini(
    p_question_text text,
    p_context text DEFAULT NULL,
    p_account_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- This is a placeholder that the application layer calls via HTTP POST
    -- to /api/webhooks/recall/{webhook_id}/classify-question because
    -- Gemini API calls require the server runtime (http_client not available in SQL).
    --
    -- The application layer will:
    -- 1. Extract the question text from SSE/webhook
    -- 2. POST to the RPC with question_text + optional slide context
    -- 3. Get back { is_about_presentation: bool, confidence: float }
    -- 4. Use that to decide interrupt behavior
    --
    -- For now, this RPC is a no-op; the real logic lives in
    -- src/features/avatar/services/anam.ts -> classifyQuestion()

    v_result := jsonb_build_object(
        'is_about_presentation', false,
        'confidence', 0.0,
        'reason', 'Classification deferred to application layer'
    );

    RETURN v_result;
END;
$$;

-- =============================================================================
-- O41: Audit Log Table for Admin Visibility
-- =============================================================================
-- Tracks sensitive avatar operations (session creation, bot lifecycle, errors)
-- so admins can investigate incidents and debug production issues.
--
-- Scoped per account with RLS to prevent cross-account reads.
CREATE TABLE IF NOT EXISTS avatar_audit_logs (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    -- Event severity: 'info', 'warning', 'error'
    severity text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    -- Structured data for deep debugging: bot_id, meeting_id, user_id, error codes, etc
    metadata jsonb DEFAULT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_account_id
    ON avatar_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_created_at
    ON avatar_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatar_audit_logs_event_type
    ON avatar_audit_logs(event_type);

-- RLS: users can only read audit logs for their own account
ALTER TABLE avatar_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avatar_audit_logs_account_isolation ON avatar_audit_logs;
CREATE POLICY avatar_audit_logs_account_isolation
    ON avatar_audit_logs
    FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- =============================================================================
-- O42: Session Usage Table for Billing & Observability
-- =============================================================================
-- Tracks Anam avatar session usage per account for billing aggregation,
-- quota enforcement, and cost analysis.
--
-- Each row represents one completed (or ongoing) avatar session.
-- Used to answer questions like:
-- - How many sessions has account X created this month?
-- - What's the total session duration for quota checks?
-- - Which accounts are heavy users? (For capacity planning)
CREATE TABLE IF NOT EXISTS avatar_session_usage (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    session_id text NOT NULL UNIQUE,
    session_token text NOT NULL,
    persona_id text NOT NULL,
    -- 'bot' (Recall bot) or 'user' (manual session)
    session_type text NOT NULL DEFAULT 'bot',
    -- Which meeting, if any (null for manual sessions)
    meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
    -- Session start time
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    -- Session end time (null if still active)
    ended_at timestamp with time zone DEFAULT NULL,
    -- Total duration in seconds (computed on session end)
    duration_seconds integer DEFAULT NULL,
    -- Status: 'active', 'completed', 'failed', 'cancelled'
    status text NOT NULL DEFAULT 'active',
    -- Total speaking time (for cost modeling of actual avatar time)
    speaking_duration_seconds integer DEFAULT 0,
    -- Number of questions answered
    questions_answered integer DEFAULT 0,
    -- Metadata: error_code, disconnect_reason, etc
    metadata jsonb DEFAULT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_account_id
    ON avatar_session_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_started_at
    ON avatar_session_usage(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_session_id
    ON avatar_session_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_avatar_session_usage_meeting_id
    ON avatar_session_usage(meeting_id);

-- RLS: users can only read usage logs for their own account
ALTER TABLE avatar_session_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avatar_session_usage_account_isolation ON avatar_session_usage;
CREATE POLICY avatar_session_usage_account_isolation
    ON avatar_session_usage
    FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- =============================================================================
-- Helper Function: Log Avatar Event
-- =============================================================================
-- Convenience function for the application to log avatar events without
-- constructing the full JSON payload in TypeScript.
DROP FUNCTION IF EXISTS log_avatar_event(uuid, text, text, jsonb);

CREATE FUNCTION log_avatar_event(
    p_account_id uuid,
    p_event_type text,
    p_message text,
    p_metadata jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id bigint;
BEGIN
    INSERT INTO avatar_audit_logs (account_id, event_type, severity, message, metadata, created_by)
    VALUES (
        p_account_id,
        p_event_type,
        CASE WHEN p_event_type LIKE '%_error' THEN 'error'
             WHEN p_event_type LIKE '%_warning' THEN 'warning'
             ELSE 'info' END,
        p_message,
        p_metadata,
        auth.uid()
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;


-- FILE: add_indexes.sql

-- Supabase (PostgreSQL) Performance Indexes
-- Run this script in your Supabase SQL Editor to speed up common queries.

-- 1. Index on leads (account_id is usually a foreign key used in queries)
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
-- Index on status for filtering leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 2. Index on meetings
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 3. Index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- Note: Depending on your exact schema, some column names (like account_id or start_time) 
-- might differ. Please adjust them if your schema uses different column names.


-- FILE: create_error_logs_table.sql

-- ============================================
-- CREATE ERROR_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL CHECK (error_type IN ('client_error', 'server_error', 'api_error', 'component_error')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    url TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_account_id ON error_logs(account_id);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_composite ON error_logs(account_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;


-- FILE: create_event_logs_table.sql

-- ============================================
-- CREATE EVENT_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_event_logs_account_id ON event_logs(account_id);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);


-- FILE: create_sequences_table.sql

-- Create sequences table for automation workflows
--
-- trigger_type values and their semantics:
--   'lead_created'    â€” AkÄ±ÅŸ, yeni bir lead oluÅŸturulduÄŸunda baÅŸlar
--   'meeting_booked'  â€” AkÄ±ÅŸ, toplantÄ± rezervasyonu yapÄ±ldÄ±ÄŸÄ±nda baÅŸlar
--   'instant' / 'now' â€” AkÄ±ÅŸ, manuel olarak anÄ±nda tetiklenir
--   'custom'          â€” AkÄ±ÅŸ, webhook veya dÄ±ÅŸ entegrasyon ile tetiklenir
--   'hubspot_lead' / 'salesforce_lead' / 'pipedrive_lead' / 'zoho_lead'
--                     â€” CRM entegrasyonundan gelen lead ile tetiklenir
--
-- NOT: 'no_response' bir trigger deÄŸil, akÄ±ÅŸ iÃ§indeki bir koÅŸuldur
-- (enrollment'Ä±n belirli bir adÄ±mda bekleme durumu processor.ts tarafÄ±ndan yÃ¶netilir).
-- Bu deÄŸer geriye dÃ¶nÃ¼k uyumluluk iÃ§in constraint'te tutulmaktadÄ±r.

CREATE TABLE IF NOT EXISTS sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'instant',
        'now',
        'no_response',       -- Geriye dÃ¶nÃ¼k uyumluluk; yeni akÄ±ÅŸlarda kullanÄ±lmamalÄ±
        'meeting_booked',
        'lead_created',
        'custom',
        'hubspot_lead',
        'salesforce_lead',
        'pipedrive_lead',
        'zoho_lead'
    )),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sequences_account ON sequences(account_id);
CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_sequences_trigger ON sequences(trigger_type);

-- Enable Row Level Security
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access sequences from their account
CREATE POLICY "Users can view sequences from their account"
    ON sequences FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sequences to their account"
    ON sequences FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update sequences from their account"
    ON sequences FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sequences from their account"
    ON sequences FOR DELETE
    USING (
        account_id IN (
            SELECT account_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- FILE: error_logs_rls.sql

-- ============================================
-- ERROR_LOGS RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins can view all error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can view their tenant error logs" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Anonymous users can insert error logs" ON error_logs;

-- Super admins (role = 'super_admin' in profiles) can view all error logs
CREATE POLICY "Super admins can view all error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Regular admins can only view error logs for their account
CREATE POLICY "Admins can view their account error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    account_id IN (
        SELECT account_id FROM profiles
        WHERE id = auth.uid()
    )
);

-- Allow authenticated users to insert error logs
CREATE POLICY "Authenticated users can insert error logs"
ON error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anonymous users to insert error logs (for client-side errors before auth)
CREATE POLICY "Anonymous users can insert error logs"
ON error_logs
FOR INSERT
TO anon
WITH CHECK (true);


-- FILE: event_logs_rls.sql

-- ============================================
-- EVENT_LOGS TABLE RLS POLICIES
-- ============================================
-- Run this AFTER creating the event_logs table

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account events"
ON event_logs FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can insert events"
ON event_logs FOR INSERT
WITH CHECK (true);


-- FILE: fix_profile_schema.sql

-- Run this script in your Supabase Dashboard > SQL Editor
-- It adds the missing columns to the profiles table and reloads the schema cache

-- 1. Add missing columns safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- 2. Force schema cache reload (Supabase specific)
NOTIFY pgrst, 'reload config';


-- FILE: populate_demo_data.sql

-- Demo Data Population Script for admin@admin.com

DO $$
DECLARE
    target_email TEXT := 'admin@admin.com';
    target_user_id UUID;
    target_account_id UUID;
    lead_id_1 UUID;
    lead_id_2 UUID;
    lead_id_3 UUID;
    conv_id_1 UUID;
    conv_id_2 UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please sign up with this email first.', target_email;
        RETURN;
    END IF;

    -- 2. Ensure Account Exists
    -- Check if user already has a profile and account
    SELECT account_id INTO target_account_id FROM public.profiles WHERE id = target_user_id;

    IF target_account_id IS NULL THEN
        -- Create new account
        INSERT INTO public.accounts (name, subscription_status, plan_id)
        VALUES ('Demo Company', 'active', 'pro')
        RETURNING id INTO target_account_id;

        -- Create/Update profile
        INSERT INTO public.profiles (id, account_id, full_name, role, avatar_url)
        VALUES (target_user_id, target_account_id, 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin')
        ON CONFLICT (id) DO UPDATE
        SET account_id = target_account_id,
            full_name = 'Admin User',
            role = 'admin';
    END IF;

    -- 3. Clear existing demo data for this account (optional, to avoid duplicates if run multiple times)
    -- BE CAREFUL: This deletes data for the account. Comment out if you want to append.
    DELETE FROM public.meetings WHERE account_id = target_account_id;
    DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE account_id = target_account_id);
    DELETE FROM public.conversations WHERE account_id = target_account_id;
    DELETE FROM public.leads WHERE account_id = target_account_id;
    DELETE FROM public.integrations WHERE account_id = target_account_id;
    -- DELETE FROM public.sequences WHERE account_id = target_account_id; -- If sequences table exists

    -- 4. Seed Leads
    
    -- Lead 1: New Lead (Website)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Ahmet', 'YÄ±lmaz', 'ahmet.yilmaz@example.com', '+905551112233', 'website', 'new', NOW() - INTERVAL '2 hours')
    RETURNING id INTO lead_id_1;

    -- Lead 2: Contacted / In Conversation (WhatsApp)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'AyÅŸe', 'Demir', 'ayse.demir@example.com', '+905554445566', 'whatsapp', 'contacted', NOW() - INTERVAL '1 day')
    RETURNING id INTO lead_id_2;

    -- Lead 3: Booked Meeting (Instagram)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Mehmet', 'Kaya', 'mehmet.kaya@example.com', '+905557778899', 'instagram', 'booked', NOW() - INTERVAL '3 days')
    RETURNING id INTO lead_id_3;

    -- Additional Leads for variety
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at) VALUES
    (target_account_id, 'Zeynep', 'Ã‡elik', 'zeynep.celik@example.com', '+905559990011', 'website', 'qualified', NOW() - INTERVAL '5 hours'),
    (target_account_id, 'Ali', 'Veli', 'ali.veli@example.com', '+905552223344', 'referral', 'unqualified', NOW() - INTERVAL '1 week'),
    (target_account_id, 'Fatma', 'SarÄ±', 'fatma.sari@example.com', '+905558889900', 'linkedin', 'new', NOW() - INTERVAL '30 minutes'),
    (target_account_id, 'Can', 'Ã–z', 'can.oz@example.com', '+905556667788', 'ads', 'contacted', NOW() - INTERVAL '2 days');

    -- 5. Seed Conversations & Messages

    -- Conversation for Lead 2 (AyÅŸe)
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_2, 'whatsapp', 'active', NOW() - INTERVAL '1 hour')
    RETURNING id INTO conv_id_1;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_1, 'lead', 'Merhaba, fiyatlarÄ±nÄ±z hakkÄ±nda bilgi alabilir miyim?', NOW() - INTERVAL '1 day'),
    (conv_id_1, 'ai', 'Merhaba AyÅŸe HanÄ±m! Tabii ki. Paketlerimiz aylÄ±k abonelik ÅŸeklindedir. Hangi hizmetimizle ilgileniyorsunuz?', NOW() - INTERVAL '23 hours'),
    (conv_id_1, 'lead', 'Randevu asistanÄ± ilgimi Ã§ekiyor.', NOW() - INTERVAL '20 hours'),
    (conv_id_1, 'ai', 'Harika bir seÃ§im! Randevu asistanÄ±mÄ±z 7/24 Ã§alÄ±ÅŸÄ±r. Sizin iÃ§in bir demo ayarlayalÄ±m mÄ±?', NOW() - INTERVAL '1 hour');

    -- Conversation for Lead 3 (Mehmet) - Booked
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_3, 'whatsapp', 'closed', NOW() - INTERVAL '2 days')
    RETURNING id INTO conv_id_2;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_2, 'lead', 'ToplantÄ± ayarlamak istiyorum.', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'ai', 'Memnuniyetle. YarÄ±n saat 14:00 veya 16:00 sizin iÃ§in uygun mu?', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'lead', '14:00 uygun.', NOW() - INTERVAL '2 days'),
    (conv_id_2, 'ai', 'TamamdÄ±r, yarÄ±n 14:00 iÃ§in toplantÄ±nÄ±zÄ± kaydettim.', NOW() - INTERVAL '2 days');

    -- 6. Seed Meetings
    INSERT INTO public.meetings (account_id, lead_id, agent_id, start_time, end_time, status, meeting_link)
    VALUES 
    (target_account_id, lead_id_3, target_user_id, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 30 minutes', 'scheduled', 'https://meet.google.com/abc-defg-hij'),
    (target_account_id, lead_id_2, target_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days 30 minutes', 'completed', 'https://meet.google.com/xyz-uvw-123');

    -- 7. Seed Integrations
    INSERT INTO public.integrations (account_id, provider, status, config) VALUES
    (target_account_id, 'google_calendar', 'connected', '{"calendar_id": "primary"}'),
    (target_account_id, 'whatsapp', 'connected', '{"phone_number_id": "123456"}'),
    (target_account_id, 'hubspot', 'disconnected', '{}');

    -- 8. Seed Sequences (Check if table exists first in your logic, but here assuming it does based on file view)
    -- Removing explicit table check for simplicity in this block, assuming schema handles existence
    BEGIN
        INSERT INTO public.sequences (account_id, name, trigger_type, is_active, steps) VALUES
        (target_account_id, 'Yeni Lead KarÅŸÄ±lama', 'lead_created', true, '[{"type": "wait", "duration": "5m"}, {"type": "message", "template_id": "welcome"}]'::jsonb),
        (target_account_id, 'ToplantÄ± Gelmeme Takibi', 'no_response', true, '[{"type": "wait", "duration": "1h"}, {"type": "email", "subject": "ToplantÄ±yÄ± kaÃ§Ä±rdÄ±nÄ±z"}]'::jsonb);
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Sequences table does not exist, skipping sequence seeding.';
    END;

    RAISE NOTICE 'Demo data populated successfully for user %', target_email;

END $$;


-- FILE: supabase_rls_policies.sql

-- ============================================================
-- RLS POLICIES â€” Consolidated & Recursion-Safe
-- ============================================================

-- 1. Security Definer Helper Function (Breaks RLS Recursion)
CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view team members"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
DROP POLICY IF EXISTS "profiles_team_select"  ON profiles;

CREATE POLICY "profiles_owner_select"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_team_select"
ON profiles FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);


-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account"   ON accounts;
DROP POLICY IF EXISTS "Admins can update account"    ON accounts;
DROP POLICY IF EXISTS "accounts_select"              ON accounts;

CREATE POLICY "accounts_select"
ON accounts FOR SELECT
USING (id = public.get_my_account_id());

CREATE POLICY "Admins can update account"
ON accounts FOR UPDATE
USING (
  id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- LEADS TABLE
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account leads"   ON leads;
DROP POLICY IF EXISTS "Users can create leads"         ON leads;
DROP POLICY IF EXISTS "Users can update leads"         ON leads;
DROP POLICY IF EXISTS "Users can delete leads"         ON leads;
DROP POLICY IF EXISTS "leads_select"                   ON leads;
DROP POLICY IF EXISTS "leads_insert"                   ON leads;

CREATE POLICY "leads_select"
ON leads FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_insert"
ON leads FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "leads_update"
ON leads FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_delete"
ON leads FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account conversations"   ON conversations;
DROP POLICY IF EXISTS "Users can create conversations"         ON conversations;
DROP POLICY IF EXISTS "Users can update conversations"         ON conversations;

CREATE POLICY "conversations_select"
ON conversations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "conversations_insert"
ON conversations FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "conversations_update"
ON conversations FOR UPDATE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- MESSAGES TABLE
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account messages"   ON messages;
DROP POLICY IF EXISTS "Users can create messages"         ON messages;

CREATE POLICY "messages_select"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);


-- ============================================================
-- MEETINGS TABLE
-- ============================================================
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account meetings"   ON meetings;
DROP POLICY IF EXISTS "Users can create meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can update meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can delete meetings"         ON meetings;

CREATE POLICY "meetings_select"
ON meetings FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_insert"
ON meetings FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "meetings_update"
ON meetings FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_delete"
ON meetings FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- INTEGRATIONS TABLE
-- ============================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account integrations"   ON integrations;
DROP POLICY IF EXISTS "Admins can manage integrations"        ON integrations;

CREATE POLICY "integrations_select"
ON integrations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "integrations_manage"
ON integrations FOR ALL
USING (
  account_id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- SEQUENCES TABLE
-- ============================================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sequences from their account"    ON sequences;
DROP POLICY IF EXISTS "Users can insert sequences to their account"    ON sequences;
DROP POLICY IF EXISTS "Users can update sequences from their account"  ON sequences;
DROP POLICY IF EXISTS "Users can delete sequences from their account"  ON sequences;

CREATE POLICY "sequences_select"
ON sequences FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_insert"
ON sequences FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "sequences_update"
ON sequences FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_delete"
ON sequences FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- SEQUENCE_ENROLLMENTS TABLE
-- ============================================================
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view enrollments from their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can insert enrollments to their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can update enrollments from their account"  ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can delete enrollments from their account"  ON sequence_enrollments;

CREATE POLICY "enrollments_select"
ON sequence_enrollments FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_insert"
ON sequence_enrollments FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_update"
ON sequence_enrollments FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_delete"
ON sequence_enrollments FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- B2B_COMPANIES TABLE (Lead Database)
-- ============================================================
ALTER TABLE IF EXISTS b2b_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view companies" ON b2b_companies;
DROP POLICY IF EXISTS "Service role only write" ON b2b_companies;

-- Allow all authenticated users to search/view lead database
CREATE POLICY "authenticated_select_companies"
ON b2b_companies FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);


-- ============================================================
-- POSTS TABLE (Blog)
-- ============================================================
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts"       ON posts;
DROP POLICY IF EXISTS "Admins can insert posts"        ON posts;
DROP POLICY IF EXISTS "Admins can update posts"        ON posts;
DROP POLICY IF EXISTS "Admins can delete posts"        ON posts;

CREATE POLICY "posts_public_select"
ON posts FOR SELECT
USING (published = true);

CREATE POLICY "posts_admin_all"
ON posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
