-- Migration: Create blog_tags and blog_tag_translations tables
-- Date: 2026-04-08
-- Description: Creates tables for blog tags with multi-language support

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- Add comment to table
COMMENT ON TABLE blog_tags IS 'Stores blog tags (English names as source)';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly unique identifier for the tag';
COMMENT ON COLUMN blog_tags.name IS 'English name of the tag';

-- Create blog_tag_translations table
CREATE TABLE IF NOT EXISTS blog_tag_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  CONSTRAINT unique_tag_locale UNIQUE(tag_id, locale)
);

-- Create index on (tag_id, locale) for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tag_translations_tag_locale ON blog_tag_translations(tag_id, locale);

-- Add comments to table
COMMENT ON TABLE blog_tag_translations IS 'Stores translated tag names for all supported locales';
COMMENT ON COLUMN blog_tag_translations.tag_id IS 'Foreign key to blog_tags table';
COMMENT ON COLUMN blog_tag_translations.locale IS 'Locale code (e.g., tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN blog_tag_translations.translated_name IS 'Translated tag name for the locale';
