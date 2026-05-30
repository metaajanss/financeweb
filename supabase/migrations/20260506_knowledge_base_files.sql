-- Knowledge Base Files: private storage bucket + accounts column

-- 1. Create private knowledge-base bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: account members can upload files to their own folder
-- Path format: {account_id}/{file_id}.{ext}
CREATE POLICY "Account members can upload KB files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 3. RLS: account members can read their own files
CREATE POLICY "Account members can read KB files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);

-- 4. RLS: account members can delete their own files
CREATE POLICY "Account members can delete KB files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_id::text = (storage.foldername(name))[1]
  )
);
