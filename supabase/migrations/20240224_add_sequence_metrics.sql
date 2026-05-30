-- Add metrics column to sequences table
ALTER TABLE public.sequences 
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{
  "enrolled": 0,
  "active": 0,
  "completed": 0,
  "email": {
    "sent": 0,
    "opened": 0,
    "replied": 0
  },
  "whatsapp": {
    "sent": 0,
    "opened": 0,
    "replied": 0
  }
}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.sequences.metrics IS 'Aggregated analytics for the sequence enrollment and message performance.';
