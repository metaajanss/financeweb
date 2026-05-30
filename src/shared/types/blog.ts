// Blog system TypeScript types and interfaces
// Requirements: 1.2, 2.4, 6.1, 6.2, 12.1

// ─── Core Blog Post ───────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  author_id: string | null
  published: boolean
  published_at: string | null
  featured_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  reading_time_minutes: number | null
  view_count: number
  created_at: string
  updated_at: string
}

// ─── Translations ─────────────────────────────────────────────────────────────

export interface BlogPostTranslation {
  id: string
  post_id: string
  locale: string
  translated_title: string
  translated_content: string
  translated_excerpt: string | null
  translated_seo_title: string | null
  translated_seo_description: string | null
  created_at: string
  updated_at: string
}

export interface BlogPostWithTranslation extends BlogPost {
  translation: BlogPostTranslation | null
  author: {
    full_name: string | null
    avatar_url: string | null
  } | null
  categories: CategoryWithTranslation[]
  tags: TagWithTranslation[]
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface BlogCategory {
  id: string
  slug: string
  name: string
  description: string | null
  created_at: string
}

export interface CategoryWithTranslation extends BlogCategory {
  translation: { translated_name: string; translated_description?: string | null } | null
}

export interface CategoryWithCount extends CategoryWithTranslation {
  post_count: number
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface BlogTag {
  id: string
  slug: string
  name: string
  created_at: string
}

export interface TagWithTranslation extends BlogTag {
  translation: { translated_name: string } | null
}

export interface TagWithCount extends TagWithTranslation {
  post_count: number
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ViewMetadata {
  referrer?: string
  user_agent?: string
  country_code?: string
}

export interface AnalyticsData {
  total_views: number
  views_by_locale: Record<string, number>
  views_by_post: Array<{
    post_id: string
    title: string
    views: number
  }>
  views_over_time: Array<{
    date: string
    views: number
  }>
}

// ─── Google Sheets Import ─────────────────────────────────────────────────────

export interface BlogSheetsRow {
  Title: string
  Slug?: string
  Content: string
  Excerpt?: string
  Author?: string
  Published?: string
  Categories?: string
  Tags?: string
  SEO_Title?: string
  SEO_Description?: string
  Featured_Image?: string
}

export interface BlogImportSummary {
  imported: number
  updated: number
  skipped: number
  translated: number
  errors: string[]
}

// ─── Publication State ────────────────────────────────────────────────────────

export type PublicationState = 'draft' | 'scheduled' | 'published'

export interface BlogTranslationData {
  translated_title: string
  translated_content: string
  translated_excerpt: string | null
  translated_seo_title: string | null
  translated_seo_description: string | null
}
