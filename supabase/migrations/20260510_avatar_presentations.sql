-- Avatar Presentations: account-scoped pitch deck for AI avatar to present in meetings.

-- 1. account_presentations: bir account'un tek pitch deck'i
CREATE TABLE IF NOT EXISTS public.account_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
    title TEXT,
    pdf_path TEXT NOT NULL,
    page_count INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_presentations_account
    ON public.account_presentations(account_id);

ALTER TABLE public.account_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_presentations_select_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_select_own"
    ON public.account_presentations FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_presentations_modify_own"
    ON public.account_presentations;
CREATE POLICY "account_presentations_modify_own"
    ON public.account_presentations FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. account_slides: PDF'in her sayfası için bir slayt kaydı
CREATE TABLE IF NOT EXISTS public.account_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID NOT NULL
        REFERENCES public.account_presentations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    image_path TEXT NOT NULL,
    raw_text TEXT,
    speaking_script TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (presentation_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_account_slides_pres
    ON public.account_slides(presentation_id, page_number);
CREATE INDEX IF NOT EXISTS idx_account_slides_account
    ON public.account_slides(account_id);

ALTER TABLE public.account_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_slides_select_own" ON public.account_slides;
CREATE POLICY "account_slides_select_own"
    ON public.account_slides FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "account_slides_modify_own" ON public.account_slides;
CREATE POLICY "account_slides_modify_own"
    ON public.account_slides FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 3. Storage bucket: avatar-slides (private, account-scoped path: {account_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar-slides', 'avatar-slides', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_slides_select_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_select_own_account"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "avatar_slides_insert_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_insert_own_account"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

DROP POLICY IF EXISTS "avatar_slides_delete_own_account" ON storage.objects;
CREATE POLICY "avatar_slides_delete_own_account"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatar-slides'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND account_id::text = (storage.foldername(name))[1]
              AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- 4. updated_at trigger reuse
DROP TRIGGER IF EXISTS account_presentations_updated_at ON public.account_presentations;
CREATE TRIGGER account_presentations_updated_at
    BEFORE UPDATE ON public.account_presentations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS account_slides_updated_at ON public.account_slides;
CREATE TRIGGER account_slides_updated_at
    BEFORE UPDATE ON public.account_slides
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.account_presentations IS
    'Account-level pitch deck for the AI avatar to present in meetings (one per account).';
COMMENT ON TABLE public.account_slides IS
    'Per-page slide assets and speaking scripts derived from the uploaded PDF.';
