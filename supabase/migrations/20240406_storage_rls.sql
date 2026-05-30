-- Phase 3: Supabase Storage Security Hardening
-- This migration ensures that storage buckets are protected by RLS and strictly isolated.

-- 1. Ensure buckets exist
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('chatbot', 'chatbot', true)
on conflict (id) do update set public = true;

-- 2. Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- 3. PROFILES BUCKET POLICIES

-- Allow public read access to avatars
create policy "Public Access to Avatars"
on storage.objects for select
using ( bucket_id = 'profiles' );

-- Allow users to upload their own avatar
-- Path format: avatars/{user_id}-{random}.ext
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);


-- 4. CHATBOT BUCKET POLICIES (Admin Only)

-- Allow public read access to chatbot assets
create policy "Public Access to Chatbot Assets"
on storage.objects for select
using ( bucket_id = 'chatbot' );

-- Allow admins to upload chatbot assets
-- Path format: {account_id}/logos/{filename}
create policy "Admins can upload chatbot assets"
on storage.objects for insert
with check (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);

-- Allow admins to delete chatbot assets
create policy "Admins can delete chatbot assets"
on storage.objects for delete
using (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);
