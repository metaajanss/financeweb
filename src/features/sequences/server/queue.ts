"use server"

import { createClient } from '@/core/db/server'
import { getAccountContext } from '@/core/tenancy/account-context'

export type EnrollmentStatus = 'active' | 'failed' | 'pending' | 'paused' | 'completed';

export type HistoryItem = {
    id: string;
    lead_name: string;
    sequence_name: string;
    channel: string;
    event_type: string;
    step_index: number | null;
    created_at: string;
}

export type FailedEnrollment = {
    id: string;
    lead_name: string;
    sequence_name: string;
    current_step_index: number;
    retry_count: number;
    last_executed_at: string | null;
    error_message: string | null;
}

export type QueueItem = {
    id: string; // sequence_enrollments.id
    lead_name: string;
    sequence_name: string;
    channel: string;
    step_index: number;
    next_step_due_at: string;
    retry_count: number;
    status: EnrollmentStatus;
}

export async function getSequenceQueue(): Promise<QueueItem[]> {
    const context = await getAccountContext()
    if (!context.ok) return []

    const supabase = await createClient()
    const { data: enrollments, error } = await supabase
        .from('sequence_enrollments')
        .select(`
            id,
            status,
            current_step_index,
            next_step_due_at,
            retry_count,
            sequence:sequences(name, steps),
            lead:leads(first_name, last_name)
        `)
        .eq('account_id', context.accountId)
        .in('status', ['active', 'failed', 'pending'])
        .order('next_step_due_at', { ascending: true })
        .limit(100)

    if (error || !enrollments) {
        console.error('Error fetching queue:', error)
        return []
    }

    type QueueQueryResult = {
        id: string;
        status: EnrollmentStatus;
        current_step_index: number;
        next_step_due_at: string;
        retry_count: number;
        sequence: { name: string; steps: unknown[] } | null;
        lead: { first_name: string | null; last_name: string | null } | null;
    };

    return (enrollments as unknown as QueueQueryResult[]).map((e) => {
        const leadName = `${e.lead?.first_name || ''} ${e.lead?.last_name || ''}`.trim() || 'Unknown Lead'
        const steps = Array.isArray(e.sequence?.steps) ? e.sequence.steps as Record<string, string>[] : []
        const currentChannel = steps.length > e.current_step_index ? steps[e.current_step_index].channel : 'unknown'

        return {
            id: e.id,
            lead_name: leadName,
            sequence_name: e.sequence?.name || 'Deleted Sequence',
            channel: currentChannel,
            step_index: e.current_step_index,
            next_step_due_at: e.next_step_due_at,
            retry_count: e.retry_count,
            status: e.status
        }
    })
}

export async function getSequenceHistory(days: number = 30, page: number = 1, pageSize: number = 50): Promise<{ items: HistoryItem[]; total: number }> {
    const context = await getAccountContext()
    if (!context.ok) return { items: [], total: 0 }

    const supabase = await createClient()
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    // Count and data in parallel — single round-trip pair
    const [countResult, dataResult] = await Promise.all([
        supabase
            .from('sequence_events')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', context.accountId)
            .eq('event_type', 'sent')
            .gte('created_at', sinceDate.toISOString()),
        supabase
            .from('sequence_events')
            .select(`
                id,
                channel,
                event_type,
                created_at,
                metadata,
                lead:leads(first_name, last_name),
                sequence:sequences(name)
            `)
            .eq('account_id', context.accountId)
            .eq('event_type', 'sent')
            .gte('created_at', sinceDate.toISOString())
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1)
    ])

    const total = countResult.count ?? 0
    const events = dataResult.data

    if (countResult.error) console.error('Error counting history:', countResult.error)
    if (dataResult.error || !events) {
        console.error('Error fetching history:', dataResult.error)
        return { items: [], total }
    }

    type HistoryQueryResult = {
        id: string;
        channel: string;
        event_type: string;
        created_at: string;
        metadata: Record<string, unknown> | null;
        lead: { first_name: string | null; last_name: string | null } | null;
        sequence: { name: string } | null;
    };

    const historyItems: HistoryItem[] = (events as unknown as HistoryQueryResult[]).map((e) => {
        const leadName = `${e.lead?.first_name || ''} ${e.lead?.last_name || ''}`.trim() || 'Unknown Lead'
        const metadata = e.metadata || {}

        return {
            id: e.id,
            lead_name: leadName,
            sequence_name: e.sequence?.name || 'Deleted Sequence',
            channel: e.channel,
            event_type: e.event_type,
            step_index: typeof metadata.step_index === 'number' ? metadata.step_index : null,
            created_at: e.created_at
        }
    })

    return { items: historyItems, total }
}

export async function getFailedEnrollments(): Promise<FailedEnrollment[]> {
    const context = await getAccountContext()
    if (!context.ok) return []

    const supabase = await createClient()
    const { data: enrollments, error } = await supabase
        .from('sequence_enrollments')
        .select(`
            id,
            current_step_index,
            retry_count,
            last_executed_at,
            sequence:sequences(name),
            lead:leads(first_name, last_name)
        `)
        .eq('account_id', context.accountId)
        .eq('status', 'failed')
        .order('last_executed_at', { ascending: false })
        .limit(100)

    if (error || !enrollments) {
        console.error('Error fetching failed enrollments:', error)
        return []
    }

    type FailedQueryResult = {
        id: string;
        current_step_index: number;
        retry_count: number;
        last_executed_at: string | null;
        sequence: { name: string } | null;
        lead: { first_name: string | null; last_name: string | null } | null;
    };

    return (enrollments as unknown as FailedQueryResult[]).map((e) => {
        const leadName = `${e.lead?.first_name || ''} ${e.lead?.last_name || ''}`.trim() || 'Unknown Lead'

        return {
            id: e.id,
            lead_name: leadName,
            sequence_name: e.sequence?.name || 'Deleted Sequence',
            current_step_index: e.current_step_index,
            retry_count: e.retry_count,
            last_executed_at: e.last_executed_at,
            error_message: null
        }
    })
}

export async function cancelEnrollment(enrollmentId: string) {
    const context = await getAccountContext()
    if (!context.ok) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', enrollmentId)
        .eq('account_id', context.accountId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function retryEnrollment(enrollmentId: string) {
    const context = await getAccountContext()
    if (!context.ok) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('sequence_enrollments')
        .update({
            retry_count: 0,
            status: 'active',
            next_step_due_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId)
        .eq('account_id', context.accountId)

    if (error) return { error: error.message }
    return { success: true }
}
