import { createAdminClient } from '@/core/db/admin'
import { checkCalendarAvailability, createCalendarEvent } from '@/features/integrations/providers/google/calendar'
import { sendViaChannel } from '@/core/channels'
import { logOperationalError, logOperationalEvent } from '@/core/observability/events'
import { calculateLeadScore } from '@/features/leads/services/scoring'
import { extractDateTime } from '@/core/ai/datetime'
import { detectSentiment } from '@/core/ai/sentiment'
import { determineIntent, type MessageIntent } from './intent'
import { generateResponse, type AIContext, type MeetingResult } from './response-generator'
import type { AIConfig } from '@/shared/types/ai-config'
import { getErrorMessage } from '@/core/errors/error-utils'
import { getWorkingHours, getAvatarConfig, getFallbackAction, type AIConfigFull } from '@/shared/types/ai-config-extended'
import { isCalendarIntegration } from '@/shared/types/integrations'

type ProcessMessageOptions = {
    externalMessageId?: string
    provider?: string
    channel?: string
    threadId?: string
    subject?: string
    html_body?: string
    media_url?: string
    media_type?: string
    media_filename?: string
}

/**
 * Recalculate and persist the lead score after each inbound message.
 * Runs fire-and-forget — never blocks the AI response path.
 */
async function refreshLeadScore(supabase: ReturnType<typeof createAdminClient>, leadId: string, accountId: string) {
    try {
        // Run all base queries in parallel — fetch full conversation IDs once (reused for both count + reply lookup)
        const [leadRes, convListRes, enrollRes] = await Promise.all([
            supabase.from('leads').select('email, phone, company, source, status, created_at').eq('id', leadId).single(),
            supabase.from('conversations').select('id').eq('lead_id', leadId).eq('account_id', accountId),
            supabase.from('sequence_enrollments').select('id', { count: 'exact', head: true }).eq('lead_id', leadId).eq('account_id', accountId),
        ])

        const lead = leadRes.data
        if (!lead) return

        const conversationIds = (convListRes.data ?? []).map(c => c.id)
        const conversationCount = conversationIds.length

        let leadReplyCount = 0
        if (conversationIds.length > 0) {
            const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('sender_type', 'lead')
                .in('conversation_id', conversationIds)
            leadReplyCount = count ?? 0
        }

        const score = calculateLeadScore({
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            source: lead.source,
            status: lead.status,
            conversationCount,
            leadReplyCount,
            enrollmentCount: enrollRes.count ?? 0,
            createdAt: lead.created_at,
        }).total

        await supabase.from('leads').update({ score }).eq('id', leadId)
    } catch (err: unknown) {
        console.warn('[refreshLeadScore] Non-fatal error:', getErrorMessage(err))
    }
}

/**
 * Main entry point: Process incoming message and generate AI response
 */
export async function processMessage(conversationId: string, incomingMessage: string, options: ProcessMessageOptions = {}) {
    const supabase = createAdminClient()

    // 1. Simple query — only core columns, no joins that could fail due to missing schema columns
    const { data: convBasicRaw, error: convBasicErr } = await supabase
        .from('conversations')
        .select('id, account_id, lead_id, is_ai_active, integration_id')
        .eq('id', conversationId)
        .single()

    if (convBasicErr || !convBasicRaw) {
        return { success: false, response: '', intent: 'unknown' as MessageIntent, error: 'Conversation not found' }
    }

    const convBasic = convBasicRaw

    // 2. Store user message IMMEDIATELY — this always succeeds regardless of AI logic below
    const { data: leadMsg } = await supabase.from('messages').insert([
        {
            conversation_id: conversationId,
            sender_type: 'lead',
            content: incomingMessage,
            metadata: {
                external_message_id: options.externalMessageId ?? null,
                gmail_message_id: options.externalMessageId ?? null,
                provider: options.provider ?? null,
                channel: options.channel ?? null,
                thread_id: options.threadId ?? null,
                subject: options.subject ?? null,
                html_body: options.html_body ?? null,
                media_url: options.media_url ?? null,
                media_type: options.media_type ?? null,
                media_filename: options.media_filename ?? null,
            }
        }
    ]).select('id').single()

    // 3. Update conversation timestamp + recalculate lead score in background
    await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

    refreshLeadScore(supabase, convBasic.lead_id, convBasic.account_id).catch(() => {})

    let response = ''
    let intent: MessageIntent = 'general'

    // 4. AI generation — wrapped in try/catch so a failure here doesn't affect the stored message
    try {
        const { data: convWithContext } = await supabase
            .from('conversations')
            .select(`
                *,
                lead:leads(id, first_name, last_name, email, language),
                account:accounts(company_name, timezone)
            `)
            .eq('id', conversationId)
            .eq('account_id', convBasic.account_id)
            .single()

        // ai_config fetched separately — column may not exist in all DB schemas
        let aiConfig: AIConfig | null = null
        try {
            const { data: acctData } = await supabase
                .from('accounts')
                .select('ai_config')
                .eq('id', convBasic.account_id)
                .maybeSingle()
            aiConfig = (acctData?.ai_config as AIConfig) || null
        } catch {}

        const conversation = convWithContext

        // Fetch message history for context
        const { data: historyMsgs } = await supabase
            .from('messages')
            .select('sender_type, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(10)

        // Gemini requires the first message to be from 'user' — drop any leading AI messages
        const allHistory = (historyMsgs || []).map(msg => ({
            role: msg.sender_type === 'lead' ? 'user' as const : 'assistant' as const,
            content: msg.content
        }))
        const firstUserIdx = allHistory.findIndex(m => m.role === 'user')
        const conversationHistory = firstUserIdx > 0 ? allHistory.slice(firstUserIdx) : allHistory

        // Run intent and sentiment in parallel — both are fast LLM calls
        const [detectedIntent, sentiment] = await Promise.all([
            determineIntent(incomingMessage),
            detectSentiment(incomingMessage),
        ])
        intent = detectedIntent

        // Detect language and update lead if necessary
        const lead = conversation?.lead || { id: convBasic.lead_id, first_name: 'Unknown', last_name: 'User', email: '', language: 'en' }
        let currentLang = lead.language || 'en'

        if (incomingMessage && incomingMessage.trim().length > 2) {
            try {
                const { detectLanguage } = await import('@/core/i18n/translation-engine');
                const detectedLang = await detectLanguage(incomingMessage);
                if (detectedLang && detectedLang !== currentLang) {
                    currentLang = detectedLang;
                    await supabase
                        .from('leads')
                        .update({ language: detectedLang })
                        .eq('id', lead.id);
                }
            } catch (err: unknown) {
                console.error('[processMessage] Failed to detect language:', getErrorMessage(err));
            }
        }

        // Sentiment escalation: flag conversation and notify admins if lead is angry/frustrated
        if (sentiment === 'negative') {
            try {
                await supabase
                    .from('conversations')
                    .update({ status: 'active' })
                    .eq('id', conversationId)

                await supabase.from('event_logs').insert({
                    account_id: convBasic.account_id,
                    event_type: 'ai.sentiment.negative',
                    entity_type: 'conversation',
                    entity_id: conversationId,
                    data: {
                        message: incomingMessage.slice(0, 300),
                        lead_id: convBasic.lead_id,
                        conversation_id: conversationId,
                    },
                })

                const escalationKeywords = ['lawsuit', 'lawyer', 'attorney', 'legal', 'sue', 'court', 'avukat', 'dava', 'mahkeme', 'şikayet', 'complaint']
                const isHighPriority = escalationKeywords.some(kw => incomingMessage.toLowerCase().includes(kw))

                if (isHighPriority) {
                    await supabase
                        .from('conversations')
                        .update({ is_ai_active: false })
                        .eq('id', conversationId)
                }

                try {
                    const { notifyAdmins } = await import('@/features/notifications')
                    await notifyAdmins(convBasic.account_id, {
                        title: isHighPriority ? '🚨 Priority Escalation' : '⚠️ Negative Sentiment Detected',
                        message: `Lead message requires attention: "${incomingMessage.slice(0, 80)}..."`,
                        type: isHighPriority ? 'error' : 'warning',
                        link: '/admin/conversations',
                    })
                } catch (err: unknown) {
                    console.debug('[processMessage] Admin notification failed:', getErrorMessage(err))
                }
            } catch (err: unknown) {
                console.error('[processMessage] Sentiment escalation error:', getErrorMessage(err))
            }
        }

        const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown User'

        let workingHours: { start: string; end: string } | undefined
        try {
            const parsedWh = getWorkingHours(aiConfig as AIConfigFull | null | undefined)
            if (parsedWh?.start && parsedWh?.end) {
                workingHours = { start: parsedWh.start, end: parsedWh.end }
            }
        } catch (err: unknown) {
            console.debug('[processMessage] Working hours extraction failed:', getErrorMessage(err))
        }

        const context: AIContext = {
            leadName,
            leadEmail: lead.email || '',
            leadLanguage: currentLang,
            conversationHistory,
            companyInfo: conversation?.account?.company_name || undefined,
            workingHours,
            aiConfig: {
                brand_voice: aiConfig?.brand_voice,
                knowledge_base: aiConfig?.knowledge_base,
                qualification_questions: aiConfig?.qualification_questions ?? [],
                fallback_action: aiConfig?.fallback_action ?? 'none',
                fallback_message: aiConfig?.fallback_message ?? '',
                persona_name: aiConfig?.persona_name ?? '',
                persona_intro: aiConfig?.persona_intro ?? '',
                forbidden_topics: aiConfig?.forbidden_topics ?? [],
                mandatory_rules: aiConfig?.mandatory_rules ?? [],
                faq_items: aiConfig?.faq_items ?? [],
            }
        }

        const isAiActive = convBasic.is_ai_active !== false
        const rawAutoResponse = aiConfig?.auto_response_enabled
        const globalAutoResponse = rawAutoResponse === true || rawAutoResponse === undefined || rawAutoResponse === null

        // Sequence Override: If lead is in an active sequence, use the step's ai_autopilot setting
        let isSequenceAutopilot: boolean | null = null;
        try {
            const { data: enrollment } = await supabase
                .from('sequence_enrollments')
                .select('sequence_id, current_step_index, sequence:sequences(steps)')
                .eq('account_id', convBasic.account_id)
                .eq('lead_id', convBasic.lead_id)
                .eq('status', 'active')
                .maybeSingle()

            if (enrollment && enrollment.sequence && typeof enrollment.sequence === 'object') {
                const sequence = enrollment.sequence as { steps?: Array<{ ai_autopilot?: boolean }> }
                const steps = sequence.steps ?? []
                const stepIndex = enrollment.current_step_index ?? 0
                const currentStep = steps[stepIndex]
                if (currentStep) {
                    isSequenceAutopilot = !!currentStep.ai_autopilot
                }
            }
        } catch (err: unknown) {
            console.debug('[processMessage] Sequence enrollment check failed:', getErrorMessage(err))
        }

        const isAutoResponseEnabled = isSequenceAutopilot !== null ? isSequenceAutopilot : globalAutoResponse

        console.log('[processMessage] flags:', { isAiActive, isAutoResponseEnabled, globalAutoResponse, rawAutoResponse })

        // Get language and timezone from database context instead of transient webhook headers
        const userTimezone = (convWithContext?.account as any)?.timezone || 'Europe/Istanbul';
        const isTurkish = currentLang.toLowerCase() === 'tr';

        if (isAiActive && isAutoResponseEnabled) {
            let meetingResult: MeetingResult | undefined = undefined
            let meetingCard = ''

            if (intent === 'booking') {
                const startTime = await extractDateTime(incomingMessage, userTimezone)

                const emailMatch = incomingMessage.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
                const guestEmail = emailMatch ? emailMatch[0] : context.leadEmail;

                if (startTime) {
                    const { data: calIntegration } = await supabase
                        .from('integrations')
                        .select('*')
                        .eq('account_id', convBasic.account_id)
                        .eq('provider', 'google_calendar')
                        .eq('status', 'connected')
                        .maybeSingle()

                    if (calIntegration && isCalendarIntegration(calIntegration as any)) {
                        const { available } = await checkCalendarAvailability(calIntegration.id, startTime, 60)
                        if (available) {
                            const result = await createCalendarEvent(calIntegration.id, {
                                title: `Meeting with ${context.leadName}`,
                                startTime,
                                durationMinutes: 60,
                                attendeeEmail: guestEmail,
                                description: `Automated meeting booked via Jumpix AI for ${context.leadName}`
                            })

                            if (result.success) {
                                try {
                                    const meetStart = new Date(startTime)
                                    const meetEnd = new Date(meetStart.getTime() + 60 * 60000)
                                    const meetingData = {
                                        account_id: convBasic.account_id,
                                        lead_id: convBasic.lead_id,
                                        title: `Meeting with ${context.leadName}`,
                                        description: `Automated meeting booked via AI from ${options.channel || 'chatbot'}`,
                                        scheduled_at: startTime,
                                        start_time: meetStart.toISOString(),
                                        end_time: meetEnd.toISOString(),
                                        duration_minutes: 60,
                                        status: 'scheduled',
                                        meeting_type: result.hangoutLink ? 'video' : 'other',
                                        meeting_link: result.hangoutLink ?? null,
                                        google_event_id: typeof result === 'object' && result !== null && 'eventId' in result ? (result as Record<string, unknown>).eventId as string | null : null,
                                    }
                                    const { data: meetData, error: meetInsertErr } = await supabase.from('meetings').insert(meetingData).select('id').single()

                                    if (meetInsertErr) {
                                        console.error('[processMessage] Meeting DB insert error:', meetInsertErr.message);
                                        meetingResult = { created: false };
                                    } else {
                                        meetingResult = { created: true, hangoutLink: result.hangoutLink, startTime };

                                        if (meetData?.id && result.hangoutLink) {
                                            try {
                                                const { data: acctCfg } = await supabase
                                                    .from('accounts')
                                                    .select('ai_config')
                                                    .eq('id', convBasic.account_id)
                                                    .single()
                                                const avatarConfig = getAvatarConfig(acctCfg?.ai_config as AIConfigFull | null | undefined)
                                                if (avatarConfig?.enabled) {
                                                    const { createBot } = await import('@/features/meetings/services/recall')
                                                    const bot = await createBot({
                                                        meeting_url: result.hangoutLink,
                                                        meeting_id: meetData.id,
                                                        account_id: convBasic.account_id,
                                                        join_at: startTime,
                                                    })
                                                    await supabase.from('meetings').update({
                                                        ai_avatar_enabled: true,
                                                        ai_avatar_bot_id: bot.id,
                                                        ai_avatar_status: 'pending',
                                                    }).eq('id', meetData.id)
                                                }
                                            } catch (avatarErr: unknown) {
                                                console.error('[processMessage] Avatar bot error (non-blocking):', getErrorMessage(avatarErr))
                                            }
                                        }

                                        try {
                                            const { notifyAdmins } = await import('@/features/notifications');
                                            const { sendSlackNotification } = await import('@/features/integrations/providers/messaging/slack');
                                            const { sendDiscordNotification } = await import('@/features/integrations/providers/messaging/discord');

                                            await notifyAdmins(convBasic.account_id, {
                                                title: isTurkish ? 'Web Siteden Yeni Randevu' : 'New Web Appointment',
                                                message: `${context.leadName} - ${new Date(startTime).toLocaleString(isTurkish ? 'tr-TR' : 'en-US')}`,
                                                type: 'success',
                                                link: '/admin/calendar'
                                            });

                                            await sendSlackNotification(convBasic.account_id, 'meetings', {
                                                lead_name: context.leadName,
                                                start_time: new Date(startTime).toLocaleString(),
                                                title: `[Widget AI] Meeting with ${context.leadName}`
                                            });

                                            await sendDiscordNotification(convBasic.account_id, 'meetings', {
                                                lead_name: context.leadName,
                                                start_time: new Date(startTime).toLocaleString(),
                                                title: `[Widget AI] Meeting with ${context.leadName}`
                                            });
                                        } catch (notifErr: unknown) {
                                            console.error('[processMessage] Notification warning:', getErrorMessage(notifErr));
                                        }
                                    }
                                } catch (dbErr: unknown) {
                                    console.error('[processMessage] Could not save meeting to DB:', getErrorMessage(dbErr))
                                    meetingResult = { created: false };
                                }

                                try {
                                    await supabase.from('event_logs').insert({
                                        account_id: convBasic.account_id,
                                        event_type: 'meeting.booked',
                                        entity_type: 'conversation',
                                        entity_id: conversationId,
                                        data: {
                                            lead_name: context.leadName,
                                            lead_email: context.leadEmail,
                                            time: startTime,
                                            hangout_link: result.hangoutLink ?? null,
                                            channel: options.channel ?? 'unknown',
                                        },
                                    })
                                } catch (err: unknown) {
                                    console.debug('[processMessage] Event log insert failed:', getErrorMessage(err))
                                }
                                const startDate = new Date(startTime)
                                const localeStr = isTurkish ? 'tr-TR' : 'en-US';
                                const formattedDate = startDate.toLocaleDateString(localeStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })
                                const formattedTime = startDate.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit', timeZone: userTimezone })
                                const meetLinkRow = result.hangoutLink
                                    ? (isTurkish ? `| 🔗 Google Meet | [Toplantıya Katıl](${result.hangoutLink}) |` : `| 🔗 Google Meet | [Join Meeting](${result.hangoutLink}) |`)
                                    : ''

                                if (isTurkish) {
                                    meetingCard = `\n\n---\n✅ **Toplantı Oluşturuldu!**\n\n| Detay | Bilgi |\n|-------|-------|\n| 📅 Tarih | ${formattedDate} |\n| 🕐 Saat | ${formattedTime} |\n| ⏱ Süre | 60 dakika |\n${meetLinkRow}`
                                    if (guestEmail) {
                                        meetingCard += `\n\n📧 Toplantı daveti **${guestEmail}** adresine gönderildi.`
                                    }
                                } else {
                                    meetingCard = `\n\n---\n✅ **Meeting Created!**\n\n| Detail | Information |\n|-------|-------|\n| 📅 Date | ${formattedDate} |\n| 🕐 Time | ${formattedTime} |\n| ⏱ Duration | 60 minutes |\n${meetLinkRow}`
                                    if (guestEmail) {
                                        meetingCard += `\n\n📧 A meeting invitation has been sent to **${guestEmail}**.`
                                    }
                                }

                                try {
                                    if (guestEmail) {
                                        const subject = isTurkish ? `Toplanti Onayi: Meeting with ${context.leadName}` : `Meeting Confirmation: Meeting with ${context.leadName}`;
                                        const meetLine = result.hangoutLink ? (isTurkish ? `\nGoogle Meet: ${result.hangoutLink}` : `\nGoogle Meet: ${result.hangoutLink}`) : ''
                                        const body = isTurkish
                                            ? `Merhaba ${context.leadName},\n\nToplantiniz basariyla olusturuldu!\n\nTarih: ${formattedDate}\nSaat: ${formattedTime}${meetLine}\n\nGorusmek uzere!\n-- Jumpix AI`
                                            : `Hello ${context.leadName},\n\nYour meeting has been successfully created!\n\nDate: ${formattedDate}\nTime: ${formattedTime}${meetLine}\n\nSee you then!\n-- Jumpix AI`;
                                        
                                        await sendViaChannel(
                                            convBasic.lead_id,
                                            body,
                                            'email',
                                            supabase,
                                            { subject }
                                        )
                                    }
                                } catch (emailErr: unknown) {
                                    console.error('[processMessage] Could not send email confirmation:', getErrorMessage(emailErr))
                                }
                            } else {
                                const errorMsg = typeof result === 'object' && result !== null && 'error' in result
                                    ? String((result as Record<string, unknown>).error)
                                    : 'Calendar event creation failed'
                                await logOperationalError({
                                    accountId: convBasic.account_id,
                                    integrationId: calIntegration.id,
                                    externalEventId: options.externalMessageId ?? null,
                                    provider: 'google_calendar',
                                    message: errorMsg,
                                    metadata: { conversation_id: conversationId },
                                })
                                meetingResult = { created: false }
                            }
                        } else {
                            meetingResult = { created: false, busy: true }
                        }
                    }
                } else {
                    meetingResult = { created: false, busy: false };
                }
            }

            const generated = await generateResponse(context, meetingResult)
            response = generated.response
            const aiError = generated.error

            if (aiError) {
                console.error('AI generation error:', aiError)
                await logOperationalError({
                    accountId: convBasic.account_id,
                    externalEventId: options.externalMessageId ?? null,
                    provider: options.provider,
                    message: aiError,
                    metadata: { conversation_id: conversationId, stage: 'ai_generation' },
                })
            } else {
                await logOperationalEvent({
                    accountId: convBasic.account_id,
                    externalEventId: options.externalMessageId ?? null,
                    provider: options.provider,
                    result: 'success',
                    eventType: 'ai.response.generated',
                    entityType: 'conversation',
                    entityId: conversationId,
                    data: { lead_message_id: leadMsg?.id ?? null },
                })

                if (meetingCard) response += meetingCard


                if (response.includes('[NEEDS_HUMAN]')) {
                    try {
                        await supabase.from('event_logs').insert({
                            account_id: convBasic.account_id,
                            event_type: 'ai.needs_human',
                            entity_type: 'conversation',
                            entity_id: conversationId,
                            data: {
                                question: incomingMessage.slice(0, 500),
                                lead_name: context.leadName,
                                lead_id: convBasic.lead_id,
                                added_to_kb: false,
                            },
                        })
                    } catch (err: unknown) {
                        console.debug('[processMessage] Needs human event log failed:', getErrorMessage(err))
                    }

                    response = response.replace('[NEEDS_HUMAN]', '').trim()
                    const fallbackMsg = aiConfig?.fallback_message || ''
                    const fallbackActionVal = getFallbackAction(aiConfig as AIConfigFull | null | undefined)
                    if (fallbackActionVal !== 'none' && fallbackActionVal !== null) {
                        if (fallbackActionVal === 'human_handoff') {
                            await supabase.from('conversations').update({ is_ai_active: false }).eq('id', conversationId)
                            if (fallbackMsg) response = response ? `${response}\n\n${fallbackMsg}` : fallbackMsg
                        } else if (fallbackActionVal === 'custom_message' && fallbackMsg) {
                            response = fallbackMsg
                        }
                    }
                }

                const delaySeconds = typeof aiConfig?.response_delay_seconds === 'number' ? aiConfig.response_delay_seconds : 0
                if (delaySeconds > 0) {
                    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000))
                }

                await supabase.from('messages').insert([{
                    conversation_id: conversationId,
                    sender_type: 'ai',
                    content: response
                }])

                if (options.channel && options.channel !== 'web_chatbot' && options.channel !== 'widget') {
                    const replySubject = options.subject ? `Re: ${options.subject}` : undefined
                    const delivery = await sendViaChannel(convBasic.lead_id, response, options.channel as any, supabase, {
                        threadId: options.threadId,
                        subject: replySubject
                    })
                    if (delivery.success) {
                        await logOperationalEvent({
                            accountId: convBasic.account_id,
                            externalEventId: options.externalMessageId ?? null,
                            provider: options.provider,
                            result: 'success',
                            eventType: 'channel.delivery.sent',
                            entityType: 'conversation',
                            entityId: conversationId,
                            data: { channel: delivery.channel },
                        })
                    } else {
                        await logOperationalError({
                            accountId: convBasic.account_id,
                            externalEventId: options.externalMessageId ?? null,
                            provider: options.provider,
                            message: delivery.error || 'Channel delivery failed',
                            metadata: { conversation_id: conversationId, channel: delivery.channel ?? null },
                        })
                    }
                }
            }
        }

    } catch (aiErr: unknown) {
        console.error('[processMessage] AI generation failed, message was still stored:', getErrorMessage(aiErr))
    }

    return { success: true, response, intent }
}
