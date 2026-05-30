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
