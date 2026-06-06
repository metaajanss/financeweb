'use server';

import { createClient } from '@/core/db/server';
import { createAdminClient } from '@/core/db/admin';
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
    // 1. Kullanıcının oturumunu doğrula
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
        console.error('[assertAdmin] getUser error:', authError.message);
    }
    
    if (!user) throw new Error('Unauthorized: No active session');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    
    // 2. Email bazlı kontrol (hızlı yol)
    if (user.email === adminEmail) return;

    // 3. Profil rol kontrolü — admin client ile (RLS'yi bypass eder)
    try {
        const adminSupabase = createAdminClient();
        const { data: profile, error: profileError } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[assertAdmin] Profile lookup error:', profileError.message);
        }

        if (profile?.role === 'admin') return;
    } catch (e: any) {
        console.error('[assertAdmin] Unexpected error during profile check:', e?.message);
    }

    throw new Error(`Forbidden: User ${user.email} is not an admin`);
}

export interface TopicInput {
    keywords: string[];
    tone: 'informative' | 'persuasive' | 'casual';
    length_words: number;
    posts_per_run: number;
    auto_publish: boolean;
    schedule_type: 'manual' | 'daily' | 'weekly';
    generation_mode: 'combined' | 'per_keyword';
}

export async function createTopicAction(input: TopicInput) {
    await assertAdmin();
    // Cast to any — new tables not yet in generated Supabase types
    const supabase = createAdminClient() as any;

    const { data, error } = await supabase
        .from('blog_generation_topics')
        .insert({
            keywords: input.keywords,
            tone: input.tone,
            length_words: input.length_words,
            posts_per_run: Math.min(Math.max(input.posts_per_run ?? 1, 1), 10),
            auto_publish: input.auto_publish,
            schedule_type: input.schedule_type,
            generation_mode: input.generation_mode,
            status: 'active',
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/super-admin/blog');
    return { success: true, topic: data };
}

export async function updateTopicAction(id: string, input: Partial<TopicInput> & { status?: 'active' | 'paused' }) {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const { error } = await supabase
        .from('blog_generation_topics')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/super-admin/blog');
    return { success: true };
}

export async function deleteTopicAction(id: string) {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const { error } = await supabase
        .from('blog_generation_topics')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/super-admin/blog');
    return { success: true };
}

export async function getTopicsAction() {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const { data, error } = await supabase
        .from('blog_generation_topics')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function getGenerationQueueAction(limit = 20) {
    await assertAdmin();
    const supabase = createAdminClient() as any;

    const { data, error } = await supabase
        .from('blog_generation_queue')
        .select('*, blog_generation_topics(keywords)')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function triggerGenerationAction(topicId: string) {
    await assertAdmin();

    const supabase = createAdminClient() as any;

    const { data: topic, error } = await supabase
        .from('blog_generation_topics')
        .select('*')
        .eq('id', topicId)
        .single();

    if (error || !topic) return { success: false, count: 0, titles: [], errors: ['Topic not found'] };

    const { generatePostFromTopic } = await import('@/features/blog/services/blog-generator');
    const result = await generatePostFromTopic(topic, 'manual');

    revalidatePath('/super-admin/blog');
    return result;
}
