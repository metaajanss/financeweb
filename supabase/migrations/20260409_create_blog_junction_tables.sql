-- Migration: Create junction tables for blog post categories and tags
-- Task: 1.5 Create junction tables for categories and tags
-- Requirements: 10.5, 10.6
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_post_categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post ON public.blog_post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category ON public.blog_post_categories(category_id);

COMMENT ON TABLE public.blog_post_categories IS 'Junction table linking blog posts to categories (many-to-many)';

-- ============================================================================
-- Table: blog_post_tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags(tag_id);

COMMENT ON TABLE public.blog_post_tags IS 'Junction table linking blog posts to tags (many-to-many)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read for blog_post_categories"
ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY "Allow public read for blog_post_tags"
ON public.blog_post_tags FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Allow admin to manage blog_post_categories"
ON public.blog_post_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);

CREATE POLICY "Allow admin to manage blog_post_tags"
ON public.blog_post_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);
