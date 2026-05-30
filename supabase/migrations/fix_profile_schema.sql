-- Run this script in your Supabase Dashboard > SQL Editor
-- It adds the missing columns to the profiles table and reloads the schema cache

-- 1. Add missing columns safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- 2. Force schema cache reload (Supabase specific)
NOTIFY pgrst, 'reload config';
