import { createAdminClient } from '@/core/db/admin';
import { fetchWithRetry } from '@/core/http/fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface GenerationTopic {
    id: string;
    keywords: string[];
    tone: string;
    length_words: number;
    target_locale: string;
    auto_publish: boolean;
    schedule_type: string;
    generation_mode: string;    // 'combined' | 'per_keyword'
    posts_per_run: number;      // how many posts to generate each run
    last_run_at: string | null;
    last_keyword_index: number;
}

interface GeneratedPost {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    seo_title: string;
    seo_description: string;
    seo_keywords: string[];
    reading_time_minutes: number;
}

function buildGenerationPrompt(keywords: string[], tone: string, lengthWords: number, angleHint = ''): string {
    const toneDesc = {
        informative: 'professional, educational and fact-driven',
        persuasive: 'persuasive, authoritative and action-oriented',
        casual: 'conversational, friendly and approachable',
    }[tone] ?? 'professional and informative';

    const keywordContext = keywords.length === 1
        ? `the following keyword: ${keywords[0]}`
        : `the following keywords: ${keywords.join(', ')}`;

    const angleClause = angleHint
        ? `\n- Approach the topic from this specific angle: ${angleHint}`
        : '';

    return `You are an expert content writer for Jumpix, a premium B2B SaaS platform for lead management and outreach automation.

Write a complete, high-quality blog post in English based on ${keywordContext}.

REQUIREMENTS:
- Tone: ${toneDesc}
- Target length: approximately ${lengthWords} words
- Write in proper Markdown (use ##, ###, **bold**, bullet lists, etc.)
- Include a compelling introduction and a clear conclusion
- Focus on actionable insights relevant to B2B sales and marketing professionals
- Do NOT mention competitor products by name${angleClause}

RETURN ONLY a valid JSON object (no markdown code fences) with this exact structure:
{
  "title": "Compelling blog post title (max 70 chars)",
  "slug": "url-friendly-slug-from-title",
  "excerpt": "One-paragraph summary of the post (2-3 sentences, plain text, max 200 chars)",
  "content": "Full Markdown content here...",
  "seo_title": "SEO optimized title (max 60 chars)",
  "seo_description": "Meta description for search engines (max 160 chars)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "reading_time_minutes": 5
}`;
}

// Different angles so multiple posts on the same keywords don't duplicate content
const COMBINED_ANGLES = [
    'beginner guide and fundamentals',
    'advanced strategies and best practices',
    'common mistakes and how to avoid them',
    'real-world examples and case studies',
    'tools, frameworks and step-by-step implementation',
    'trends and future outlook',
    'ROI measurement and analytics',
    'quick wins and actionable tips',
    'comparison of different approaches',
    'industry-specific deep dive',
];

function normalizeSlug(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

async function ensureUniqueSlug(supabase: any, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let attempt = 0;
    const MAX_ATTEMPTS = 100;
    while (attempt <= MAX_ATTEMPTS) {
        const { data } = await supabase
            .from('posts')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
        if (!data) return slug;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
    }
    throw new Error(`Could not generate unique slug for "${baseSlug}" after ${MAX_ATTEMPTS} attempts`);
}

async function createSinglePost(
    supabase: any,
    topic: GenerationTopic,
    keywords: string[],
    queueEntryId: string,
    angleHint = '',
): Promise<{ success: boolean; postId?: string; title?: string; error?: string }> {
    const prompt = buildGenerationPrompt(keywords, topic.tone, topic.length_words, angleHint);

    const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeoutMs: 60_000,
            retries: 2,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(`Gemini Error: ${errData.error?.message ?? res.statusText}`);
    }

    const geminiData = await res.json();
    const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const generated: GeneratedPost = JSON.parse(rawJson);

    const slug = await ensureUniqueSlug(supabase, normalizeSlug(generated.slug || generated.title));

    const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
            title: generated.title,
            slug,
            content: generated.content,
            excerpt: generated.excerpt,
            seo_title: generated.seo_title,
            seo_description: generated.seo_description,
            seo_keywords: generated.seo_keywords,
            reading_time_minutes: generated.reading_time_minutes ?? Math.ceil(topic.length_words / 200),
            published: topic.auto_publish,
            published_at: topic.auto_publish ? new Date().toISOString() : null,
        })
        .select()
        .single();

    if (postError) throw new Error(postError.message);

    // Mark generation queue entry as completed first
    await supabase
        .from('blog_generation_queue')
        .update({
            status: 'completed',
            post_id: post.id,
            generated_title: generated.title,
            completed_at: new Date().toISOString(),
        })
        .eq('id', queueEntryId);

    // Trigger translations immediately (don't wait for cron)
    const { ACTIVE_LOCALES } = await import('@/config/locales');
    const { translatePost } = await import('@/core/i18n/translation-engine');
    const translationLocales = ACTIVE_LOCALES.filter((l) => l !== 'en');

    if (translationLocales.length > 0) {
        // Fire and forget — don't block post creation on translation completion
        Promise.allSettled(
            translationLocales.map((locale) => translatePost(post.id, locale))
        ).then((results) => {
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
            if (failed.length > 0) {
                console.warn(`[BlogGenerator] ${failed.length}/${translationLocales.length} translations failed for post ${post.id}`);
            }
        });
    }

    return { success: true, postId: post.id, title: generated.title };
}

export async function generatePostFromTopic(
    topic: GenerationTopic,
    triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<{ success: boolean; count: number; titles: string[]; errors: string[] }> {
    if (!GEMINI_API_KEY) return { success: false, count: 0, titles: [], errors: ['GEMINI_API_KEY is not configured'] };

    const supabase = createAdminClient() as any;
    const postsPerRun = Math.min(Math.max(topic.posts_per_run ?? 1, 1), 10);

    const titles: string[] = [];
    const errors: string[] = [];
    let keywordIndex = topic.last_keyword_index ?? 0;

    for (let i = 0; i < postsPerRun; i++) {
        // Create a queue entry for each post
        const { data: queueEntry, error: queueError } = await supabase
            .from('blog_generation_queue')
            .insert({ topic_id: topic.id, status: 'processing', triggered_by: triggeredBy })
            .select()
            .single();

        if (queueError) { errors.push(queueError.message); continue; }

        try {
            let result: { success: boolean; postId?: string; title?: string; error?: string };

            if (topic.generation_mode === 'per_keyword') {
                const idx = keywordIndex % topic.keywords.length;
                result = await createSinglePost(supabase, topic, [topic.keywords[idx]], queueEntry.id);
                keywordIndex++;
            } else {
                // combined: rotate through content angles so posts don't duplicate
                const angle = COMBINED_ANGLES[i % COMBINED_ANGLES.length];
                result = await createSinglePost(supabase, topic, topic.keywords, queueEntry.id, i > 0 ? angle : '');
            }

            if (result.success && result.title) titles.push(result.title);
            else if (result.error) errors.push(result.error);
        } catch (err: any) {
            errors.push(err.message);
            await supabase
                .from('blog_generation_queue')
                .update({ status: 'failed', error_message: err.message, completed_at: new Date().toISOString() })
                .eq('id', queueEntry.id);
        }
    }

    // Update topic state after all posts
    const updatePayload: any = { last_run_at: new Date().toISOString() };
    if (topic.generation_mode === 'per_keyword') {
        updatePayload.last_keyword_index = keywordIndex % topic.keywords.length;
    }
    await supabase.from('blog_generation_topics').update(updatePayload).eq('id', topic.id);

    return { success: titles.length > 0, count: titles.length, titles, errors };
}

function isDue(topic: { schedule_type: string; last_run_at: string | null }): boolean {
    if (topic.schedule_type === 'manual') return false;
    const now = Date.now();
    const lastRun = topic.last_run_at ? new Date(topic.last_run_at).getTime() : 0;
    const elapsed = now - lastRun;
    if (topic.schedule_type === 'daily') return elapsed >= 23 * 60 * 60 * 1000;
    if (topic.schedule_type === 'weekly') return elapsed >= 6 * 24 * 60 * 60 * 1000;
    return false;
}

export async function processGenerationQueue(limit = 3): Promise<{ processed: number; message: string; error?: string }> {
    const supabase = createAdminClient() as any;

    try {
        const { data: topics } = await supabase
            .from('blog_generation_topics')
            .select('*')
            .eq('status', 'active')
            .neq('schedule_type', 'manual')
            .order('last_run_at', { ascending: true, nullsFirst: true })
            .limit(limit * 2);

        if (!topics || topics.length === 0) return { processed: 0, message: 'No active scheduled topics' };

        const due = (topics as GenerationTopic[]).filter(isDue).slice(0, limit);
        if (due.length === 0) return { processed: 0, message: 'No topics due for generation' };

        const results = await Promise.allSettled(due.map((t) => generatePostFromTopic(t, 'cron')));

        const totalPosts = results.reduce((sum, r) =>
            r.status === 'fulfilled' ? sum + r.value.count : sum, 0);

        return { processed: totalPosts, message: `Generated ${totalPosts} posts from ${due.length} topics` };
    } catch (err: any) {
        console.error('[BlogGenerator] processGenerationQueue error:', err.message);
        return { processed: 0, message: 'Queue processing error', error: err.message };
    }
}
