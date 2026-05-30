-- Migration: Create blog_analytics table
-- Task: 1.6 Create blog_analytics table
-- Requirements: 10.9
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_analytics_post ON public.blog_analytics(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_locale ON public.blog_analytics(locale, created_at DESC);

COMMENT ON TABLE public.blog_analytics IS 'Tracks page views for blog posts per locale';
COMMENT ON COLUMN public.blog_analytics.post_id IS 'FK to posts table (ON DELETE CASCADE)';
COMMENT ON COLUMN public.blog_analytics.locale IS 'Locale of the visitor (e.g., en, tr, de)';
COMMENT ON COLUMN public.blog_analytics.referrer IS 'HTTP Referer header value';
COMMENT ON COLUMN public.blog_analytics.user_agent IS 'HTTP User-Agent header value';
COMMENT ON COLUMN public.blog_analytics.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, TR)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can record a view)
CREATE POLICY "Allow public insert for blog_analytics"
ON public.blog_analytics FOR INSERT WITH CHECK (true);

-- Admin read access only
CREATE POLICY "Allow admin to read blog_analytics"
ON public.blog_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);
