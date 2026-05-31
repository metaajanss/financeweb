import { createAdminClient } from '@/core/db/admin'
import { fetchWithRetry } from '@/core/http/fetch'


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Translates a blog post using Gemini AI
 * @param postId The ID of the post in the blog_posts table
 * @param targetLocale The destination language (e.g., 'tr', 'de', 'ar')
 * @returns Object with success status and any error message
 */
export async function translatePost(postId: string, targetLocale: string): Promise<{ success: boolean; error?: string }> {
    if (!GEMINI_API_KEY) return { success: false, error: 'Gemini API key is not configured' };

    const supabase = createAdminClient();

    try {
        // 1. Fetch Source Content (EN)
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (fetchError || !post) return { success: false, error: 'Source post not found' };

        // 2. Build Translation Prompt
        const isRTL = ['ar', 'fa', 'he'].includes(targetLocale);
        const prompt = `
            You are a professional multi-language blog translator for Payoff Lab, a premium B2B SaaS platform.
            Your task is to translate the following blog post content from English into ${targetLocale}.

            CRITICAL RULES:
            - MAINTAIN the exact Markdown formatting, HTML tags, and code blocks.
            - DO NOT translate proper names, "Payoff Lab", URLs, or image alt tags unless contextually necessary.
            - ENSURE the tone is professional, premium, and modern.
            - ${isRTL ? 'Note: This is a Right-To-Left (RTL) language. Preserve the reading direction logic.' : ''}

            TRANSLATE THESE FIELDS:
            1. TITLE: ${post.title}
            2. EXCERPT: ${post.excerpt}
            3. CONTENT: 
            ---
            ${post.content}
            ---
 
            RETURN ONLY A JSON OBJECT as follows:
            {
                "translated_title": "...",
                "translated_content": "...",
                "translated_excerpt": "..."
            }
        `;
 
        // 3. Call Gemini
        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 30000,
                retries: 2,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        maxOutputTokens: 8192, 
                        temperature: 0.1, // Low temp for more accurate translation
                        responseMimeType: 'application/json'
                    }
                })
            }
        );
 
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(`Gemini Error: ${errData.error?.message || res.statusText}`);
        }
 
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const translated: Record<string, string> = JSON.parse(rawJson);
 
        // 4. Save Translation to Database
        const { error: saveError } = await supabase
            .from('post_translations')
            .upsert({
                post_id: postId,
                language: targetLocale,
                title: translated.translated_title,
                content: translated.translated_content,
                excerpt: translated.translated_excerpt,
                slug: post.slug, // Reusing EN slug
            }, { onConflict: 'post_id, language' });
 
        if (saveError) throw saveError;
 
        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        console.error(`[TranslationEngine] Error translating ${postId} to ${targetLocale}:`, err);
        return { success: false, error: err.message };
    }
}

/**
 * Processes the blog translation queue in background
 */
export async function processTranslationQueue(limit = 5): Promise<void> {
    const supabase = createAdminClient();

    // 1. Get Pending Tasks
    const { data: queueItems } = await supabase
        .from('blog_translation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

    if (!queueItems || queueItems.length === 0) return;

    // Mark all items as processing in one batch update
    await supabase
        .from('blog_translation_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .in('id', queueItems.map((i) => i.id));

    // Translate all items in parallel
    await Promise.allSettled(
        queueItems.map(async (item) => {
            const result = await translatePost(item.post_id, item.target_locale);
            const ts = new Date().toISOString();

            if (result.success) {
                await supabase
                    .from('blog_translation_queue')
                    .update({ status: 'completed', updated_at: ts })
                    .eq('id', item.id);
            } else {
                await supabase
                    .from('blog_translation_queue')
                    .update({ status: 'failed', error_message: result.error, updated_at: ts })
                    .eq('id', item.id);
            }
        })
    );
}

/**
 * Detects the language of a given text using Gemini AI
 * @param text The text to analyze
 * @returns 2-letter ISO language code (e.g., 'en', 'tr') or 'en' as default
 */
export async function detectLanguage(text: string): Promise<string> {
    if (!GEMINI_API_KEY || !text.trim()) return 'en';

    try {
        const prompt = `
            Analyze the following text and return ONLY its 2-letter ISO 639-1 language code (e.g., 'en', 'tr', 'de', 'es', 'fr').
            If you cannot determine the language, return 'en'.
            Do not include any other text or explanation.

            TEXT:
            ---
            ${text.substring(0, 500)} // Only need the beginning to detect
            ---
        `;

        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 10000,
                retries: 1,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        maxOutputTokens: 5, 
                        temperature: 0.1
                    }
                })
            }
        );

        if (!res.ok) return 'en';

        const data = await res.json();
        const code = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
        
        // Simple validation for 2-letter code
        if (code && code.length === 2) {
            return code;
        }
        return 'en';
    } catch (error) {
        console.error('[TranslationEngine] Language detection failed:', error);
        return 'en';
    }
}

/**
 * Translates email subject and body dynamically
 */
export async function translateEmail(subject: string, body: string, targetLocale: string): Promise<{subject: string, body: string}> {
    if (!GEMINI_API_KEY) return { subject, body };
    if (targetLocale === 'en') return { subject, body }; // Assuming base is EN

    try {
        const prompt = `
            You are a professional B2B SaaS email translator.
            Translate the following email subject and body from English into ${targetLocale}.
            
            CRITICAL RULES:
            - Maintain all HTML tags, formatting, and dynamic variables (like {{first_name}} or {{company_name}}).
            - Keep the tone professional, persuasive, and appropriate for B2B sales.
            - DO NOT translate "Payoff Lab" or other clear brand names unless necessary.

            RETURN ONLY A JSON OBJECT:
            {
                "subject": "...",
                "body": "..."
            }

            SUBJECT: ${subject}
            BODY:
            ${body}
        `;

        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 20000,
                retries: 2,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        maxOutputTokens: 2048, 
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!res.ok) return { subject, body };

        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const translated = JSON.parse(rawJson);
        
        return {
            subject: translated.subject || subject,
            body: translated.body || body
        };
    } catch (error) {
        console.error('[TranslationEngine] Email translation failed:', error);
        return { subject, body }; // Fallback to original
    }
}
