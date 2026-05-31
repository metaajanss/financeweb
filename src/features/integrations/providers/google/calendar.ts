'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

/**
 * Google Calendar service for managing meetings
 */

/**
 * Initialize OAuth2 client with stored credentials.
 * Uses admin client to bypass RLS — safe because integrationId is already validated
 * by the caller (processMessage checks account ownership before passing the id).
 * This function is called from webhook handlers that have no user session context.
 */
async function getCalendarClient(integrationId: string) {
    // Must use admin client: webhook/AI paths have no user session, so the
    // cookie-based server client returns an unauthenticated client that cannot
    // read the integrations row due to RLS.
    const supabase = createAdminClient()

    const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', integrationId)
        .single()

    if (!(integration as Record<string, any>)?.config?.access_token) {
        throw new Error('Google Calendar not connected')
    }

    const calConfig = (integration as Record<string, any>)?.config as Record<string, any> //  import('@/types').GoogleCalendarConfig

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured in environment variables')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    oauth2Client.setCredentials({
        access_token: calConfig.access_token,
        refresh_token: calConfig.refresh_token,
        expiry_date: calConfig.expiry_date
    })

    // Persist refreshed tokens back to DB so subsequent requests don't reuse
    // an expired access_token.
    oauth2Client.on('tokens', async (newTokens) => {
        try {
            const updatedConfig = {
                ...calConfig,
                access_token: newTokens.access_token ?? calConfig.access_token,
                expiry_date: newTokens.expiry_date ?? calConfig.expiry_date,
                ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {})
            }
            await createAdminClient()
                .from('integrations')
                .update({ config: updatedConfig })
                .eq('id', integrationId)
        } catch (e) {
            console.error('[Calendar] Failed to persist refreshed tokens:', e)
        }
    })

    return oauth2Client
}

/**
 * Get authorization URL for Google Calendar OAuth
 */
export async function getCalendarAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent select_account'
    })

    return { url }
}

/**
 * Create an event in Google Calendar
 */
export async function createCalendarEvent(
    integrationId: string,
    eventData: {
        title: string
        description?: string
        startTime: string
        durationMinutes: number
        attendeeEmail?: string
        meetingLink?: string
    }
) {
    try {
        const oauth2Client = await getCalendarClient(integrationId)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const start = new Date(eventData.startTime)
        const end = new Date(start.getTime() + eventData.durationMinutes * 60000)

        const event: calendar_v3.Schema$Event = {
            summary: eventData.title,
            description: eventData.description,
            start: {
                dateTime: start.toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: end.toISOString(),
                timeZone: 'UTC',
            },
            attendees: eventData.attendeeEmail ? [{ email: eventData.attendeeEmail }] : [],
            reminders: {
                useDefault: true,
            },
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(7),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        }

        if (eventData.meetingLink) {
            event.location = eventData.meetingLink
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all',
        })

        // Give Google a moment to provision the conference if it wasn't immediate
        let hangoutLink = response.data.hangoutLink
        if (!hangoutLink && response.data.id) {
            // Wait 1.5s and re-fetch — often needed for conferenceData to appear
            await new Promise(resolve => setTimeout(resolve, 1500))
            const refreshed = await calendar.events.get({
                calendarId: 'primary',
                eventId: response.data.id
            })
            hangoutLink = refreshed.data.hangoutLink || 
                         refreshed.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri
        }


        return {
            success: true,
            eventId: response.data.id,
            hangoutLink: hangoutLink || undefined,
        }
    } catch (error: any) {
        console.error('[Calendar] Error creating event:', error.message, error.response?.data || '')
        return { success: false, error: error.message }
    }
}

/**
 * Update an event in Google Calendar
 */
export async function updateCalendarEvent(
    integrationId: string,
    eventId: string,
    eventData: Partial<{
        title: string
        description: string
        startTime: string
        durationMinutes: number
        attendeeEmail: string
        meetingLink: string
    }>
) {
    try {
        const oauth2Client = await getCalendarClient(integrationId)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const patch: Partial<calendar_v3.Schema$Event> = {}
        if (eventData.title) patch.summary = eventData.title
        if (eventData.description) patch.description = eventData.description
        if (eventData.startTime) {
            const start = new Date(eventData.startTime)
            patch.start = { dateTime: start.toISOString() }
            if (eventData.durationMinutes) {
                const end = new Date(start.getTime() + eventData.durationMinutes * 60000)
                patch.end = { dateTime: end.toISOString() }
            }
        }
        if (eventData.attendeeEmail) patch.attendees = [{ email: eventData.attendeeEmail }]
        if (eventData.meetingLink) patch.location = eventData.meetingLink

        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: patch,
        })

        return { success: true, eventId: response.data.id }
    } catch (error: any) {
        console.error('Error updating calendar event:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteCalendarEvent(integrationId: string, eventId: string) {
    try {
        const oauth2Client = await getCalendarClient(integrationId)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting calendar event:', error)
        return { success: false, error: error.message }
    }
}
/**
 * Check if a time slot is available
 */
export async function checkCalendarAvailability(
    integrationId: string,
    startTime: string,
    durationMinutes: number
) {
    try {
        const oauth2Client = await getCalendarClient(integrationId)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const start = new Date(startTime)
        const end = new Date(start.getTime() + durationMinutes * 60000)

        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: 'primary' }]
            }
        })

        const busy = response.data.calendars?.primary?.busy || []
        return {
            available: busy.length === 0,
            busySlots: busy
        }
    } catch (error: any) {
        console.error('Error checking availability:', error)
        return { available: false, error: error.message }
    }
}

/**
 * Exchange authorization code for tokens and save to database
 */
export async function connectCalendar(code: string) {
    const supabase = await createClient()

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Fetch user info to get email
    let email = null
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const { data: userInfo } = await oauth2.userinfo.get()
        email = userInfo.email
    } catch (infoErr) {
        console.error('Error fetching user info for Calendar:', infoErr)
        // Alternative fetch attempt
        try {
            if (tokens.access_token) {
                const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
                email = tokenInfo.email;
            }
        } catch (tokenErr) {
            console.error('Error fetching token info for Calendar:', tokenErr);
        }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    // Save tokens and email to integrations table
    const { error } = await supabase
        .from('integrations')
        .upsert({
            account_id: profile.account_id,
            provider: 'google_calendar',
            status: 'connected',
            config: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
                scope: tokens.scope,
                email: email
            }
        }, { onConflict: 'account_id,provider' })

    if (error) return { error: error.message }

    return { success: true }
}

/**
 * List events from Google Calendar within a date range.
 * Used for syncing Google Calendar events into the Payoff Lab meetings table.
 */
export async function listCalendarEvents(
    integrationId: string,
    options?: { timeMin?: string; timeMax?: string; maxResults?: number }
) {
    try {
        const oauth2Client = await getCalendarClient(integrationId)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const now = new Date()
        const timeMin = options?.timeMin
            ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()   // 7 days ago
        const timeMax = options?.timeMax
            ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()  // 90 days ahead

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            maxResults: options?.maxResults ?? 250,
            singleEvents: true,   // expand recurring events
            orderBy: 'startTime',
        })

        return { success: true, events: response.data.items || [] }
    } catch (error: any) {
        console.error('[Calendar] Error listing events:', error.message)
        return { success: false, events: [], error: error.message as string }
    }
}
