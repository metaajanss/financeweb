'use server'

import { createClient, getUser, getProfile } from '@/core/db/server'
import { revalidatePath } from 'next/cache'
import { createCalendarEvent, updateCalendarEvent, listCalendarEvents } from '@/features/integrations/providers/google/calendar'
import { logEvent } from '@/features/notifications/server/activity-log'
import { triggerWebhook } from '@/core/webhooks/dispatch'
import { sendSlackNotification } from '@/features/integrations/providers/messaging/slack'
import { sendDiscordNotification } from '@/features/integrations/providers/messaging/discord'

export type Meeting = {
    id: string
    lead_id: string | null
    title: string | null
    description: string | null
    scheduled_at: string | null
    start_time: string
    end_time: string
    duration_minutes: number | null
    status: string | null
    meeting_type: string | null
    location: string | null
    meeting_link: string | null
    created_at: string | null
    recording_url?: string | null
    transcript_url?: string | null
    ai_avatar_status?: string | null
    lead?: {
        first_name: string | null
        last_name: string | null
        email: string | null
    }
}

export async function getMeetings() {
    try {
        const supabase = await createClient()

        const user = await getUser()
        if (!user) {
            console.log('[getMeetings] No user found')
            return []
        }

        const profile = await getProfile()
        if (!profile?.account_id) {
            console.log('[getMeetings] No profile or account_id found for user')
            return []
        }

        console.log('[getMeetings] Fetching meetings for account_id:', profile.account_id)

        const { data: meetings, error } = await supabase
            .from('meetings')
            .select(`
                *,
                lead:leads(
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('account_id', profile.account_id)
            .order('start_time', { ascending: true })

        if (error) {
            console.error('[getMeetings] Query error:', error.message, error.code)
            return []
        }

        console.log(`[getMeetings] Successfully fetched ${meetings?.length || 0} meetings`)
        return meetings as unknown as Meeting[]
    } catch (e) {
        console.error('[getMeetings] Fatal Error:', e)
        return []
    }
}

export async function createMeeting(data: {
    lead_id: string
    title: string
    description?: string
    scheduled_at: string
    duration_minutes: number
    meeting_link?: string
}) {
    const supabase = await createClient()

    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    const startTime = new Date(data.scheduled_at);
    const endTime = new Date(startTime.getTime() + (data.duration_minutes || 30) * 60000);

    const { data: insertedMeeting, error } = await supabase
        .from('meetings')
        .insert({
            account_id: profile.account_id,
            ...data,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled' as any
        })
        .select('id')
        .single()

    if (error) {
        return { error: error.message }
    }

    const meetingId = insertedMeeting?.id

    // Sync with Google Calendar if connected
    let finalMeetingLink = data.meeting_link || null

    const { data: calendarIntegration } = await supabase
        .from('integrations')
        .select('id, config')
        .eq('account_id', profile.account_id)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .single()

    if (calendarIntegration) {
        const { data: lead } = await supabase
            .from('leads')
            .select('email')
            .eq('id', data.lead_id)
            .single()

        const calendarResult = await createCalendarEvent(calendarIntegration.id, {
            title: data.title,
            description: data.description,
            startTime: data.scheduled_at,
            durationMinutes: data.duration_minutes,
            attendeeEmail: lead?.email || undefined,
            meetingLink: data.meeting_link
        })

        if (calendarResult.success && calendarResult.eventId) {
            // hangoutLink öncelikli — Google Meet otomatik oluşturulmuş olabilir
            finalMeetingLink = calendarResult.hangoutLink || data.meeting_link || null
            await supabase
                .from('meetings')
                .update({
                    google_event_id: calendarResult.eventId,
                    meeting_link: finalMeetingLink
                })
                .eq('account_id', profile.account_id)
                .eq('lead_id', data.lead_id)
                .is('google_event_id', null)
                .order('created_at', { ascending: false })
                .limit(1)
        }
    }

    // Auto-enable avatar (Pro/Business only, requires persona_id)
    // Note: Avatar enable is non-blocking — failure doesn't prevent meeting creation.
    // The admin can manually enable/disable avatar afterwards.
    if (meetingId && finalMeetingLink) {
        try {
            const { data: acctCfg } = await supabase
                .from('accounts')
                .select('ai_config, plan_id, subscription_status')
                .eq('id', profile.account_id)
                .single()

            const aiCfg = (acctCfg?.ai_config as any) || {}
            const avatarCfg = aiCfg.avatar_config || {}
            const plan = ((acctCfg?.plan_id || 'free') as string).toLowerCase()
            const subActive = !['canceled', 'past_due', 'paused'].includes((acctCfg?.subscription_status || '') as string)
            const personaId = (avatarCfg.persona_id || '').trim() || (process.env.ANAM_PERSONA_ID || '').trim()
            const isProPlus = plan === 'pro' || plan === 'business'

            if (avatarCfg.enabled && personaId && isProPlus && subActive) {
                const { createBot } = await import('@/features/meetings/services/recall')
                const { signAvatarToken } = await import('@/features/avatar/services/token')
                const token = await signAvatarToken({
                    account_id: profile.account_id,
                    meeting_id: meetingId,
                    persona_id: personaId,
                })
                const rendererBase =
                    process.env.AVATAR_RENDERER_BASE_URL?.trim() ||
                    (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/avatar-renderer` : '')
                const rendererUrl = rendererBase
                    ? `${rendererBase}${rendererBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                    : undefined

                const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
                const bot = await createBot({
                    meeting_url: finalMeetingLink,
                    meeting_id: meetingId,
                    account_id: profile.account_id,
                    join_at: data.scheduled_at,
                    output_video_webpage_url: rendererUrl,
                    webhook_url: siteUrl ? `${siteUrl}/api/webhooks/recall` : undefined,
                })
                const { error: updateErr } = await supabase.from('meetings').update({
                    ai_avatar_enabled: true,
                    ai_avatar_bot_id: bot.id,
                    ai_avatar_status: 'pending',
                }).eq('id', meetingId)

                if (updateErr) {
                    console.error('[createMeeting] Avatar update failed:', updateErr)
                    await logEvent('avatar.enable_failed', 'meeting', meetingId, {
                        reason: updateErr.message,
                        bot_id: bot.id,
                    }).catch(() => { /* non-fatal */ })
                }
            } else if (avatarCfg.enabled && (!personaId || !isProPlus || !subActive)) {
                console.warn('[createMeeting] Avatar enabled but blocked:', { plan, personaId: !!personaId, subActive })
            }
        } catch (avatarErr) {
            console.error('[createMeeting] Avatar bot error (non-blocking):', avatarErr)
            await logEvent('avatar.enable_failed', 'meeting', meetingId, {
                reason: avatarErr instanceof Error ? avatarErr.message : 'unknown error',
            }).catch(() => { /* non-fatal */ })
        }
    }

    // Logging & Webhooks
    await logEvent('meeting.booked', 'meeting', data.lead_id, {
        title: data.title,
        scheduled_at: data.scheduled_at
    });

    await triggerWebhook(profile.account_id, 'meeting.booked', { ...data, status: 'scheduled' });

    // Notify Slack
    const { data: leadInfo } = await supabase.from('leads').select('first_name, last_name').eq('id', data.lead_id).single();
    await sendSlackNotification(profile.account_id, 'meetings', {
        lead_name: leadInfo ? `${leadInfo.first_name} ${leadInfo.last_name}` : 'Unknown Lead',
        start_time: new Date(data.scheduled_at).toLocaleString(),
        title: data.title
    });

    // Notify Discord
    await sendDiscordNotification(profile.account_id, 'meetings', {
        lead_name: leadInfo ? `${leadInfo.first_name} ${leadInfo.last_name}` : 'Unknown Lead',
        start_time: new Date(data.scheduled_at).toLocaleString(),
        title: data.title
    });

    // NEW: Dashboard Notification
    const { notifyAdmins } = await import('@/features/notifications/server/actions');
    await notifyAdmins(profile.account_id, {
        title: 'New Meeting Booked',
        message: `${leadInfo ? leadInfo.first_name : 'A lead'} has booked a meeting: ${data.title}`,
        type: 'success',
        link: '/admin/calendar'
    });

    revalidatePath('/admin/calendar')
    return { success: true }
}

export async function updateMeeting(id: string, data: Partial<Meeting>) {
    const supabase = await createClient()

    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    // Omit virtual properties that don't map to database columns
    const { lead, ...updateData } = data

    const { error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id)
        .eq('account_id', profile.account_id)

    if (error) {
        return { error: error.message }
    }

    // Update in Google Calendar if synced
    const { data: meeting } = await supabase
        .from('meetings')
        .select('account_id, google_event_id')
        .eq('id', id)
        .single()

    if (meeting?.google_event_id) {
        const { data: calendarIntegration } = await supabase
            .from('integrations')
            .select('id')
            .eq('account_id', meeting.account_id)
            .eq('provider', 'google_calendar')
            .eq('status', 'connected')
            .single()

        if (calendarIntegration) {
            await updateCalendarEvent(calendarIntegration.id, meeting.google_event_id as string, {
                title: data.title ?? undefined,
                description: data.description ?? undefined,
                startTime: data.scheduled_at ?? undefined,
                durationMinutes: data.duration_minutes ?? undefined,
                meetingLink: data.meeting_link ?? undefined
            })
        }
    }

    // Trigger Webhook if cancelled
    if (data.status === 'cancelled') {
        const { data: fullMeeting } = await supabase.from('meetings').select('*').eq('id', id).single()
        if (fullMeeting) {
            triggerWebhook(profile.account_id, 'meeting.cancelled', fullMeeting).catch(e => console.warn('Webhook Error:', e))
        }
    }

    revalidatePath('/admin/calendar')
    return { success: true }
}

/**
 * Create a manual Google Meet meeting from the calendar UI (not tied to a CRM lead).
 * Uses the existing Google Calendar integration to provision a Hangouts Meet
 * link, then stores a meetings row.
 */
export async function createManualMeeting(input: {
    title: string
    /** Local datetime string from <input type="datetime-local"> in the user's TZ. */
    startsAtLocal: string
    durationMinutes: number
    attendeeEmail?: string
    description?: string
    leadId?: string
}) {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    const title = input.title?.trim()
    if (!title) return { error: 'Başlık zorunludur' }
    if (!input.startsAtLocal) return { error: 'Tarih/saat zorunludur' }
    const duration = Number(input.durationMinutes)
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
        return { error: 'Süre 5-480 dakika arasında olmalı' }
    }

    // Convert local datetime → UTC ISO. <input type="datetime-local"> emits
    // values like "2026-05-08T14:30" with no timezone; new Date(...) interprets
    // those in the browser's TZ on the client; on the server we use the account
    // timezone if available, fallback to UTC.
    const { data: account } = await supabase
        .from('accounts')
        .select('timezone')
        .eq('id', profile.account_id)
        .single()
    const tz = account?.timezone || 'UTC'
    const startUtcIso = localDatetimeToUtcIso(input.startsAtLocal, tz)
    if (!startUtcIso) return { error: 'Tarih/saat çözümlenemedi' }
    const endUtcIso = new Date(new Date(startUtcIso).getTime() + duration * 60_000).toISOString()

    const { data: integration } = await supabase
        .from('integrations')
        .select('id')
        .eq('account_id', profile.account_id)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .maybeSingle()
    if (!integration) {
        return { error: 'Google Calendar bağlantısı gerekli. Ayarlar → Entegrasyonlar.' }
    }

    const calRes = await createCalendarEvent(integration.id, {
        title,
        description: input.description,
        startTime: startUtcIso,
        durationMinutes: duration,
        attendeeEmail: input.attendeeEmail || undefined,
    })
    if (!calRes.success) {
        return { error: calRes.error || 'Google Calendar etkinliği oluşturulamadı' }
    }

    const { data: meeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
            account_id: profile.account_id,
            lead_id: input.leadId || null,
            title,
            description: input.description || null,
            start_time: startUtcIso,
            end_time: endUtcIso,
            scheduled_at: startUtcIso,
            duration_minutes: duration,
            meeting_link: calRes.hangoutLink || null,
            google_event_id: calRes.eventId || null,
            status: 'scheduled',
        })
        .select('id')
        .single()
    if (insertError) {
        return { error: insertError.message }
    }

    await logEvent('meeting.manual_created', 'meeting', meeting.id, {
        title,
        scheduled_at: startUtcIso,
    }).catch(() => { /* non-fatal */ })

    // Auto-enable avatar (same logic as createMeeting)
    const meetingUrl = calRes.hangoutLink || null
    if (!meetingUrl) {
        console.warn('[createManualMeeting] No hangoutLink returned from Google Calendar — avatar skipped')
    } else {
        try {
            const { data: acctCfg } = await supabase
                .from('accounts')
                .select('ai_config, plan_id, subscription_status')
                .eq('id', profile.account_id)
                .single()

            const aiCfg = (acctCfg?.ai_config as any) || {}
            const avatarCfg = aiCfg.avatar_config || {}
            const plan = ((acctCfg?.plan_id || 'free') as string).toLowerCase()
            const subActive = !['canceled', 'past_due', 'paused'].includes((acctCfg?.subscription_status || '') as string)
            const personaId = (avatarCfg.persona_id || '').trim() || (process.env.ANAM_PERSONA_ID || '').trim()
            const isProPlus = plan === 'pro' || plan === 'business'

            console.log('[createManualMeeting] Avatar check:', {
                avatarEnabled: avatarCfg.enabled,
                plan,
                isProPlus,
                hasPersonaId: !!personaId,
                subActive,
                subscriptionStatus: acctCfg?.subscription_status,
            })

            if (avatarCfg.enabled && personaId && isProPlus && subActive) {
                const { createBot } = await import('@/features/meetings/services/recall')
                const { signAvatarToken } = await import('@/features/avatar/services/token')
                const token = await signAvatarToken({
                    account_id: profile.account_id,
                    meeting_id: meeting.id,
                    persona_id: personaId,
                })
                const rendererBase =
                    process.env.AVATAR_RENDERER_BASE_URL?.trim() ||
                    (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/avatar-renderer` : '')
                const rendererUrl = rendererBase
                    ? `${rendererBase}${rendererBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                    : undefined

                const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
                const bot = await createBot({
                    meeting_url: meetingUrl,
                    meeting_id: meeting.id,
                    account_id: profile.account_id,
                    join_at: startUtcIso,
                    output_video_webpage_url: rendererUrl,
                    webhook_url: siteUrl ? `${siteUrl}/api/webhooks/recall` : undefined,
                })
                await supabase.from('meetings').update({
                    ai_avatar_enabled: true,
                    ai_avatar_bot_id: bot.id,
                    ai_avatar_status: 'pending',
                }).eq('id', meeting.id)
            } else if (avatarCfg.enabled) {
                console.warn('[createManualMeeting] Avatar enabled but blocked:', {
                    plan,
                    isProPlus,
                    hasPersonaId: !!personaId,
                    subActive,
                    subscriptionStatus: acctCfg?.subscription_status,
                })
            }
        } catch (avatarErr) {
            console.error('[createManualMeeting] Avatar bot error (non-blocking):', avatarErr)
            await logEvent('avatar.enable_failed', 'meeting', meeting.id, {
                reason: avatarErr instanceof Error ? avatarErr.message : 'unknown error',
            }).catch(() => { /* non-fatal */ })
        }
    }

    revalidatePath('/admin/calendar')
    return { success: true, meetingId: meeting.id, hangoutLink: calRes.hangoutLink }
}

/**
 * Convert a "YYYY-MM-DDTHH:mm" datetime-local value (interpreted in the given
 * IANA timezone) to a UTC ISO string. Uses Intl to find the offset.
 */
function localDatetimeToUtcIso(local: string, timeZone: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local)
    if (!m) return null
    const [, y, mo, d, h, mi, s = '0'] = m
    // Treat the local components as if they were UTC, then subtract the TZ offset.
    const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
        const parts = fmt.formatToParts(new Date(asUtc))
        const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0')
        const observedUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
        const offsetMs = observedUtc - asUtc
        return new Date(asUtc - offsetMs).toISOString()
    } catch {
        return new Date(asUtc).toISOString()
    }
}

/**
 * Fetch a complete post-meeting report: meeting row + transcript chunks +
 * AI-generated summary (cached in metadata after first generation).
 */
export async function getMeetingReport(meetingId: string) {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, title, status, scheduled_at, start_time, end_time, recording_url, transcript_url, ai_avatar_status, metadata, lead:leads(first_name, last_name, email)')
        .eq('id', meetingId)
        .eq('account_id', profile.account_id)
        .single()
    if (meetingError || !meeting) {
        return { error: 'Toplantı bulunamadı' }
    }

    const { data: transcripts } = await supabase
        .from('meeting_transcripts')
        .select('id, speaker, content, spoken_at, created_at')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true })

    const meta = (meeting.metadata as Record<string, unknown> | null) || {}
    const avatarMetrics = (meta['avatar_metrics'] as Record<string, unknown> | undefined) || {}
    let summary = (meta['summary'] as string | undefined) || ''

    // Lazy summary generation (only if we have transcripts and no cached summary).
    if (!summary && transcripts && transcripts.length > 0) {
        try {
            const { summarizeMeetingTranscript } = await import('@/features/avatar/services/presentation')
            const accountRow = await supabase
                .from('accounts')
                .select('language')
                .eq('id', profile.account_id)
                .single()
            const language = accountRow.data?.language || 'tr'
            summary = await summarizeMeetingTranscript(
                transcripts.map(t => ({ speaker: t.speaker, content: t.content })),
                language,
            )
            if (summary) {
                 
                await supabase.rpc('merge_meeting_metadata', {
                    p_meeting_id: meetingId,
                    p_account_id: profile.account_id,
                    p_patch: { summary } as any,
                })
            }
        } catch (err) {
            console.warn('[getMeetingReport] summary generation failed:', err)
        }
    }

    return {
        meeting: {
            id: meeting.id,
            title: meeting.title,
            status: meeting.status,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            scheduled_at: meeting.scheduled_at,
            recording_url: meeting.recording_url,
            transcript_url: meeting.transcript_url,
            ai_avatar_status: meeting.ai_avatar_status,
            lead: meeting.lead,
        },
        transcripts: transcripts || [],
        metrics: avatarMetrics,
        summary,
    }
}

export async function deleteMeeting(id: string) {
    const supabase = await createClient()

    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    // Fetch before delete to trigger webhook
    const { data: meeting } = await supabase.from('meetings').select('*').eq('id', id).single()

    const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id)
        .eq('account_id', profile.account_id)

    if (error) {
        return { error: error.message }
    }

    if (meeting) {
        triggerWebhook(profile.account_id, 'meeting.cancelled', { ...meeting, status: 'cancelled' }).catch(e => console.warn('Webhook Error:', e))
    }

    revalidatePath('/admin/calendar')
    return { success: true }
}

export async function checkAvailability(date: string) {
    const supabase = await createClient()

    const user = await getUser()
    if (!user) return { available: false }

    const profile = await getProfile()
    if (!profile?.account_id) return { available: false }

    // Get all meetings for the specified date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: meetings, error } = await supabase
        .from('meetings')
        .select('scheduled_at, duration_minutes')
        .eq('account_id', profile.account_id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())

    if (error) {
        console.error('Error checking availability:', error)
        return { available: false }
    }

    // Simple availability check - if less than 8 meetings, consider available
    return {
        available: meetings.length < 8,
        bookedSlots: meetings.length
    }
}

/**
 * Check whether Google Calendar integration is connected for this account.
 */
export async function getGoogleCalendarStatus() {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return { connected: false }
    const profile = await getProfile()
    if (!profile?.account_id) return { connected: false }

    const { data } = await supabase
        .from('integrations')
        .select('id, config')
        .eq('account_id', profile.account_id)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .maybeSingle()

    return {
        connected: !!data,
        integrationId: (data as any)?.id as string | undefined,
        email: (data as any)?.config?.email as string | undefined,
    }
}

/**
 * Pull events from Google Calendar and upsert them into the meetings table.
 * Uses google_event_id as the deduplication key.
 */
export async function syncGoogleCalendarEvents(shouldRevalidate = true) {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account found' }

    const { data: calIntegration } = await supabase
        .from('integrations')
        .select('id')
        .eq('account_id', profile.account_id)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .maybeSingle()

    if (!calIntegration) return { error: 'Google Calendar not connected' }

    const { success, events, error } = await listCalendarEvents((calIntegration as any).id)
    if (!success) return { error: error || 'Failed to fetch calendar events' }

    let synced = 0
    let updated = 0

    for (const event of events) {
        if (!event.id) continue

        const startRaw = event.start?.dateTime ?? event.start?.date
        const endRaw   = event.end?.dateTime   ?? event.end?.date
        if (!startRaw) continue

        const startDate = new Date(startRaw)
        const endDate   = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 60 * 60000)
        const durationMinutes = Math.max(
            1,
            Math.round((endDate.getTime() - startDate.getTime()) / 60000)
        )

        const meetLink =
            event.hangoutLink ??
            (event.conferenceData as any)?.entryPoints?.find(
                (ep: any) => ep.entryPointType === 'video'
            )?.uri ??
            null

        const isVideoMeeting = !!meetLink || event.summary?.toLowerCase().includes('meet')
        const isCancelled = event.status === 'cancelled'

        // Check if this Google Calendar event is already in Payoff Lab
        const { data: existing } = await supabase
            .from('meetings')
            .select('id, meeting_link')
            .eq('account_id', profile.account_id)
            .eq('google_event_id', event.id)
            .maybeSingle()

        if (existing) {
            await supabase
                .from('meetings')
                .update({
                    title: event.summary || 'Google Calendar Event',
                    description: event.description ?? null,
                    scheduled_at: startDate.toISOString(),
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    duration_minutes: durationMinutes,
                    meeting_link: meetLink ?? (existing as any).meeting_link ?? null,
                    status: (isCancelled ? 'cancelled' : 'scheduled') as any,
                    meeting_type: (isVideoMeeting ? 'video' : 'other') as any,
                } as any)
                .eq('id', (existing as any).id)
            updated++
        } else {
            if (isCancelled) continue // don't import already-cancelled events

            await supabase
                .from('meetings')
                .insert({
                    account_id: profile.account_id,
                    title: event.summary || 'Google Calendar Event',
                    description: event.description ?? null,
                    scheduled_at: startDate.toISOString(),
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    duration_minutes: durationMinutes,
                    status: 'scheduled',
                    meeting_link: meetLink,
                    google_event_id: event.id,
                    meeting_type: isVideoMeeting ? 'video' : 'other',
                } as any)
            synced++
        }
    }
    if (shouldRevalidate) {
        revalidatePath('/admin/calendar')
    }
    return { success: true, synced, updated }
}
