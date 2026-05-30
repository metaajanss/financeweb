-- Add AI Training Setup Wizard columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_wizard_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS setup_wizard_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN accounts.setup_wizard_completed IS 'Whether the AI training setup wizard has been completed';
COMMENT ON COLUMN accounts.setup_wizard_step IS 'Current step (1-6) of the AI training setup wizard';
COMMENT ON COLUMN accounts.setup_wizard_data IS 'Temporary storage for wizard data during setup process';
