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
