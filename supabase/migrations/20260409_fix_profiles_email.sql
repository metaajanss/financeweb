-- Migration: Add email column to profiles table
-- Date: 2026-04-09
-- Description: Adds the email column to profiles table to support RLS policies and easier identification.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles from auth.users if possible
-- Note: This requires the migration to be run in an environment where auth schema is accessible
-- but even if it doesn't update, the app logic in profile-bootstrap.ts will handle it on next login.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND p.email IS NULL;
  END IF;
END $$;
