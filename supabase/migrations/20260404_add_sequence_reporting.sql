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
