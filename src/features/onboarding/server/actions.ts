'use server';

import { createClient } from '@/core/db/server';
import { revalidatePath } from 'next/cache';

export async function completeOnboarding(data: {
    timezone: string;
    workingHours: { start: string; end: string };
    calendarProvider: string;
    questions: any[];
    channels: { whatsapp: string; gmail: string };
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'User not found' };
    }

    try {
        // 1. Get Profile to find account_id
        const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single();

        if (profileFetchError || !profile?.account_id) {
            return { success: false, message: 'Account not found for user' };
        }

        // 2. Update Profile (Mark onboarding as completed)
        await supabase
            .from('profiles')
            .update({
                onboarding_completed: true as any, // Cast as any if type sync failed
                avatar_url: user.user_metadata?.avatar_url || null,
                full_name: user.user_metadata?.full_name || 'User'
            })
            .eq('id', user.id);

        // 3. Update Account Settings (Timezone, AI Config)
        const ai_config = {
            qualification_questions: data.questions,
            onboarding_data: {
                working_hours: data.workingHours,
                calendar_provider: data.calendarProvider,
                channels: data.channels
            }
        };

        const { error: accountError } = await supabase
            .from('accounts')
            .update({
                timezone: data.timezone as any,
                ai_config: ai_config as any
            })
            .eq('id', profile.account_id);

        if (accountError) {
            console.error('Account settings update error:', accountError);
            return { success: false, message: 'Failed to update account settings' };
        }


        revalidatePath('/admin');
        revalidatePath('/onboarding');

        return { success: true };

    } catch (error: any) {
        console.error('Onboarding error:', error);
        return { success: false, message: error.message };
    }
}
