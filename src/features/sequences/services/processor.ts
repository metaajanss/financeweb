import { createAdminClient } from '@/core/db/admin';
import { SupabaseClient } from '@supabase/supabase-js';

// Module-level cache for compiled template regexes to avoid re-compiling per message.
// Bounded with simple FIFO eviction (Map preserves insertion order) to prevent unbounded growth
// when many distinct template keys are processed across long-running workers.
const MAX_CACHE_SIZE = 1000;
const _templateRegexCache = new Map<string, RegExp>();
function getTemplateRegex(key: string): RegExp {
    let re = _templateRegexCache.get(key);
    if (!re) {
        if (_templateRegexCache.size >= MAX_CACHE_SIZE) {
            const firstKey = _templateRegexCache.keys().next().value;
            if (firstKey !== undefined) _templateRegexCache.delete(firstKey);
        }
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        re = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
        _templateRegexCache.set(key, re);
    }
    return re;
}
import { sendViaChannel, ChannelType } from '@/core/channels';
import { Sequence, SequenceStep } from '@/features/sequences/types';
import { Database } from '@/shared/types';
import { getPlanLimits, SubscriptionPlan } from '@/config/plans';
import { sendSlackNotificationAdmin } from '@/features/integrations/providers/messaging/slack';

import { getCurrentHourInTimezone, isInBlackoutWindow, isWeekendInTimezone, getHoursUntilNextWorkday, SequenceSettings, DEFAULT_SETTINGS } from './utils';

function findNextStepIndex(currentStepIndex: number, steps: SequenceStep[], branchOverride?: 'yes' | 'no'): number {
    const activeNode = steps[currentStepIndex];
    if (!activeNode) return -1;

    // Check if the sequence format is hierarchical
    const isHierarchical = steps.some(s => s.parentId || s.type);
    if (!isHierarchical) {
        return currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : -1;
    }

    // Find children of the active node
    let childNodes = steps.filter(s => s.parentId === activeNode.id);
    if (activeNode.type === 'condition' && branchOverride) {
        childNodes = childNodes.filter(s => s.branch === branchOverride);
    }

    if (childNodes.length > 0) {
        const childNode = childNodes[0];
        return steps.findIndex(s => s.id === childNode.id);
    }

    return -1;
}

const MAX_RETRIES = 5;

interface EnrollmentLead {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    company?: string | null;
    language?: string | null;
    metadata: Record<string, unknown> | string | null;
}

interface Enrollment {
    id: string;
    account_id: string;
    sequence_id: string;
    lead_id: string;
    status: string;
    current_step_index: number;
    retry_count: number | null;
    next_step_due_at: string | null;
    sequence: {
        steps: SequenceStep[];
        name?: string;
    } | null;
    account: {
        sequence_settings: SequenceSettings | string | null;
    } | null;
    lead: EnrollmentLead | null;
}

/**
 * Generate tracking pixel HTML for email open tracking
 */
function generateTrackingPixel(
    enrollmentId: string,
    sequenceId: string,
    stepIndex: number,
    accountId: string
): string {
    const tokenData = { enrollmentId, sequenceId, stepIndex, accountId };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');
    // Fallback to NEXT_PUBLIC_SITE_URL if APP_URL is missing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://jumpix.app';
    const pixelUrl = `${appUrl}/api/track/open?t=${token}`;
    
    return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;visibility:hidden;" />`;
}

/**
 * Wrap plain text message with HTML body and add tracking pixel
 */
function wrapMessageWithHtml(message: string, trackingPixel: string): string {
    // Convert plain text to HTML (preserve line breaks)
    const htmlContent = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\r\n/g, '<br>')
        .replace(/\r/g, '<br>');
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    ${htmlContent}
    ${trackingPixel}
</body>
</html>`;
}

export async function processPendingSteps(batchSize = 50, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || createAdminClient();

    // 1. Get and Lock enrollments in one atomic step via RPC
    
    const { data: grabbedEnrollments, error: rpcError } = await (supabase as any)
        .rpc('grab_pending_enrollments', { batch_size_int: batchSize });

    if (rpcError) {
        console.error('Error grabbing enrollments via RPC:', rpcError);
        return { processed: 0, error: rpcError.message };
    }

    const validEnrollments: Enrollment[] = (grabbedEnrollments as Enrollment[]) || [];

    if (validEnrollments.length === 0) {
        return { processed: 0 };
    }


    // Pre-load sent counts: email = daily, whatsapp = monthly
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthIso = monthStart.toISOString();

    const uniqueAccountIds = [...new Set(validEnrollments.map(e => e.account_id))];
    const dailyCounts: Record<string, { email: number, whatsapp: number }> = {};
    for (const id of uniqueAccountIds) dailyCounts[id] = { email: 0, whatsapp: 0 };

    // Two queries: email daily counts, whatsapp monthly counts
    // Bounded with .limit() to avoid runaway scans on very high-volume accounts
    
    const supabaseAny = supabase as any;
    const [{ data: emailEvents }, { data: whatsappEvents }, { data: accountRows }] = await Promise.all([
        supabaseAny
            .from('sequence_events')
            .select('account_id')
            .in('account_id', uniqueAccountIds)
            .eq('channel', 'email')
            .eq('event_type', 'sent')
            .gte('created_at', todayIso)
            .limit(10000),
        supabaseAny
            .from('sequence_events')
            .select('account_id')
            .in('account_id', uniqueAccountIds)
            .eq('channel', 'whatsapp')
            .eq('event_type', 'sent')
            .gte('created_at', monthIso)
            .limit(10000),
        supabase
            .from('accounts')
            .select('id, plan_id')
            .in('id', uniqueAccountIds),
    ]);

    for (const ev of emailEvents || []) {
        if (dailyCounts[ev.account_id]) dailyCounts[ev.account_id].email++;
    }
    for (const ev of whatsappEvents || []) {
        if (dailyCounts[ev.account_id]) dailyCounts[ev.account_id].whatsapp++;
    }

    const accountPlanMap: Record<string, SubscriptionPlan> = {};
    for (const acc of accountRows || []) {
        accountPlanMap[acc.id] = ((acc.plan_id as string) || 'free') as SubscriptionPlan;
    }

    // Pre-parse sequence_settings per account to avoid repeated JSON.parse inside the loop
    const accountSettingsMap: Record<string, SequenceSettings> = {};
    for (const enrollment of validEnrollments) {
        const aid = enrollment.account_id;
        if (!accountSettingsMap[aid]) {
            const raw = enrollment.account?.sequence_settings;
            try {
                accountSettingsMap[aid] = {
                    ...DEFAULT_SETTINGS,
                    ...(typeof raw === 'string' ? JSON.parse(raw) : (raw || {})),
                };
            } catch (parseError) {
                console.error(`[Processor] Invalid JSON in sequence_settings for account ${aid}, using defaults:`, parseError);
                accountSettingsMap[aid] = { ...DEFAULT_SETTINGS };
            }
        }
    }

    // Pre-fetch primary Gmail integrations per account via a single batch query
    // (replaces N sequential queries — 100 accounts now uses 1 query instead of 100).
    const primaryGmailCache: Record<string, string | undefined> = {};
    if (uniqueAccountIds.length > 0) {
        const { data: gmailIntegrations } = await supabase
            .from('integrations')
            .select('id, account_id, is_primary')
            .in('account_id', uniqueAccountIds)
            .eq('provider', 'gmail')
            .eq('status', 'connected')
            .order('is_primary', { ascending: false });

        for (const accountId of uniqueAccountIds) {
            const integration = (gmailIntegrations ?? []).find(
                (i) => i.account_id === accountId
            );
            primaryGmailCache[accountId] = integration?.id;
        }
    }

    const getAccountDailyCount = (accountId: string, channel: string) =>
        channel === 'whatsapp' ? dailyCounts[accountId].whatsapp : dailyCounts[accountId].email;

    interface SeqEventRow {
        account_id: string;
        sequence_id: string;
        enrollment_id: string;
        step_index: number;
        lead_id: string;
        event_type: string;
        channel: string;
        integration_id?: string;
        metadata: Record<string, unknown>;
    }

    interface EventLogRow {
        account_id: string;
        event_type: string;
        entity_type: string;
        entity_id: string;
        data: Record<string, unknown>;
    }

    let processedCount = 0;
    const pendingSeqEvents: SeqEventRow[] = [];
    const pendingEventLogs: EventLogRow[] = [];
    const pendingConversationMessages: { accountId: string; leadId: string; channel: string; content: string }[] = [];
    // Track accounts already notified this batch to avoid duplicate alerts
    const limitNotifiedKeys = new Set<string>();

    // ── Phase 1: Validate + template-replace all enrollments ─────────────
    // Collect translation tasks to be parallelised in Phase 2.
    interface PreparedItem {
        message: string;
        subject: string | undefined;
        selectedVariant: string;
        channel: ChannelType;
        locale: string | undefined;
        resolvedGmailId: string | undefined;
    }
    const preparedMap = new Map<string, PreparedItem>();
    // Enrollments that were already handled in Phase 1 (skipped/delayed/completed)
    const handledInPhase1 = new Set<string>();

    for (const enrollment of validEnrollments) {
        const sequence = enrollment.sequence as unknown as Sequence;
        const currentStepIndex = enrollment.current_step_index;
        const steps = sequence.steps as unknown as SequenceStep[];
        const _retryCount: number = enrollment.retry_count ?? 0;

        const settings = accountSettingsMap[enrollment.account_id];

        const lead = enrollment.lead;
        let leadMeta: Record<string, unknown> = {};
        try {
            leadMeta = typeof lead?.metadata === 'string'
                ? JSON.parse(lead.metadata)
                : (lead?.metadata || {});
        } catch {
            console.error(`[Processor] Invalid JSON metadata for lead ${lead?.id ?? enrollment.lead_id}, using empty object`);
        }


        // Global Unsubscribe check
        if (settings.respectUnsubscribes && leadMeta.unsubscribed === true) {
            await unsubscribeEnrollment(supabase, enrollment.id);
            handledInPhase1.add(enrollment.id);
            continue;
        }

        // Validation
        if (!steps || !Array.isArray(steps) || currentStepIndex >= steps.length) {
            await completeEnrollment(supabase, enrollment.id);
            handledInPhase1.add(enrollment.id);
            continue;
        }

        const currentStep = steps[currentStepIndex];
        const channel = currentStep.channel || 'email';

        // ── Akıllı Zaman Dilimi & Hafta Sonu Koruması ─────────────
        const recipientTimezone = (leadMeta.timezone as string) || settings.defaultTimezone || 'Europe/Istanbul';

        if (settings.preventWeekendSends && isWeekendInTimezone(recipientTimezone)) {
            const hoursUntilWorkday = getHoursUntilNextWorkday(recipientTimezone, settings.blackoutEndHour);
            const nextDueAt = new Date(Date.now() + hoursUntilWorkday * 60 * 60 * 1000).toISOString();
            await markEnrollmentDelayed(supabase, enrollment.id, nextDueAt);
            handledInPhase1.add(enrollment.id);
            continue;
        }

        // ── Mantıksal Dallanma (Condition Node) İşleme ─────────────
        if (currentStep.type === 'condition') {
            const { data: hasReplied } = await supabase
                .from('sequence_events')
                .select('id')
                .eq('enrollment_id', enrollment.id)
                .eq('event_type', 'replied')
                .limit(1)
                .maybeSingle();

            const branch: 'yes' | 'no' = hasReplied ? 'yes' : 'no';
            const nextIdx = findNextStepIndex(currentStepIndex, steps, branch);

            if (nextIdx !== -1) {
                const nextStep = steps[nextIdx];
                const delayHrs = nextStep.delay_hours || 24;
                const nextDueAt = new Date(Date.now() + delayHrs * 60 * 60 * 1000).toISOString();
                await supabase
                    .from('sequence_enrollments')
                    .update({
                        current_step_index: nextIdx,
                        next_step_due_at: nextDueAt,
                        status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', enrollment.id);
            } else {
                await completeEnrollment(supabase, enrollment.id);
            }
            handledInPhase1.add(enrollment.id);
            continue;
        }

        // ── Manuel Görev (Task Node) İşleme ─────────────
        if (currentStep.type === 'task') {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('account_id', enrollment.account_id)
                .limit(1)
                .maybeSingle();

            if (profile) {
                const leadName = lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email || 'Lead' : 'Lead';
                const taskTitle = `Manuel Görev: ${leadName}`;
                const taskMessage = currentStep.message_template || 'Lütfen müşteri adayıyla iletişime geçin.';
                
                await supabase.from('notifications').insert({
                    user_id: profile.id,
                    account_id: enrollment.account_id,
                    title: taskTitle,
                    message: taskMessage,
                    type: 'info',
                    read: false,
                    link: `/leads/${enrollment.lead_id}`
                });

                // Log task created event in sequence events
                const enriched = { ...enrollment, current_step_index: currentStepIndex };
                pendingSeqEvents.push(buildSeqEventRow(enriched, 'task', 'sent'));
            }

            // Pause the enrollment until task is marked completed manually
            await supabase
                .from('sequence_enrollments')
                .update({
                    status: 'paused',
                    next_step_due_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', enrollment.id);

            handledInPhase1.add(enrollment.id);
            continue;
        }

        // --- Limit Checking ---
        const accountPlan = accountPlanMap[enrollment.account_id] ?? 'free';
        const planLimits = getPlanLimits(accountPlan);
        const planLimit = channel === 'whatsapp' ? planLimits.monthlyWhatsappMessages : planLimits.dailyEmailMessages;
        const configuredLimit = channel === 'whatsapp' ? settings.monthlyWhatsappLimit : settings.dailyEmailLimit;
        const limit = Math.min(configuredLimit, planLimit);
        const currentUsage = getAccountDailyCount(enrollment.account_id, channel);
        if (currentUsage >= limit) {
            const notifyKey = `${enrollment.account_id}:${channel}`;
            if (currentUsage === limit && !limitNotifiedKeys.has(notifyKey)) {
                limitNotifiedKeys.add(notifyKey);
                const period = channel === 'whatsapp' ? 'monthly' : 'daily';
                sendSlackNotificationAdmin(enrollment.account_id, 'errors', {
                    severity: 'warning',
                    message: `${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} ${period} message limit reached (${limit} messages). Sequence sends are being delayed by 4 hours.`
                }).catch(() => {});
            }
            const nextDueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
            await markEnrollmentDelayed(supabase, enrollment.id, nextDueAt);
            handledInPhase1.add(enrollment.id);
            continue;
        }

        // --- Blackout Window Checking ---
        const currentHour = getCurrentHourInTimezone(recipientTimezone);
        if (isInBlackoutWindow(currentHour, settings.blackoutStartHour, settings.blackoutEndHour)) {
            if (settings.blackoutAction === 'skip') {
                await advanceStep(supabase, enrollment.id, currentStepIndex, steps);
            } else {
                const endHour = settings.blackoutEndHour;
                const hoursUntilEnd = currentHour < endHour
                    ? endHour - currentHour
                    : 24 - currentHour + endHour;
                const nextDueAt = new Date(Date.now() + hoursUntilEnd * 60 * 60 * 1000).toISOString();
                await markEnrollmentDelayed(supabase, enrollment.id, nextDueAt);
            }
            handledInPhase1.add(enrollment.id);
            continue;
        }

        let message = currentStep.message_template;
        let subject = currentStep.template_subject;
        let selectedVariant = 'a';

        if (currentStep.ab_test_enabled) {
            const hash = enrollment.id.split('-').pop() || '0';
            const variantBit = parseInt(hash.slice(-1), 16) % 2;
            if (variantBit === 1) {
                message = currentStep.message_template_b || message;
                subject = currentStep.template_subject_b || subject;
                selectedVariant = 'b';
            }
        }

        // Prepare data mapping (flattened)
        // We map both camelCase and snake_case to be extra safe
        const data: Record<string, string> = {
            firstName: lead?.first_name || '',
            first_name: lead?.first_name || '',
            firstname: lead?.first_name || '',
            lastName: lead?.last_name || '',
            last_name: lead?.last_name || '',
            lastname: lead?.last_name || '',
            email: lead?.email || '',
            company: lead?.company || (lead as any)?.company_name || '',
            ...(leadMeta as Record<string, string>)
        };

        const regexReplacer = (text: string): string => {
            if (!text) return text;
            let result = text;

            // 1. Comprehensive replacement using /{{ var }}/ format
            Object.keys(data).forEach(key => {
                const value = String(data[key] ?? '');
                result = result.replace(getTemplateRegex(key), value);
            });

            // 2. Fallback: If still has {{ firstName }} but we have first_name, try hardcoded patterns
            if (result.includes('{{')) {
                const fName = lead?.first_name || '';
                result = result.replace(/\{\{\s*(firstName|first_name|firstname)\s*\}\}/gi, fName);
                
                const lName = lead?.last_name || '';
                result = result.replace(/\{\{\s*(lastName|last_name|lastname)\s*\}\}/gi, lName);
            }

            return result;
        };

        if (message) message = regexReplacer(message);
        if (subject) subject = regexReplacer(subject);

        // Resolve Gmail using pre-fetched cache (no DB query per enrollment)
        let resolvedGmailId: string | undefined;
        if (channel === 'email') {
            resolvedGmailId =
                currentStep.from_gmail_id ||
                (enrollment as any).integration_id ||
                (enrollment.lead as any)?.preferred_integration_id ||
                primaryGmailCache[enrollment.account_id];
        }

        preparedMap.set(enrollment.id, {
            message: message || '',
            subject,
            selectedVariant,
            channel: channel as ChannelType,
            locale: (lead as any)?.language || undefined,
            resolvedGmailId,
        });
    }

    // ── Phase 2: Parallel translation for all non-English enrollments ─────
    const needsTranslation = [...preparedMap.entries()].filter(
        ([, p]) => p.locale && p.locale !== 'en' && (p.message || p.subject)
    );

    if (needsTranslation.length > 0) {
        const { translateEmail } = await import('@/core/i18n/translation-engine');
        const results = await Promise.allSettled(
            needsTranslation.map(([, p]) =>
                translateEmail(p.subject || '', p.message || '', p.locale!)
            )
        );
        for (let i = 0; i < needsTranslation.length; i++) {
            const r = results[i];
            const [enrollmentId, p] = needsTranslation[i];
            if (r.status === 'fulfilled') {
                if (r.value.subject) p.subject = r.value.subject;
                if (r.value.body) p.message = r.value.body;
            } else {
                console.error(`[Processor] Translation failed for enrollment ${enrollmentId}:`, r.reason);
            }
        }
    }

    // ── Phase 3: Send using prepared (and translated) content ─────────────
    for (const enrollment of validEnrollments) {
        if (handledInPhase1.has(enrollment.id)) continue;

        const prepared = preparedMap.get(enrollment.id);
        const sequence = enrollment.sequence as unknown as Sequence;
        const currentStepIndex = enrollment.current_step_index;
        const steps = sequence.steps as unknown as SequenceStep[];
        const retryCount: number = enrollment.retry_count ?? 0;

        if (!prepared || !prepared.message) {
            console.error(`[Processor] Error: No content found for step ${currentStepIndex} in enrollment ${enrollment.id}`);
            if (retryCount >= MAX_RETRIES) {
                await failEnrollment(supabase, enrollment.id);
            } else {
                const nextDueAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
                await markEnrollmentDelayed(supabase, enrollment.id, nextDueAt, retryCount + 1);
            }
            continue;
        }

        const { message, subject, channel, selectedVariant, resolvedGmailId } = prepared;

        const sendOptions: { subject?: string; htmlBody?: string } = { subject };
        if (channel === 'email') {
            const trackingPixel = generateTrackingPixel(
                enrollment.id,
                enrollment.sequence_id,
                currentStepIndex,
                enrollment.account_id
            );
            sendOptions.htmlBody = wrapMessageWithHtml(message, trackingPixel);
        }

        const { success, error: sendError, channel: usedChannel } = await sendViaChannel(
            enrollment.lead_id,
            message,
            channel,
            supabase,
            sendOptions,
            resolvedGmailId
        );

        if (success) {
            const enriched = { ...enrollment, current_step_index: currentStepIndex };
            pendingSeqEvents.push(buildSeqEventRow(enriched, usedChannel || channel, 'sent', undefined, selectedVariant, resolvedGmailId));
            const logRow = buildEventLogRow(enriched, usedChannel || channel, 'sent');
            if (logRow) pendingEventLogs.push(logRow);

            pendingConversationMessages.push({
                accountId: enrollment.account_id,
                leadId: enrollment.lead_id,
                channel: usedChannel || channel,
                content: message,
            });

            if (channel === 'whatsapp') dailyCounts[enrollment.account_id].whatsapp++;
            else dailyCounts[enrollment.account_id].email++;

            await advanceStep(supabase, enrollment.id, currentStepIndex, steps);
            processedCount++;
        } else {
            console.error(`[Processor] Failure: Failed to send ${enrollment.id}:`, sendError);

            const enrichedFailed = { ...enrollment, current_step_index: currentStepIndex };
            pendingSeqEvents.push(buildSeqEventRow(enrichedFailed, channel, 'failed', sendError, selectedVariant));
            const failLogRow = buildEventLogRow(enrichedFailed, channel, 'failed');
            if (failLogRow) pendingEventLogs.push(failLogRow);

            if (retryCount >= MAX_RETRIES) {
                await failEnrollment(supabase, enrollment.id);
                continue;
            }

            const backoffHours = Math.pow(2, retryCount);
            const nextDueAt = new Date(Date.now() + backoffHours * 60 * 60 * 1000).toISOString();
            await markEnrollmentDelayed(supabase, enrollment.id, nextDueAt, retryCount + 1);
        }
    }

    // Batch flush: events + conversation messages all in parallel (with error isolation)
    const flushResults = await Promise.allSettled([
        pendingSeqEvents.length > 0 ? supabaseAny.from('sequence_events').insert(pendingSeqEvents) : Promise.resolve(),
        pendingEventLogs.length > 0 ? supabaseAny.from('event_logs').insert(pendingEventLogs) : Promise.resolve(),
        pendingConversationMessages.length > 0
            ? bulkEnsureConversationsAndLogMessages(supabase, pendingConversationMessages)
            : Promise.resolve(),
    ]);

    const flushNames = ['sequence_events', 'event_logs', 'conversation_messages'];
    let flushFailures = 0;
    flushResults.forEach((result, i) => {
        if (result.status === 'rejected') {
            flushFailures++;
            const reason = result.reason;
            console.error(
                `[Processor] Failed to flush ${flushNames[i]}:`,
                reason instanceof Error ? reason.message : String(reason)
            );
        }
    });

    return { processed: processedCount, flushFailures };
}


function buildSeqEventRow(enrollment: Enrollment, channel: string, eventType: string, error?: string, variant?: string, integrationId?: string) {
    return {
        account_id: enrollment.account_id,
        sequence_id: enrollment.sequence_id,
        enrollment_id: enrollment.id,
        step_index: enrollment.current_step_index,
        lead_id: enrollment.lead_id,
        event_type: eventType,
        channel,
        ...(integrationId ? { integration_id: integrationId } : {}),
        metadata: {
            enrollment_id: enrollment.id,
            step_index: enrollment.current_step_index,
            ...(variant ? { variant } : {}),
            ...(error ? { error } : {})
        }
    }
}

function buildEventLogRow(enrollment: Enrollment, channel: string, eventType: string) {
    try {
        const lead = enrollment.lead;
        const leadName = lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email || 'Lead' : 'Lead';
        const leadEmail = lead?.email || 'Unknown';
        const logData: Record<string, unknown> = {
            sequence_id: enrollment.sequence_id,
            sequence_name: enrollment.sequence?.name,
            enrollment_id: enrollment.id,
            channel,
            step_index: enrollment.current_step_index,
            source: 'sequence',
            to: leadEmail,
        };
        if (eventType === 'sent') {
            logData['text'] = `Sequence message sent via ${channel} to ${leadName}`;
        } else {
            logData['error'] = `Failed to send sequence message via ${channel}`;
        }
        return {
            account_id: enrollment.account_id,
            event_type: eventType === 'sent' ? 'message.sent' : 'error.occurred',
            entity_type: 'lead',
            entity_id: enrollment.lead_id,
            data: logData,
        };
    } catch {
        return null;
    }
}

async function markEnrollmentDelayed(supabase: SupabaseClient<Database>, enrollmentId: string, nextDueAt: string, newRetryCount?: number) {
    const payload: Record<string, unknown> = {
        status: 'active', // CRITICAL: Reset to active so it can be picked up again later
        next_step_due_at: nextDueAt,
        updated_at: new Date().toISOString()
    };
    if (newRetryCount !== undefined) {
        payload['retry_count'] = newRetryCount;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('sequence_enrollments').update(payload as any).eq('id', enrollmentId);
}

async function advanceStep(supabase: SupabaseClient<Database>, enrollmentId: string, currentStepIndex: number, steps: SequenceStep[]) {
    const nextIndex = findNextStepIndex(currentStepIndex, steps);
    if (nextIndex !== -1 && nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        const delayHrs = nextStep.delay_hours || 24;
        const nextDueAt = new Date(Date.now() + delayHrs * 60 * 60 * 1000).toISOString();

        await supabase
            .from('sequence_enrollments')
            .update({
                status: 'active', // Important: set back to active for next pick up
                current_step_index: nextIndex,
                retry_count: 0,
                last_executed_at: new Date().toISOString(),
                next_step_due_at: nextDueAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', enrollmentId);
    } else {
        await completeEnrollment(supabase, enrollmentId);
    }
}

async function completeEnrollment(supabase: SupabaseClient<Database>, enrollmentId: string) {
    await supabase.from('sequence_enrollments').update({
        status: 'completed',
        retry_count: 0,
        next_step_due_at: null,
        last_executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }).eq('id', enrollmentId);
}

async function failEnrollment(supabase: SupabaseClient<Database>, enrollmentId: string) {
    await supabase.from('sequence_enrollments').update({
        status: 'failed',
        next_step_due_at: null,
        last_executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }).eq('id', enrollmentId);
}

async function unsubscribeEnrollment(supabase: SupabaseClient<Database>, enrollmentId: string) {
    await supabase.from('sequence_enrollments').update({
        status: 'unsubscribed',
        next_step_due_at: null,
        updated_at: new Date().toISOString()
    }).eq('id', enrollmentId);
}


async function bulkEnsureConversationsAndLogMessages(
    supabase: SupabaseClient<Database>,
    items: { accountId: string; leadId: string; channel: string; content: string }[]
) {
    if (items.length === 0) return;

    const now = new Date().toISOString();
    const leadIds = [...new Set(items.map(i => i.leadId))];

    // 1. Fetch all existing conversations for these leads in a single query
    const { data: existing } = await supabase
        .from('conversations')
        .select('id, lead_id, account_id')
        .in('lead_id', leadIds);

    const convMap = new Map<string, string>(); // "accountId:leadId" → conversation_id
    for (const c of existing || []) {
        convMap.set(`${c.account_id}:${c.lead_id}`, c.id);
    }

    // 2. Identify items that need a new conversation
    const toCreate = items.filter(i => !convMap.has(`${i.accountId}:${i.leadId}`));

    if (toCreate.length > 0) {
        const { data: created, error } = await supabase
            .from('conversations')
            .insert(
                toCreate.map(i => ({
                    account_id: i.accountId,
                    lead_id: i.leadId,
                    status: 'active',
                    channel: i.channel as 'email' | 'whatsapp' | 'sms',
                    last_message_at: now,
                }))
            )
            .select('id, lead_id, account_id');

        if (error) {
            console.error('[Processor] Error bulk-creating conversations:', error);
        }
        for (const c of created || []) {
            convMap.set(`${c.account_id}:${c.lead_id}`, c.id);
        }
    }

    // 3. Bulk update last_message_at for pre-existing conversations
    const existingIds = (existing || []).map(c => c.id);
    if (existingIds.length > 0) {
        await supabase
            .from('conversations')
            .update({ last_message_at: now })
            .in('id', existingIds);
    }

    // 4. Bulk insert all messages
    const messages = items
        .map(i => {
            const convId = convMap.get(`${i.accountId}:${i.leadId}`);
            if (!convId) return null;
            return {
                conversation_id: convId,
                sender_type: 'ai' as const,
                content: i.content,
            };
        })
        .filter((m): m is { conversation_id: string; sender_type: 'ai'; content: string } => m !== null);

    if (messages.length > 0) {
        const { error: msgError } = await supabase.from('messages').insert(messages);
        if (msgError) {
            console.error('[Processor] Error bulk-inserting messages:', msgError);
        }
    }
}
