"use server"

import { createClient } from '@/core/db/server'
import { getAccountContext } from '@/core/tenancy/account-context'
import { revalidatePath } from 'next/cache'

export type SequenceStep = {
    delay_hours: number
    message_template: string
    template_subject?: string
    message_template_b?: string
    template_subject_b?: string
    ab_test_enabled?: boolean
    channel: 'email' | 'whatsapp' | 'sms'
    from_gmail_id?: string  // specific Gmail integration to send from (set in flow builder)
    template_id?: string
    ai_icebreaker?: boolean
    ai_autopilot?: boolean
}

export type SequenceMetrics = {
    enrolled: number
    active: number
    completed: number
    email: {
        sent: number
        opened: number
        replied: number
    }
    whatsapp: {
        sent: number
        opened: number
        replied: number
    }
    failed: number
    revenue?: number
}

export type Sequence = {
    id: string
    account_id: string
    name: string
    trigger_type: 'instant' | 'now' | 'no_response' | 'meeting_booked' | 'lead_created' | 'custom' | 'hubspot_lead' | 'salesforce_lead' | 'pipedrive_lead' | 'zoho_lead'
    lead_type?: string
    steps: SequenceStep[]
    is_active: boolean
    metrics?: SequenceMetrics
    performanceScore?: number // Calculated score 0-100 based on open/reply rates
    created_at: string
}

/**
 * Get all sequences for current account with real metrics from sequence_events
 */
export async function getSequences(): Promise<Sequence[]> {
    const context = await getAccountContext()
    if (!context.ok) return []

    const supabase = await createClient()
    const { data: sequences, error } = await supabase
        .from('sequences')
        .select('id, account_id, name, trigger_type, lead_type, steps, is_active, created_at')
        .eq('account_id', context.accountId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching sequences:', error)
        return []
    }

    const seqList = (sequences as any[] || [])
    if (seqList.length === 0) return []

    const sequenceIds = seqList.map((s: any) => s.id)

    // Fetch aggregated metrics from DB in two parallel queries (no raw row transfer)
    const [eventsAgg, enrollmentsAgg] = await Promise.all([
        (supabase as any).rpc('get_sequence_metrics_batch', { p_sequence_ids: sequenceIds }),
        (supabase as any).rpc('get_sequence_enrollment_counts', { p_sequence_ids: sequenceIds })
    ])

    // Build metrics map from pre-aggregated DB data
    const metricsMap: Record<string, SequenceMetrics> = {}
    for (const seq of seqList) {
        metricsMap[seq.id] = {
            enrolled: 0, active: 0, completed: 0, failed: 0,
            email: { sent: 0, opened: 0, replied: 0 },
            whatsapp: { sent: 0, opened: 0, replied: 0 },
            revenue: 0
        }
    }

    // Process pre-aggregated event metrics
    if (eventsAgg.data) {
        for (const row of eventsAgg.data as { sequence_id: string; channel: string; event_type: string; cnt: number }[]) {
            const m = metricsMap[row.sequence_id]
            if (!m) continue
            const count = Number(row.cnt || 0)
            if (row.channel === 'email') {
                if (row.event_type === 'sent') m.email.sent = count
                if (row.event_type === 'opened') m.email.opened = count
                if (row.event_type === 'replied') m.email.replied = count
            } else if (row.channel === 'whatsapp') {
                if (row.event_type === 'sent') m.whatsapp.sent = count
                if (row.event_type === 'opened') m.whatsapp.opened = count
                if (row.event_type === 'replied') m.whatsapp.replied = count
            }
        }
    }

    // Process pre-aggregated enrollment counts
    if (enrollmentsAgg.data) {
        for (const row of enrollmentsAgg.data as { sequence_id: string; status: string; cnt: number }[]) {
            const m = metricsMap[row.sequence_id]
            if (!m) continue
            const count = Number(row.cnt || 0)
            m.enrolled += count
            if (row.status === 'active') m.active = count
            if (row.status === 'completed') m.completed = count
            if (row.status === 'failed') m.failed = count
        }
    }

    return seqList.map((seq: any) => ({
        ...seq,
        steps: seq.steps as unknown as SequenceStep[],
        metrics: metricsMap[seq.id]
    })) as Sequence[]
}

/**
 * Create new sequence
 */
export async function createSequence(data: {
    name: string
    trigger_type: 'instant' | 'no_response' | 'meeting_booked' | 'lead_created' | 'custom' | 'hubspot_lead' | 'salesforce_lead' | 'pipedrive_lead' | 'zoho_lead'
    lead_type?: string
    steps: SequenceStep[]
    is_active?: boolean
}) {
    const context = await getAccountContext()

    if (!context.ok) return { error: context.error }

    const profile = context.profile
    if (profile.role === 'member') {
        return { error: 'Members do not have permission to create sequences' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('sequences')
        .insert({
            account_id: context.accountId,
            ...data,
            is_active: data.is_active ?? true
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings/sequences')
    return { success: true }
}

/**
 * Update sequence
 */
export async function updateSequence(id: string, data: Partial<Sequence>) {
    const context = await getAccountContext()

    if (!context.ok) return { error: context.error }

    if (context.profile.role === 'member') {
        return { error: 'Members do not have permission to update sequences' }
    }

    const supabase = await createClient()

    // Omit virtual properties that don't map to database columns
    const { metrics, performanceScore, ...updateData } = data

    const { error } = await supabase
        .from('sequences')
        .update(updateData)
        .eq('id', id)
        .eq('account_id', context.accountId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings/sequences')
    return { success: true }
}

/**
 * Delete sequence
 */
export async function deleteSequence(id: string) {
    const context = await getAccountContext()

    if (!context.ok) return { error: context.error }

    if (context.profile.role === 'member') {
        return { error: 'Members do not have permission to delete sequences' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id)
        .eq('account_id', context.accountId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings/sequences')
    return { success: true }
}
