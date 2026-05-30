'use server';

import { createClient } from '@/core/db/server';
import { revalidatePath } from 'next/cache';
import { getAccountContext } from '@/core/tenancy/account-context';

export async function getEventLogs(limit = 100) {
    const supabase = await createClient();
    const context = await getAccountContext();
    if (!context.ok) throw new Error(context.error);

    const { data, error } = await supabase
        .from('event_logs')
        .select('id, account_id, event_type, entity_type, entity_id, data, created_at')
        .eq('account_id', context.accountId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function logEvent(eventType: string, entityType: string, entityId?: string, data?: Record<string, unknown>, accountId?: string) {
    const supabase = await createClient();

    let targetAccountId = accountId;

    if (!targetAccountId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('account_id')
                .eq('id', user.id)
                .single();
            targetAccountId = profile?.account_id ?? undefined;
        }
    }

    if (!targetAccountId) {
        console.warn('logEvent: No accountId found and no user session.');
        return;
    }

    const { error } = await supabase.from('event_logs').insert({
        account_id: targetAccountId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        data: (data || {}) as import('@/shared/types').Database['public']['Tables']['event_logs']['Insert']['data'],
    });

    if (error) {
        console.error('Error logging event:', error);
    } else {
        revalidatePath('/admin/activity-log');
    }
}

export async function seedDemoLogs() {
    const supabase = await createClient();
    const context = await getAccountContext();
    if (!context.ok) throw new Error(context.error);

    const suffix = Math.floor(Math.random() * 9000) + 1000 // 4-digit random number
    const demoLogs = [
        {
            account_id: context.accountId,
            event_type: 'lead.created',
            entity_type: 'lead',
            entity_id: '123e4567-e89b-12d3-a456-426614174000',
            data: { name: `Can Özkan #${suffix}`, email: `can.oz.${suffix}@example.com`, source: 'WhatsApp' },
            created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
        },
        {
            account_id: context.accountId,
            event_type: 'meeting.booked',
            entity_type: 'meeting',
            entity_id: '123e4567-e89b-12d3-a456-426614174001',
            data: { lead_name: `Ayşe Demir #${suffix}`, time: 'Tomorrow at 14:00' },
            created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
        },
        {
            account_id: context.accountId,
            event_type: 'message.received',
            entity_type: 'conversation',
            data: { from: '+905551234567', text: 'Ürün fiyatları nedir?' },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
            account_id: context.accountId,
            event_type: 'settings.updated',
            entity_type: 'account',
            data: { section: 'AI Configuration', changed: 'response_style' },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        },
        {
            account_id: context.accountId,
            event_type: 'auth.login',
            entity_type: 'user',
            data: { ip: '192.168.1.1', browser: 'Chrome' },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
        {
            account_id: context.accountId,
            event_type: 'webhook.triggered',
            entity_type: 'webhook',
            data: { endpoint: 'https://crm.mybusiness.com/api/leads', status: 200 },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
        },
    ];

    await supabase.from('event_logs').insert(demoLogs);

    revalidatePath('/admin/activity-log');
}
