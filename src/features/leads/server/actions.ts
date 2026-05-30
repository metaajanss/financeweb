'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { unstable_cache } from 'next/cache'
import { logEvent } from '@/features/notifications/server/activity-log'
import { triggerWebhook } from '@/core/webhooks/dispatch'
import { sendSlackNotification } from '@/features/integrations/providers/messaging/slack'
import { sendDiscordNotification } from '@/features/integrations/providers/messaging/discord'
import { notifyAdmins } from '@/features/notifications/server/actions'
import { getIntegrations } from '@/features/settings'
import { syncLeadToActiveCRMs } from '@/features/integrations/providers/crm/sync'
import { enrollLeadInSequences, enrollLeadInSequencesBulk } from '@/features/sequences/services/enroll'
import { appendLeadToSheet } from '@/features/integrations/providers/google/sheets'
import type { LeadMetadata, LeadRow, Database, LeadUpdate } from '@/shared/types'
import { getAccountContext } from '@/core/tenancy/account-context'
import { enrollLeadInSpecificSequence } from '@/features/sequences/services/enroll'
import { calculateLeadScore } from '@/features/leads/services/scoring'
import { getErrorMessage } from '@/core/errors/error-utils'

export type Lead = {
    id: string
    account_id: string
    group_id: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    company: string | null
    source: string | null
    status: 'new' | 'contacted' | 'qualified' | 'booked' | 'unqualified' | null
    score: number | null
    created_at: string | null
    updated_at: string | null
    metadata: LeadMetadata | null
    language: string | null
}

export type LeadGroup = {
    id: string
    account_id: string
    folder_id: string | null
    name: string
    description: string | null
    created_at: string
    updated_at?: string
    lead_count?: number
}

export type LeadFolder = {
    id: string
    account_id: string
    name: string
    created_at: string | null
    updated_at: string | null
}

export async function getLeadsPageData() {
    try {
        const [leads, groups, folders] = await Promise.all([
            getLeads(),
            getLeadGroups(),
            getLeadFolders()
        ]);
        return { leads, groups, folders };
    } catch (error: unknown) {
        console.error('[getLeadsPageData] Fatal Error:', getErrorMessage(error));
        return { leads: [], groups: [], folders: [] };
    }
}

export async function getLeads() {
    try {
        const context = await getAccountContext()
        if (!context.ok) return []

        return await unstable_cache(
            async () => {
                try {
                    const supabase = createAdminClient()
                    const { data: leads, error } = await supabase
                        .from('leads')
                        .select('id, account_id, group_id, first_name, last_name, email, phone, company, source, status, score, created_at, language')
                        .eq('account_id', context.accountId)
                        .order('created_at', { ascending: false })
                        .limit(100)

                    if (error) {
                        console.error('Error fetching leads:', error)
                        return []
                    }

                    return (leads || []) as unknown as Lead[]
                } catch (err: unknown) {
                    console.error('[getLeads] inner error:', getErrorMessage(err));
                    return [];
                }
            },
            [`leads-${context.accountId}`],
            { revalidate: 30, tags: [`leads-${context.accountId}`] }
        )()
    } catch (error: unknown) {
        console.error('[getLeads] outer error:', getErrorMessage(error));
        return [];
    }
}

/**
 * Lead creation with parallel external service notifications
 */
export async function createLead(data: {
    first_name: string
    last_name: string
    email: string
    phone?: string | null
    company?: string | null
    source?: string
    status?: string
    language?: string
}) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    // Calculate initial score based on profile + source (no conversations yet)
    const initialScore = calculateLeadScore({
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        source: data.source || 'manual',
        status: data.status || 'new',
        conversationCount: 0,
        leadReplyCount: 0,
        enrollmentCount: 0,
        createdAt: new Date().toISOString(),
    }).total;

    const rawData = {
        account_id: context.accountId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        source: data.source || 'manual',
        status: data.status || 'new',
        language: data.language || 'en',
        score: initialScore,
    }

    // 2. Main DB Insert
    const { data: insertedData, error } = await supabase.from('leads').insert(rawData).select().single()
    if (error) return { error: error.message }

    const insertedLead = insertedData as unknown as Lead
    const leadId = insertedLead.id;
    const accountId = context.accountId;

    // 3. PARALLEL PROCESSING (Non-critical notifications & exports)
    try {
        // Prepare data for external services, converting nulls to undefined where appropriate
        const externalServiceData = {
            ...data,
            phone: data.phone ?? undefined,
            email: data.email ?? undefined,
        };

        const externalTasks = [
            sendSlackNotification(accountId, 'leads', externalServiceData).catch(e => console.error('Slack error:', getErrorMessage(e))),
            sendDiscordNotification(accountId, 'leads', externalServiceData).catch(e => console.error('Discord error:', getErrorMessage(e))),
            notifyAdmins(accountId, {
                title: 'New Lead',
                message: `${data.first_name} ${data.last_name} joined.`,
                type: 'success',
                link: `/admin/leads?search=${data.email}`
            }).catch(e => console.error('Admin notify error:', getErrorMessage(e))),
            logEvent('lead.created', 'lead', leadId, { ...externalServiceData }),
            triggerWebhook(accountId, 'lead.created', insertedLead).catch(e => console.error('Webhook error:', getErrorMessage(e)))
        ];

        await Promise.allSettled(externalTasks);
    } catch (e: unknown) {
        console.error('External tasks setup failed:', getErrorMessage(e));
    }

    // 4. Critical Integrations
    try {
        const integrations = await getIntegrations();
        const promises = [];

        if (integrations?.length) {
            promises.push(syncLeadToActiveCRMs(insertedLead, integrations).catch(e => console.error('CRM Sync failed:', getErrorMessage(e))));
        }
        promises.push(enrollLeadInSequences(leadId, accountId, data.source || 'manual', insertedLead.group_id).catch(e => console.error('Enrollment failed:', getErrorMessage(e))));

        const sheetsProvider = integrations?.find(i => i.provider === 'google_sheets' && i.status === 'connected' && typeof i.config === 'object' && i.config !== null && 'autoExport' in i.config && (i.config as any).autoExport === true);
        if (sheetsProvider) {
            promises.push(appendLeadToSheet(sheetsProvider.id, insertedLead as any).catch(e => console.error('Sheets failed:', getErrorMessage(e))));
        }
        await Promise.allSettled(promises);
    } catch (e: unknown) {
        console.error('Integrations error:', getErrorMessage(e));
    }

    try {
        revalidatePath('/admin/leads')
        revalidateTag(`dashboard-${context.accountId}`)
        revalidateTag(`leads-${context.accountId}`)
    } catch (e: unknown) {
        if (process.env.NODE_ENV !== 'production') console.warn('Revalidate path error (non-fatal):', getErrorMessage(e));
    }
    return { success: true, id: leadId }
}

export async function updateLeadStatus(id: string, status: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    // Optimized: Get updated lead in same query via .select()
    const { data: lead, error } = await supabase
        .from('leads')
        .update({ status: status as 'new' | 'contacted' | 'qualified' | 'booked' | 'unqualified' })
        .eq('id', id)
        .eq('account_id', context.accountId)
        .select()
        .single()

    if (error) return { error: error.message }

    // If unqualified, pause enrollments
    if (status === 'unqualified') {
        await supabase
            .from('sequence_enrollments')
            .update({ status: 'paused', next_step_due_at: null })
            .eq('lead_id', id)
            .eq('account_id', context.accountId)
            .eq('status', 'active')
    }
    if (lead && typeof lead === 'object') {
        // Fetch conversation IDs once, reuse for both count and message query
        const { data: convRows } = await supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', id);
        const conversationIds = convRows?.map(c => c.id) ?? [];
        const conversationCount = conversationIds.length;

        const replyCount = conversationIds.length > 0
            ? (await supabase.from('messages')
                .select('id', { count: 'exact', head: true })
                .in('conversation_id', conversationIds)
                .eq('sender_type', 'lead')).count ?? 0
            : 0;

        const leadObj = lead as Record<string, unknown>
        const newScore = calculateLeadScore({
            email: typeof leadObj.email === 'string' ? leadObj.email : null,
            phone: typeof leadObj.phone === 'string' ? leadObj.phone : null,
            company: typeof leadObj.company === 'string' ? leadObj.company : null,
            source: typeof leadObj.source === 'string' ? leadObj.source : null,
            status,
            conversationCount: conversationCount,
            leadReplyCount:    replyCount,
            enrollmentCount:   0,
            createdAt: typeof leadObj.created_at === 'string' ? leadObj.created_at : new Date().toISOString(),
        }).total;
        await supabase.from('leads').update({ score: newScore }).eq('id', id);

        const leadAccountId = typeof leadObj.account_id === 'string' ? leadObj.account_id : context.accountId
        await Promise.allSettled([
            logEvent('lead.updated', 'lead', id, { status }),
            triggerWebhook(leadAccountId, 'lead.updated', lead)
        ]);
    }

    revalidatePath('/admin/leads')
    revalidateTag(`dashboard-${context.accountId}`)
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}

export async function getLeadSources() {
    try {
        const supabase = await createClient()
        const context = await getAccountContext()
        if (!context.ok) return []

        // Fetch non-null sources with increased limit for completeness
        // DB-side filtering + JS Set dedup is more efficient than double queries
        const { data, error } = await supabase
            .from('leads')
            .select('source')
            .eq('account_id', context.accountId)
            .not('source', 'is', null)
            .not('source', 'eq', '')
            .order('source')
            .limit(1000)

        if (error || !data) return []

        // Use Set for O(1) dedup
        const sourceSet = new Set<string>();
        data.forEach(l => {
            if (typeof l.source === 'string' && l.source.trim().length > 0) {
                sourceSet.add(l.source.trim());
            }
        });

        return Array.from(sourceSet).sort();
    } catch (e: unknown) {
        console.error('Error in getLeadSources:', getErrorMessage(e));
        return [];
    }
}


export async function exportLeadsToGoogleSheets(integrationId: string, leads: LeadRow[]) {
    try {
        const { bulkExportToSheet } = await import('@/features/integrations/providers/google/sheets')
        const result = await bulkExportToSheet(integrationId, leads)
        return { success: true, count: result.count }
    } catch (error: unknown) {
        console.error('Export Leads to Google Sheets Error:', getErrorMessage(error))
        return { success: false, error: getErrorMessage(error) || 'Export failed' }
    }
}


// REST OF THE FUNCTIONS (Simplified for brevity)

export async function updateLead(id: string, data: Partial<Lead>) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    // Optimized: .select() returns updated data in same query
    const { data: updatedLead, error } = await supabase
        .from('leads')
        .update(data as LeadUpdate)
        .eq('id', id)
        .eq('account_id', context.accountId)
        .select()
        .single()

    if (error) return { error: error.message }

    // Webhook Trigger
    if (updatedLead) {
        triggerWebhook(context.accountId, 'lead.updated', updatedLead).catch(e => console.warn('Webhook Error:', e))
    }

    revalidatePath('/admin/leads')
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}

export async function deleteLead(id: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    
    // RBAC: Only admin, sales_rep or agent can delete leads
    if (!['admin', 'sales_rep', 'agent'].includes(context.profile.role || '')) {
        return { error: 'Unauthorized: Insufficient permissions to delete leads' }
    }

    // ON DELETE CASCADE ensures related conversations, messages, and enrollments are also deleted.
    const { error } = await supabase.from('leads').delete().eq('id', id).eq('account_id', context.accountId)
    if (error) return { error: error.message }

    // Log the event
    await logEvent('lead.deleted', 'lead', id, { deletedBy: context.profile.id });

    revalidatePath('/admin/leads')
    revalidateTag(`dashboard-${context.accountId}`)
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}

export async function deleteLeadsBulk(ids: string[]) {
    if (!ids?.length) return { error: 'No IDs' }
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    // RBAC: Only admin, sales_rep or agent can delete leads
    if (!['admin', 'sales_rep', 'agent'].includes(context.profile.role || '')) {
        return { error: 'Unauthorized: Insufficient permissions to delete leads' }
    }

    const { error } = await supabase.from('leads').delete().eq('account_id', context.accountId).in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    revalidateTag(`dashboard-${context.accountId}`)
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}

export async function moveLeadsToGroupBulk(leadIds: string[], groupId: string | null) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    
    // Batch update leads
    const { error } = await supabase
        .from('leads')
        .update({ group_id: groupId })
        .eq('account_id', context.accountId)
        .in('id', leadIds)
        
    if (error) return { error: error.message }

    // Trigger sequence enrollments in background (do not await all individually if too many)
    if (groupId) {
        // For very large sets, we might want a background job,
        // but for typical bulk actions (e.g. 50-100 leads), this is fine.
        enrollLeadInSequencesBulk(leadIds, context.accountId, 'manual', groupId)
            .catch(e => console.error('Bulk enrollment failed:', getErrorMessage(e)));
    }

    revalidatePath('/admin/leads')
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}


export async function searchLeads(query: string) {
    if (!query) return []
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return []
    const sanitized = query.replace(/[,()]/g, ' ').trim()
    const { data } = await supabase
        .from('leads')
        .select('id, account_id, group_id, first_name, last_name, email, phone, company, source, status, score, created_at, language')
        .eq('account_id', context.accountId)
        .or(`first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,company.ilike.%${sanitized}%`)
        .limit(10)
    return (data || []) as Lead[]
}

export async function createLeadsBulk(leads: any[]) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const rawLeads = leads.map(lead => ({
        account_id: context.accountId,
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || null,
        company: lead.company || null,
        source: 'excel_import',
        status: 'new' as const,
    }))

    const { data, error } = await supabase.from('leads').insert(rawLeads).select()
    if (error) return { error: error.message }

    // Enrollment in parallel
    if (data?.length) {
        await Promise.allSettled(data.map(l => {
            const leadObj = l as Record<string, unknown>
            const leadId = typeof leadObj.id === 'string' ? leadObj.id : ''
            const groupId = typeof leadObj.group_id === 'string' ? leadObj.group_id : null
            return enrollLeadInSequences(leadId, context.accountId, 'excel_import', groupId)
        }))
    }

    revalidatePath('/admin/leads')
    return { success: true, count: data.length }
}

export async function createLeadGroup(name: string, folderId: string | null = null) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data, error } = await supabase
        .from('lead_groups')
        .insert({ account_id: context.accountId, name, folder_id: folderId })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    revalidateTag(`lead-groups-${context.accountId}`)
    return { success: true, group: data as Database['public']['Tables']['lead_groups']['Row'] }
}

const _getLeadGroupsCached = (accountId: string) => unstable_cache(
    async () => {
        try {
            const supabase = createAdminClient()
            const { data, error } = await supabase.from('lead_groups').select('id, account_id, folder_id, name, description, created_at, leads(count)').eq('account_id', accountId).order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching lead groups:', error);
                return [];
            }

            if (!data) return []

            return (data as unknown as Array<{ id: string; account_id: string; folder_id: string | null; name: string; description: string | null; created_at: string | null; leads: Array<{ count: number }> }>).map(g => ({ ...g, lead_count: g.leads[0]?.count || 0 })) as LeadGroup[]
        } catch (error: unknown) {
            console.error('[getLeadGroups cache] Fatal Error:', getErrorMessage(error));
            return [];
        }
    },
    [`lead-groups-${accountId}`],
    { revalidate: 300, tags: [`lead-groups-${accountId}`] }
)()

export async function getLeadGroups() {
    try {
        const context = await getAccountContext()
        if (!context.ok) return []

        return await _getLeadGroupsCached(context.accountId)
    } catch (error: unknown) {
        console.error('[getLeadGroups] Fatal Error:', getErrorMessage(error));
        return [];
    }
}

export async function deleteLeadGroup(id: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { error } = await supabase.from('lead_groups').delete().eq('id', id).eq('account_id', context.accountId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    revalidateTag(`lead-groups-${context.accountId}`)
    return { success: true }
}

export async function updateLeadGroup(id: string, name: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { error } = await supabase.from('lead_groups').update({ name }).eq('id', id).eq('account_id', context.accountId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    revalidateTag(`lead-groups-${context.accountId}`)
    return { success: true }
}

export async function getLeadFolders() {
    try {
        const supabase = await createClient()
        const context = await getAccountContext()
        if (!context.ok) return []
        const { data, error } = await supabase.from('lead_folders').select('id, account_id, name, created_at').eq('account_id', context.accountId).order('created_at', { ascending: false })
        
        if (error) {
            console.error('Error fetching lead folders:', error);
            return [];
        }
        
        return (data || []) as LeadFolder[]
    } catch (error: unknown) {
        console.error('[getLeadFolders] Fatal Error:', getErrorMessage(error));
        return [];
    }
}

export async function createLeadFolder(name: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { data, error } = await supabase.from('lead_folders').insert({ account_id: context.accountId, name }).select().single()
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    return { success: true, folder: data as Database['public']['Tables']['lead_folders']['Row'] }
}

export async function updateLeadFolder(id: string, name: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { error } = await supabase
        .from('lead_folders')
        .update({ name })
        .eq('id', id)
        .eq('account_id', context.accountId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    return { success: true }
}

export async function deleteLeadFolder(id: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { error } = await supabase.from('lead_folders').delete().eq('id', id).eq('account_id', context.accountId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    return { success: true }
}

export async function assignGroupToFolder(groupId: string, folderId: string | null) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    const { error } = await supabase.from('lead_groups').update({ folder_id: folderId }).eq('id', groupId).eq('account_id', context.accountId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leads')
    return { success: true }
}

/**
 * Start a specific sequence for a lead manually
 */
export async function startLeadSequence(leadId: string, sequenceId: string, integrationId?: string) {
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const result = await enrollLeadInSpecificSequence(leadId, sequenceId, context.accountId, integrationId)

    if (result.success) {
        revalidatePath('/admin/leads')
        return { success: true }
    }

    return { error: result.error }
}

/**
 * Start a specific sequence for multiple leads manually
 */
export async function startLeadsSequenceBulk(leadIds: string[], sequenceId: string, integrationId?: string) {
    const context = await getAccountContext()
    if (!context.ok) return { success: false, error: context.error }

    const results = await Promise.all(
        leadIds.map(async (leadId) => {
            const res = await enrollLeadInSpecificSequence(leadId, sequenceId, context.accountId, integrationId)
            return { leadId, ...res }
        })
    )

    const failures = results.filter(r => r.error)
    const successCount = leadIds.length - failures.length
    
    revalidatePath('/admin/leads')
    
    if (successCount === 0 && leadIds.length > 0) {
        // If all failed, collect unique error messages
        const uniqueErrors = Array.from(new Set(failures.map(f => f.error)));
        if (uniqueErrors.length === 1) {
            return { success: false, error: uniqueErrors[0] };
        }
        return { success: false, error: `Failed to enroll leads: ${uniqueErrors.join(', ')}` };
    }

    return { 
        success: true, 
        count: successCount,
        failureCount: failures.length,
        failures: failures.map(f => ({ leadId: f.leadId, error: f.error }))
    }
}

/**
 * Update lead score (0-100)
 */
export async function updateLeadScore(id: string, score: number) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    // Validate score range
    if (score < 0 || score > 100) {
        return { error: 'Score must be between 0 and 100' }
    }

    const { error } = await supabase
        .from('leads')
        .update({ score })
        .eq('id', id)
        .eq('account_id', context.accountId)

    if (error) return { error: error.message }

    // Trigger webhook for lead update
    const { data: updatedLead } = await supabase.from('leads').select('id, account_id, first_name, last_name, email, phone, company, status, score, created_at').eq('id', id).single()
    if (updatedLead) {
        triggerWebhook(context.accountId, 'lead.updated', updatedLead).catch(e => console.warn('Webhook Error:', e))
    }

    revalidatePath('/admin/leads')
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}

/**
 * Recalculate scores for ALL leads in the account using the Postgres function.
 * Runs a single UPDATE covering profile, source, status, engagement and recency.
 * Can be triggered manually from the UI or via a cron job.
 */
export async function recalculateLeadScores() {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data, error } = await supabase
        .rpc('recalculate_account_lead_scores', { p_account_id: context.accountId })

    if (error) return { error: error.message }

    revalidatePath('/admin/leads')
    revalidateTag(`leads-${context.accountId}`)
    return { success: true, updatedCount: (data as unknown as number) || 0 }
}

/**
 * Get leads that have gone silent (no reply in X days after being contacted).
 * These are leads where:
 * - status is 'contacted' or 'qualified'
 * - the last message in their conversation was from 'ai' or 'agent' (we sent, they didn't reply)
 * - last_message_at was > silentDays ago
 */
export async function getGhostLeads(silentDays = 3) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { data: [], error: context.error }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - silentDays)

    // Find conversations where last message was outbound and older than cutoff
    const { data: convs } = await supabase
        .from('conversations')
        .select('lead_id, last_message_at, id')
        .eq('account_id', context.accountId)
        .eq('status', 'active')
        .lt('last_message_at', cutoffDate.toISOString())
        .order('last_message_at', { ascending: false })
        .limit(200)

    if (!convs || convs.length === 0) return { data: [] }

    // Batch-fetch last message for all conversations in parallel to avoid N+1
    const BATCH_SIZE = 50
    const ghostLeadIds: string[] = []
    for (let i = 0; i < convs.length; i += BATCH_SIZE) {
        const batch = convs.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
            batch.map(conv =>
                supabase
                    .from('messages')
                    .select('sender_type')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            )
        )
        results.forEach((r, j) => {
            const lastMsg = r.data
            if (lastMsg && (lastMsg.sender_type === 'ai' || lastMsg.sender_type === 'agent')) {
                ghostLeadIds.push(batch[j].lead_id)
            }
        })
    }

    if (ghostLeadIds.length === 0) return { data: [] }

    const { data: leads } = await supabase
        .from('leads')
        .select('id, account_id, group_id, first_name, last_name, email, phone, company, source, status, score, created_at, updated_at, metadata')
        .eq('account_id', context.accountId)
        .in('id', ghostLeadIds)
        .in('status', ['contacted', 'qualified', 'new'])

    return { data: leads || [] }
}

/**
 * Tag a lead as a ghost (stopped responding) by updating metadata
 */
export async function tagLeadAsGhost(leadId: string, isGhost: boolean) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data: lead } = await supabase
        .from('leads')
        .select('metadata')
        .eq('id', leadId)
        .eq('account_id', context.accountId)
        .single()

    const currentMeta = typeof lead?.metadata === 'object' && lead.metadata !== null
        ? (lead.metadata as Record<string, unknown>)
        : {}
    const updatedMeta = { ...currentMeta, ghost: isGhost, ghost_tagged_at: isGhost ? new Date().toISOString() : null }

    const { error } = await supabase
        .from('leads')
        .update({ metadata: updatedMeta })
        .eq('id', leadId)
        .eq('account_id', context.accountId)

    if (error) return { error: error.message }

    revalidatePath('/admin/leads')
    revalidateTag(`leads-${context.accountId}`)
    return { success: true }
}
