-- Add missing SEO columns to post_translations table
-- Task 1.2: Create blog_post_translations table (modified to add columns to existing table)
-- Requirement 10.2: Blog post translations table with SEO fields

-- Add translated_seo_title column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_title TEXT;

-- Add translated_seo_description column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.post_translations.translated_seo_title IS 'Translated SEO meta title for search engines (50-60 characters recommended)';
COMMENT ON COLUMN public.post_translations.translated_seo_description IS 'Translated SEO meta description for search engines (150-160 characters recommended)';
