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
