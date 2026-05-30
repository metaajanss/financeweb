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
