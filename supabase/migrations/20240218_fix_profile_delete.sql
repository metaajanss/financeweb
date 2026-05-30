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
