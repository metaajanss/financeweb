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
