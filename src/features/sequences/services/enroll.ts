'use server'

import { createClient } from '@/core/db/server'

/**
 * Enroll a lead into all matching active sequences for the account.
 * integrationId: optional Gmail integration to use for email steps (enrollment-level override).
 */
export async function enrollLeadInSequences(
    leadId: string,
    accountId: string,
    source?: string,
    groupId?: string | null,
    integrationId?: string
) {
    try {
        const supabase = await createClient()

        // 1. Get all active sequences for this account
        const { data: sequences, error: seqError } = await supabase
            .from('sequences')
            .select('*')
            .eq('account_id', accountId)
            .eq('is_active', true)

        if (seqError || !sequences || sequences.length === 0) {
            return { enrolled: 0 }
        }

        // 2. Check existing enrollments to prevent duplicates
        const { data: existingEnrollments } = await supabase
            .from('sequence_enrollments')
            .select('sequence_id')
            .eq('lead_id', leadId)

        const alreadyEnrolledIds = new Set(
            (existingEnrollments || []).map((e: any) => e.sequence_id)
        )

        // 3. Filter sequences by matching trigger type and lead_type
        const matchingSequences = (sequences as any[]).filter(seq => {
            if (alreadyEnrolledIds.has(seq.id)) return false

            const trigger = seq.trigger_type
            const seqLeadType = seq.lead_type || 'all_leads'

            if (seqLeadType !== 'all_leads') {
                if (seqLeadType.startsWith('source:')) {
                    const requiredSource = seqLeadType.replace('source:', '')
                    if (source !== requiredSource) return false
                } else if (seqLeadType.startsWith('integration:')) {
                    const requiredIntegration = seqLeadType.replace('integration:', '')
                    if (source !== requiredIntegration) return false
                } else if (seqLeadType.startsWith('group:')) {
                    const requiredGroup = seqLeadType.replace('group:', '')
                    if (!groupId || groupId !== requiredGroup) return false
                }
            }

            if (trigger === 'lead_created' || trigger === 'no_response' || trigger === 'now' || trigger === 'instant') {
                return true
            }

            if (trigger === 'hubspot_lead' && source?.includes('hubspot')) return true
            if (trigger === 'salesforce_lead' && source?.includes('salesforce')) return true
            if (trigger === 'pipedrive_lead' && source?.includes('pipedrive')) return true
            if (trigger === 'zoho_lead' && source?.includes('zoho')) return true

            if (trigger === 'custom') return true

            return false
        })

        if (matchingSequences.length === 0) {
            return { enrolled: 0 }
        }

        // 4. Create enrollment records
        const enrollments = matchingSequences.map((seq: any) => {
            const steps = Array.isArray(seq.steps) ? seq.steps : []
            const firstStepDelay = steps.length > 0 ? (steps[0] as any).delay_hours || 24 : 24
            const nextDueAt = new Date(Date.now() + firstStepDelay * 60 * 60 * 1000)

            return {
                sequence_id: seq.id,
                lead_id: leadId,
                account_id: accountId,
                status: 'active' as any,
                current_step_index: 0,
                next_step_due_at: nextDueAt.toISOString(),
                ...(integrationId ? { integration_id: integrationId } : {}),
            }
        })

        const { data: inserted, error: insertError } = await supabase
            .from('sequence_enrollments')
            .insert(enrollments)
            .select()

        if (insertError) {
            console.error('Failed to create sequence enrollments:', insertError)
            return { enrolled: 0, error: insertError.message }
        }

        return { enrolled: inserted?.length || 0 }
    } catch (err: any) {
        console.error('enrollLeadInSequences error:', err)
        return { enrolled: 0, error: err.message }
    }
}

/**
 * Enroll a lead into a specific sequence.
 * integrationId: optional Gmail integration override for this enrollment.
 */
export async function enrollLeadInSpecificSequence(
    leadId: string,
    sequenceId: string,
    accountId: string,
    integrationId?: string
) {
    try {
        const supabase = await createClient()

        // 1. Get the sequence
        const { data: seq, error: seqError } = await supabase
            .from('sequences')
            .select('*')
            .eq('id', sequenceId)
            .eq('account_id', accountId)
            .single()

        if (seqError || !seq) {
            return { error: 'Sequence not found' }
        }

        // 2. Check if already enrolled
        const { data: existing } = await supabase
            .from('sequence_enrollments')
            .select('id')
            .eq('sequence_id', sequenceId)
            .eq('lead_id', leadId)
            .maybeSingle()

        if (existing) {
            return { error: 'Lead already enrolled in this sequence' }
        }

        // 3. Create enrollment record
        const steps = Array.isArray(seq.steps) ? seq.steps : []
        const firstStepDelay = steps.length > 0 ? (steps[0] as any).delay_hours || 0 : 0
        const nextDueAt = new Date(Date.now() + firstStepDelay * 60 * 60 * 1000)

        const { data: inserted, error: insertError } = await supabase
            .from('sequence_enrollments')
            .insert({
                sequence_id: sequenceId,
                lead_id: leadId,
                account_id: accountId,
                status: 'active',
                current_step_index: 0,
                next_step_due_at: nextDueAt.toISOString(),
                ...(integrationId ? { integration_id: integrationId } : {}),
            })
            .select()
            .single()

        if (insertError) {
            console.error('Failed to create manual sequence enrollment:', insertError)
            return { error: insertError.message }
        }

        return { success: true, enrollmentId: inserted.id }
    } catch (err: any) {
        console.error('enrollLeadInSpecificSequence error:', err)
        return { error: err.message }
    }
}

/**
 * Bulk version of enrollLeadInSequences to avoid N+1 queries.
 * integrationId: optional Gmail integration to apply to all enrollments in this batch.
 */
export async function enrollLeadInSequencesBulk(
    leadIds: string[],
    accountId: string,
    source?: string,
    groupId?: string | null,
    integrationId?: string
) {
    if (!leadIds.length) return { enrolled: 0 };

    try {
        const supabase = await createClient();

        // 1. Get all active sequences
        const { data: sequences, error: seqError } = await supabase
            .from('sequences')
            .select('*')
            .eq('account_id', accountId)
            .eq('is_active', true);

        if (seqError || !sequences || sequences.length === 0) {
            return { enrolled: 0 };
        }

        // 2. Get existing enrollments for ALL leads in one query
        const { data: existingEnrollments } = await supabase
            .from('sequence_enrollments')
            .select('lead_id, sequence_id')
            .in('lead_id', leadIds);

        const alreadyEnrolledMap = new Map<string, Set<string>>();
        (existingEnrollments || []).forEach((e: any) => {
            if (!alreadyEnrolledMap.has(e.lead_id)) {
                alreadyEnrolledMap.set(e.lead_id, new Set());
            }
            alreadyEnrolledMap.get(e.lead_id)!.add(e.sequence_id);
        });

        // 3. Prepare bulk insertions
        const allNewEnrollments: any[] = [];

        for (const leadId of leadIds) {
            const alreadyEnrolledIds = alreadyEnrolledMap.get(leadId) || new Set();

            const matchingSequences = (sequences as any[]).filter(seq => {
                if (alreadyEnrolledIds.has(seq.id)) return false;

                const trigger = seq.trigger_type;
                const seqLeadType = seq.lead_type || 'all_leads';

                if (seqLeadType !== 'all_leads') {
                    if (seqLeadType.startsWith('source:')) {
                        const requiredSource = seqLeadType.replace('source:', '');
                        if (source !== requiredSource) return false;
                    } else if (seqLeadType.startsWith('integration:')) {
                        const requiredIntegration = seqLeadType.replace('integration:', '');
                        if (source !== requiredIntegration) return false;
                    } else if (seqLeadType.startsWith('group:')) {
                        const requiredGroup = seqLeadType.replace('group:', '');
                        if (!groupId || groupId !== requiredGroup) return false;
                    }
                }

                if (trigger === 'lead_created' || trigger === 'no_response' || trigger === 'now' || trigger === 'instant' || trigger === 'custom') return true;
                if (trigger === 'hubspot_lead' && source?.includes('hubspot')) return true;
                if (trigger === 'salesforce_lead' && source?.includes('salesforce')) return true;
                if (trigger === 'pipedrive_lead' && source?.includes('pipedrive')) return true;
                if (trigger === 'zoho_lead' && source?.includes('zoho')) return true;
                return false;
            });

            matchingSequences.forEach((seq: any) => {
                const steps = Array.isArray(seq.steps) ? seq.steps : [];
                const firstStepDelay = steps.length > 0 ? (steps[0] as any).delay_hours || 24 : 24;
                const nextDueAt = new Date(Date.now() + firstStepDelay * 60 * 60 * 1000);

                allNewEnrollments.push({
                    sequence_id: seq.id,
                    lead_id: leadId,
                    account_id: accountId,
                    status: 'active',
                    current_step_index: 0,
                    next_step_due_at: nextDueAt.toISOString(),
                    ...(integrationId ? { integration_id: integrationId } : {}),
                });
            });
        }

        if (allNewEnrollments.length === 0) {
            return { enrolled: 0 };
        }

        // 4. Bulk Insert
        const { data: inserted, error: insertError } = await supabase
            .from('sequence_enrollments')
            .insert(allNewEnrollments)
            .select();

        if (insertError) {
            console.error('Failed bulk sequence enrollment:', insertError);
            return { enrolled: 0, error: insertError.message };
        }

        return { enrolled: inserted?.length || 0 };
    } catch (err: any) {
        console.error('enrollLeadInSequencesBulk error:', err);
        return { enrolled: 0, error: err.message };
    }
}
