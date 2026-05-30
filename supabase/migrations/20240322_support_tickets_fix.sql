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
