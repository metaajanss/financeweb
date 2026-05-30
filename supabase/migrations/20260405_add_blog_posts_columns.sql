-- Migration: Add missing columns to posts table for blog system
-- Task: 1.1 Create blog_posts table with all required columns
-- Requirement: 10.1
-- Note: The posts table already exists. This migration adds 6 missing columns.

-- Add missing columns to existing posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add indexes for query performance (as specified in design document)
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.posts(author_id);

-- Add comment to document the table purpose
COMMENT ON TABLE public.posts IS 'Blog posts table with multi-language support. Source content is in English, translations stored in post_translations table.';
COMMENT ON COLUMN public.posts.featured_image_url IS 'URL of the featured/hero image for SEO and blog cards (og:image)';
COMMENT ON COLUMN public.posts.seo_title IS 'Custom meta title for SEO (50-60 characters optimal). Falls back to title if not set.';
COMMENT ON COLUMN public.posts.seo_description IS 'Custom meta description for SEO (150-160 characters optimal). Falls back to excerpt if not set.';
COMMENT ON COLUMN public.posts.seo_keywords IS 'Array of keywords for SEO analysis and optimization';
COMMENT ON COLUMN public.posts.reading_time_minutes IS 'Estimated reading time based on word count (200-250 words/minute)';
COMMENT ON COLUMN public.posts.view_count IS 'Cached count of total page views, aggregated from blog_analytics table';
