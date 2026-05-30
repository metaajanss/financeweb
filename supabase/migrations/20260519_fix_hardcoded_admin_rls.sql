-- Migration: Fix hardcoded admin identifiers in RLS policies
-- Date: 2026-05-19
--
-- Sorun: Bazı tablolarda RLS politikaları e-posta adresi (admin@admin.com)
-- veya sabit bir UUID ile super admin yetkisi veriyordu.
-- Bu migration bunları profiles.role tabanlı kontrole taşır.
-- Kullanılan roller: 'admin' (hesap yöneticisi), 'super_admin' (platform yöneticisi)

-- ============================================================
-- 1. error_logs: Hardcoded UUID'yi kaldır
-- ============================================================

DROP POLICY IF EXISTS "Admins can see all error logs" ON public.error_logs;

CREATE POLICY "Admins can see all error logs"
ON public.error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
);

-- ============================================================
-- 2. blog_translations: admin@admin.com yerine role kontrolü
-- ============================================================

DO $$
DECLARE
    pol_name TEXT;
    tbl_name TEXT;
BEGIN
    -- blog_post_translations
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_post_translations'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_post_translations', pol_name);
    END LOOP;

    -- blog_categories
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'blog_categories'
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_categories', pol_name);
    END LOOP;

    -- blog_tags (junction)
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename IN ('blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tablename);
    END LOOP;
END $$;

-- blog_post_translations — yönetim politikası
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_post_translations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_post_translations'
            AND policyname = 'Admins can manage blog_post_translations'
        ) THEN
            CREATE POLICY "Admins can manage blog_post_translations"
            ON public.blog_post_translations
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_categories — yönetim politikası
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_categories'
            AND policyname = 'Admins can manage blog_categories'
        ) THEN
            CREATE POLICY "Admins can manage blog_categories"
            ON public.blog_categories
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- ============================================================
-- 3. blog_system_queue ve blog_analytics: admin@admin.com düzelt
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE tablename IN ('blog_system_queue', 'blog_analytics', 'blog_post_tags', 'blog_post_categories')
        AND qual::text LIKE '%admin@admin.com%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- blog_system_queue admin politikası
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_system_queue') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_system_queue'
            AND policyname = 'Admins can manage blog_system_queue'
        ) THEN
            CREATE POLICY "Admins can manage blog_system_queue"
            ON public.blog_system_queue
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;

-- blog_analytics admin politikası
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_analytics') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'blog_analytics'
            AND policyname = 'Admins can manage blog_analytics'
        ) THEN
            CREATE POLICY "Admins can manage blog_analytics"
            ON public.blog_analytics
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
                )
            );
        END IF;
    END IF;
END $$;
