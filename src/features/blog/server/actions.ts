'use server';

import { createClient } from '@/core/db/server';
import { revalidatePath } from 'next/cache';
import type { PostData, PostTranslationData } from '../types';

export type { PostData, PostTranslationData };

export async function getPosts(includeDrafts: boolean = false, locale: string = 'en', supabaseClient?: any) {
    const supabase = supabaseClient || await createClient();

    let query = supabase
        .from('posts')
        .select('*, profiles(full_name, avatar_url), post_translations(*)')
        .order('created_at', { ascending: false }) as any;

    if (!includeDrafts) {
        query = query.eq('published', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching posts:', error);
        throw new Error(error.message); // Throwing so the client's try-catch catches it
    }

    // Map content based on locale
    return (data || []).map((post: any) => {
        const translation = post.post_translations?.find((t: any) => t.language === locale);
        return {
            ...post,
            title: translation?.title || post.title,
            content: translation?.content || post.content,
            excerpt: translation?.excerpt || post.excerpt,
            slug: translation?.slug || post.slug,
            is_translated: !!translation
        };
    });
}

export async function getPostBySlug(slug: string, locale: string = 'en') {
    const supabase = await createClient();

    // First try to find in translations (if it's a localized slug)
    const { data: translation } = await supabase
        .from('post_translations')
        .select('*, posts(*, profiles(full_name, avatar_url))')
        .eq('slug', slug)
        .eq('language', locale)
        .maybeSingle() as any;

    if (translation) {
        const post = translation.posts;
        return {
            ...post,
            title: translation.title,
            content: translation.content,
            excerpt: translation.excerpt,
            slug: translation.slug,
            profiles: post.profiles
        };
    }

    // Otherwise find in original posts
    const { data: post, error } = await supabase
        .from('posts')
        .select('*, profiles(full_name, avatar_url), post_translations(*)')
        .eq('slug', slug)
        .maybeSingle() as any;

    if (error || !post) return null;

    // Fallback to translation if it exists for this locale (but user entered original slug)
    const localizedData = post.post_translations?.find((t: any) => t.language === locale);
    
    return {
        ...post,
        title: localizedData?.title || post.title,
        content: localizedData?.content || post.content,
        excerpt: localizedData?.excerpt || post.excerpt,
        slug: localizedData?.slug || post.slug
    };
}

export async function getPostById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching post:', error);
        return null;
    }

    return data;
}

export async function createPost(data: PostData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const isAdmin = profile?.role === 'admin' || user.email === adminEmail;
    if (!isAdmin) {
        throw new Error('Forbidden');
    }

    const { error } = await supabase.from('posts').insert({
        ...data,
        author_id: user.id,
        published_at: data.published ? new Date().toISOString() : null,
    });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/blog');
    revalidatePath('/super-admin/blog');
}

export async function updatePost(id: string, data: PostData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const isAdmin = profile?.role === 'admin' || user.email === adminEmail;
    if (!isAdmin) {
        throw new Error('Forbidden');
    }

    const { error } = await supabase
        .from('posts')
        .update({
            ...data,
            published_at: data.published ? new Date().toISOString() : null,
        })
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/blog');
    revalidatePath('/super-admin/blog');
}

export async function deletePost(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const isAdmin = profile?.role === 'admin' || user.email === adminEmail;
    if (!isAdmin) {
        throw new Error('Forbidden');
    }

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/blog');
    revalidatePath('/super-admin/blog');
}

export async function getTranslationsForPost(postId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('post_translations')
        .select('*')
        .eq('post_id', postId);
    
    if (error) {
        console.error('Error fetching translations:', error);
        return [];
    }
    return data;
}

export async function upsertTranslation(data: PostTranslationData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('post_translations')
        .upsert(data, { onConflict: 'post_id,language' });

    if (error) throw new Error(error.message);

    revalidatePath('/blog');
    revalidatePath('/super-admin/blog');
}

export async function translateContentAction(content: string, targetLanguage: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('API key not configured');

    const prompt = `Translate the following markdown content to ${targetLanguage}. Keep all markdown formatting, URLs, and image tags intact: \n\n${content}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: prompt }]
        })
    });

    const result = await response.json();
    return result.choices[0].message.content;
}

/**
 * Triggers blog sync from Google Sheets
 */
export async function triggerBlogSyncAction(integrationId: string) {
    const { syncBlogFromSheets } = await import('@/features/blog/services/blog-sync');
    try {
        const result = await syncBlogFromSheets(integrationId);
        revalidatePath('/super-admin/blog');
        return { success: true, result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Manually trigger translation for a post and locale
 */
export async function manualTranslatePostAction(postId: string, locale: string) {
    const { translatePost } = await import('@/core/i18n/translation-engine');
    const result = await translatePost(postId, locale);
    if (result.success) {
        revalidatePath('/super-admin/blog');
    }
    return result;
}

/**
 * Get Google Sheets integrations available for blog sync
 */
export async function getBlogIntegrationsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

    if (!profile?.account_id) return [];

    const { data, error } = await supabase
        .from('integrations')
        .select('id, provider, status, config, last_synced_at')
        .eq('provider', 'google_sheets')
        .eq('account_id', profile.account_id);

    if (error) throw error;
    return data || [];
}

/**
 * Update sync config for an integration
 */
export async function updateBlogSyncConfigAction(integrationId: string, config: any) {
    const { createAdminClient } = await import('@/core/db/admin');
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('integrations')
        .update({ config })
        .eq('id', integrationId);

    if (error) throw error;
    
    revalidatePath('/super-admin/blog');
    return { success: true };
}
