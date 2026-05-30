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
