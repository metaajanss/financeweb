'use server';

import { createClient } from '@/core/db/server';
import { createAdminClient } from '@/core/db/admin';
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    if (profile?.role !== 'admin' && user.email !== adminEmail) {
        throw new Error('Forbidden');
    }
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
