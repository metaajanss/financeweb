'use server';

import { createClient } from '@/core/db/server';
import { logEvent } from '@/features/notifications/server/activity-log';

export async function exportUserData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

    if (!profile?.account_id) throw new Error('Account not found');

    // Fetch all related data
    const [leads, conversations, meetings, integrations] = await Promise.all([
        supabase.from('leads').select('*').eq('account_id', profile.account_id),
        supabase.from('conversations').select('*, messages(*)').eq('account_id', profile.account_id),
        supabase.from('meetings').select('*').eq('account_id', profile.account_id),
        supabase.from('integrations').select('*').eq('account_id', profile.account_id),
    ]);

    const exportData = {
        profile: user,
        leads: leads.data,
        conversations: conversations.data,
        meetings: meetings.data,
        integrations: integrations.data,
        exported_at: new Date().toISOString(),
    };

    await logEvent('data.exported', 'account', profile.account_id, { type: 'GDPR_EXPORT' });

    // Deep clone to strip any null prototypes or non-serializable elements from Supabase objects
    // prevents React Error #418 (serialization error for Server Actions)
    return JSON.parse(JSON.stringify(exportData));
}

export async function requestDataDeletion() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

    if (!profile?.account_id) throw new Error('Account not found');

    // In a real app, this might create a manual review task or flag the account.
    // For GDPR compliance, we will log it and notify admin.
    await logEvent('data.deletion_requested', 'account', profile.account_id, {
        user_id: user.id,
        email: user.email
    });

    // We can also use public.notifications to alert the user it's received
    await supabase.from('notifications').insert({
        user_id: user.id,
        account_id: profile.account_id,
        title: 'Data Deletion Request Received',
        message: 'Your request to delete all data has been received and will be processed within 30 days as per GDPR regulations.',
        type: 'warning'
    });

    return { success: true };
}
