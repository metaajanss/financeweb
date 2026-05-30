-- Fix profiles table role constraint to match application roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated constraint allowing admin, agent, member (and keeping sales_rep for safety)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'agent', 'member', 'sales_rep'));
