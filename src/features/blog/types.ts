/**
 * Blog Feature - Type Definitions
 */

export interface PostData {
    title: string
    slug: string
    content: string
    excerpt: string
    cover_image: string
    published: boolean
}

export interface PostTranslationData {
    post_id: string
    language: string
    title: string
    slug: string
    content: string
    excerpt: string
}

export interface TopicInput {
    keywords: string[]
    tone: 'informative' | 'persuasive' | 'casual'
    length_words: number
    posts_per_run: number
    auto_publish: boolean
    schedule_type: 'manual' | 'daily' | 'weekly'
    generation_mode: 'combined' | 'per_keyword'
}

export interface BlogSyncConfig {
    spreadsheetId: string
    sheetName?: string
    mapping: {
        title: string
        content: string
        slug?: string
        excerpt?: string
        published?: string
        featured_image?: string
        categories?: string
        tags?: string
        sheet_id?: string
    }
}

export interface GenerationTopic {
    id: string
    keywords: string[]
    tone: string
    length_words: number
    target_locale: string
    auto_publish: boolean
    schedule_type: string
    generation_mode: string
    posts_per_run: number
    last_run_at: string | null
    last_keyword_index: number
}

export interface GeneratedPost {
    title: string
    slug: string
    content: string
    excerpt: string
    seo_title: string
    seo_description: string
    seo_keywords: string[]
    reading_time_minutes: number
}
