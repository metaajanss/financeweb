-- Drop old check constraint and add 'now' as a valid trigger_type
ALTER TABLE public.sequences
  DROP CONSTRAINT IF EXISTS sequences_trigger_type_check;

ALTER TABLE public.sequences
  ADD CONSTRAINT sequences_trigger_type_check
    CHECK (trigger_type IN (
      'instant',
      'now',
      'no_response',
      'meeting_booked',
      'lead_created',
      'custom',
      'hubspot_lead',
      'salesforce_lead',
      'pipedrive_lead',
      'zoho_lead'
    ));
