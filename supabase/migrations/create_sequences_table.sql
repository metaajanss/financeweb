-- Create sequences table for automation workflows
--
-- trigger_type values and their semantics:
--   'lead_created'    — Akış, yeni bir lead oluşturulduğunda başlar
--   'meeting_booked'  — Akış, toplantı rezervasyonu yapıldığında başlar
--   'instant' / 'now' — Akış, manuel olarak anında tetiklenir
--   'custom'          — Akış, webhook veya dış entegrasyon ile tetiklenir
--   'hubspot_lead' / 'salesforce_lead' / 'pipedrive_lead' / 'zoho_lead'
--                     — CRM entegrasyonundan gelen lead ile tetiklenir
--
-- NOT: 'no_response' bir trigger değil, akış içindeki bir koşuldur
-- (enrollment'ın belirli bir adımda bekleme durumu processor.ts tarafından yönetilir).
-- Bu değer geriye dönük uyumluluk için constraint'te tutulmaktadır.

CREATE TABLE IF NOT EXISTS sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'instant',
        'now',
        'no_response',       -- Geriye dönük uyumluluk; yeni akışlarda kullanılmamalı
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
