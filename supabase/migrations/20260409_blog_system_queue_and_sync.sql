-- Migration: Blog System Queue and Sync Tracking
-- Date: 2026-04-09
-- Description: Adds translation queue, redirect management, and sync metadata.

-- 1. Add metadata column to posts table if missing
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create blog_translation_queue table
CREATE TABLE IF NOT EXISTS public.blog_translation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    target_locale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, target_locale)
);

-- 3. Create blog_redirects table (Requirement 4.23)
CREATE TABLE IF NOT EXISTS public.blog_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE, -- Usually global for blog, but keeping account_id for consistency
    old_slug TEXT NOT NULL,
    new_slug TEXT NOT NULL,
    locale TEXT NOT NULL,
    status_code INTEGER DEFAULT 301, -- 301 Permanent, 302 Temporary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(old_slug, locale)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_translation_queue_status ON public.blog_translation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_redirects_old_slug ON public.blog_redirects(old_slug, locale);

-- RLS Enforcement
ALTER TABLE public.blog_translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_redirects ENABLE ROW LEVEL SECURITY;

-- Policies for Translation Queue (Admin only)
CREATE POLICY "Allow admin to manage translation queue"
ON public.blog_translation_queue
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Policies for Redirects (Public read, Admin manage)
CREATE POLICY "Allow public read for redirects"
ON public.blog_redirects
FOR SELECT
USING (true);

CREATE POLICY "Allow admin to manage redirects"
ON public.blog_redirects
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at trigger for queue
CREATE TRIGGER update_blog_translation_queue_updated_at
BEFORE UPDATE ON public.blog_translation_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.blog_translation_queue IS 'Queue for background blog translations using Gemini';
COMMENT ON TABLE public.blog_redirects IS 'Handles 301/302 redirects for changed blog slugs to preserve SEO';
