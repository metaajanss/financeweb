-- Migration: Create blog_categories and blog_category_translations tables
-- Task: 1.3 Create blog_categories and blog_category_translations tables
-- Requirement: 10.3
-- Date: 2026-04-07

-- ============================================================================
-- Table: blog_categories
-- ============================================================================
-- Stores blog post categories with English as the source language
-- Translations are stored in blog_category_translations table

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for slug lookups (used in category filtering)
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Add comments for documentation
COMMENT ON TABLE public.blog_categories IS 'Blog post categories. Source content is in English, translations stored in blog_category_translations table.';
COMMENT ON COLUMN public.blog_categories.slug IS 'URL-safe unique identifier for the category (e.g., "marketing", "sales")';
COMMENT ON COLUMN public.blog_categories.name IS 'Category name in English (source language)';
COMMENT ON COLUMN public.blog_categories.description IS 'Optional category description in English';

-- ============================================================================
-- Table: blog_category_translations
-- ============================================================================
-- Stores translated category names and descriptions for all active locales

CREATE TABLE IF NOT EXISTS public.blog_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  UNIQUE(category_id, locale)
);

-- Add index for efficient translation lookups
CREATE INDEX IF NOT EXISTS idx_blog_category_translations_category_locale 
  ON public.blog_category_translations(category_id, locale);

-- Add comments for documentation
COMMENT ON TABLE public.blog_category_translations IS 'Translated category names and descriptions for all supported locales (tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN public.blog_category_translations.locale IS 'Locale code (e.g., "tr", "de", "ar"). Must match locales defined in src/config/locales.ts';
COMMENT ON COLUMN public.blog_category_translations.translated_name IS 'Category name translated into the target locale';
COMMENT ON COLUMN public.blog_category_translations.translated_description IS 'Optional category description translated into the target locale';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;

-- Public read access (categories are public information)
CREATE POLICY "Allow public read for blog categories"
ON public.blog_categories
FOR SELECT
USING (true);

CREATE POLICY "Allow public read for blog category translations"
ON public.blog_category_translations
FOR SELECT
USING (true);

-- Admin write access (only super admins can manage categories)
CREATE POLICY "Allow admin to manage blog categories"
ON public.blog_categories
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

CREATE POLICY "Allow admin to manage blog category translations"
ON public.blog_category_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample categories
INSERT INTO public.blog_categories (slug, name, description) VALUES
  ('marketing', 'Marketing', 'Marketing strategies and best practices'),
  ('sales', 'Sales', 'Sales techniques and lead generation'),
  ('automation', 'Automation', 'Business process automation and AI'),
  ('product-updates', 'Product Updates', 'Latest features and improvements')
ON CONFLICT (slug) DO NOTHING;

-- Note: Translations will be added by the Gemini translation service
-- when categories are synced from Google Sheets or created via the admin UI
