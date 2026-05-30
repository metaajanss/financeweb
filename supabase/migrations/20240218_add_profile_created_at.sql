-- Add missing created_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have a created_at value if they don't (though default NOW() handles new rows)
UPDATE public.profiles SET created_at = updated_at WHERE created_at IS NULL;
