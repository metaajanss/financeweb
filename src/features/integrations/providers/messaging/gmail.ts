import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, GmailConfig } from '@/shared/types'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

/**
 * Gmail service for reading and sending emails
 */

export type GmailMessage = {
    id: string
    threadId: string
    from: string
    to: string
    subject: string
    body: string
    htmlBody?: string
    receivedAt: string
}



/**
 * Initialize OAuth2 client with stored credentials
 */
async function getGmailClient(integrationId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || createAdminClient()

    const { data: integration } = await supabase
        .from('integrations')
        .select('id, config')
        .eq('id', integrationId)
        .single();

    const gmailConfig = (integration?.config || {}) as unknown as GmailConfig;

    if (!gmailConfig?.access_token) {
        throw new Error('Gmail not connected')
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || ''

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    oauth2Client.setCredentials({
        access_token: gmailConfig.access_token,
        refresh_token: gmailConfig.refresh_token,
        expiry_date: gmailConfig.expiry_date
    })

    // Check if token is expired and refresh if necessary
    if (gmailConfig.expiry_date && Date.now() >= gmailConfig.expiry_date) {
        const { credentials } = await oauth2Client.refreshAccessToken()

        const newExpiryDate = credentials.expiry_date ?? (Date.now() + 3600 * 1000);

        await supabase
            .from('integrations')
            .update({
                config: {
                    ...gmailConfig,
                    access_token: credentials.access_token,
                    expiry_date: newExpiryDate
                }
            })
            .eq('id', integrationId)

        oauth2Client.setCredentials({ ...credentials, expiry_date: newExpiryDate })
    }

    return oauth2Client
}

/**
 * Get authorization URL for Gmail OAuth
 */
export async function getGmailAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
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
 * Get the primary Gmail integration for an account.
 * Falls back to any connected Gmail if no primary is set.
 */
export async function getPrimaryGmailIntegration(accountId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || createAdminClient()

    const { data: primary } = await supabase
        .from('integrations')
        .select('*')
        .eq('account_id', accountId)
        .eq('provider', 'gmail')
        .eq('is_primary', true)
        .eq('status', 'connected')
        .maybeSingle()

    if (primary) return primary

    const { data: fallback } = await supabase
        .from('integrations')
        .select('*')
        .eq('account_id', accountId)
        .eq('provider', 'gmail')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()

    return fallback ?? null
}

/**
 * Get the primary Email integration for an account (Gmail or SMTP).
 * Prioritizes Gmail if both have primary, otherwise picks the available primary, or fallback.
 */
export async function getPrimaryEmailIntegration(accountId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || createAdminClient()

    const { data: primaries } = await supabase
        .from('integrations')
        .select('*')
        .eq('account_id', accountId)
        .in('provider', ['gmail', 'email'])
        .eq('is_primary', true)
        .eq('status', 'connected')

    if (primaries && primaries.length > 0) {
        const gmailPrimary = primaries.find(p => p.provider === 'gmail')
        if (gmailPrimary) return gmailPrimary
        return primaries[0]
    }

    const { data: fallback } = await supabase
        .from('integrations')
        .select('*')
        .eq('account_id', accountId)
        .in('provider', ['gmail', 'email'])
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()

    return fallback ?? null
}

/**
 * Exchange authorization code for tokens and save to database.
 * Inserts a new row — same Gmail address cannot be added twice.
 * First Gmail for an account is automatically set as primary.
 */
export async function connectGmail(code: string) {
    const supabase = await createClient()

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

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
    let email: string | null = null
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const { data: userInfo } = await oauth2.userinfo.get()
        email = userInfo.email ?? null
    } catch (infoErr) {
        console.error('Error fetching user info for Gmail:', infoErr)
        try {
            if (tokens.access_token) {
                const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
                email = tokenInfo.email ?? null;
            }
        } catch (tokenErr) {
            console.error('Error fetching token info for Gmail:', tokenErr);
        }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

    const profile = rawProfile;
    if (!profile?.account_id) return { error: 'No account found' }

    const accountId = profile.account_id

    // Check if this Gmail address is already connected
    if (email) {
        const { data: existing } = await supabase
            .from('integrations')
            .select('id')
            .eq('account_id', accountId)
            .eq('provider', 'gmail')
            .eq('status', 'connected')
            .filter('config->>email', 'eq', email)
            .maybeSingle()

        if (existing) return { error: 'gmail_already_connected', email }
    }

    // First Gmail for this account becomes primary automatically.
    // Also check if any email integration (SMTP or Gmail) already exists to decide primary status.
    const { data: existingEmailIntegrations } = await supabase
        .from('integrations')
        .select('id, is_primary')
        .eq('account_id', accountId)
        .in('provider', ['gmail', 'email'])

    const hasExistingPrimary = existingEmailIntegrations?.some(i => i.is_primary) ?? false
    const isPrimary = !existingEmailIntegrations || existingEmailIntegrations.length === 0

    // If this new Gmail will become primary, unset all existing email primaries first
    if (isPrimary && hasExistingPrimary) {
        await supabase
            .from('integrations')
            .update({ is_primary: false })
            .eq('account_id', accountId)
            .in('provider', ['gmail', 'email'])
    }

    const { error } = await supabase
        .from('integrations')
        .insert({
            account_id: accountId,
            provider: 'gmail',
            status: 'connected',
            is_primary: isPrimary,
            config: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
                scope: tokens.scope,
                email: email
            }
        })

    if (error) return { error: error.message }

    return { success: true, email }
}

/**
 * Fetch new emails from Gmail
 */
export async function fetchGmailMessages(integrationId: string): Promise<GmailMessage[]> {
    const supabase = createAdminClient()
    const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', integrationId)
        .single()
    
    const config = (integration?.config as unknown as GmailConfig) || {}
    const oauth2Client = await getGmailClient(integrationId)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Determine start time: last_pulled_at or 24 hours ago for initial sync
    let startTime: number
    if (config.last_pulled_at) {
        startTime = config.last_pulled_at
    } else {
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        startTime = Math.floor(oneDayAgo.getTime() / 1000)
    }

    // Look back 6 hours by default, or from last sync if available
    const lookbackTime = startTime - 21600; // 6 hours
    const query = `after:${lookbackTime}`;
    
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        includeSpamTrash: true,
        maxResults: 50
    })

    const messages: GmailMessage[] = []

    if (!response.data.messages) {
        return []
    }


    for (const message of response.data.messages) {
        try {
            const msgDetail = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full'
            })
            
            const labelIds = msgDetail.data.labelIds || []

            // Only process INBOX messages that we didn't send
            const isInbox = labelIds.includes('INBOX')
            const isSent = labelIds.includes('SENT')
            if (!isInbox || (isSent && !isInbox)) {
                continue
            }

            // Skip promotional, social, updates, and forum category emails (Gmail auto-labels)
            const isPromotional =
                labelIds.includes('CATEGORY_PROMOTIONS') ||
                labelIds.includes('CATEGORY_SOCIAL') ||
                labelIds.includes('CATEGORY_UPDATES') ||
                labelIds.includes('CATEGORY_FORUMS')

            if (isPromotional) {
                continue
            }

            const headers = msgDetail.data.payload?.headers || []
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

            const from = getHeader('From')
            const to = getHeader('To')
            const subject = getHeader('Subject')
            const date = getHeader('Date')
            const autoSubmitted = getHeader('auto-submitted')
            const precedence = getHeader('precedence')
            const xAutoResponse = getHeader('x-auto-response-suppress')
            const listUnsubscribe = getHeader('list-unsubscribe')
            const listId = getHeader('list-id')

            // Skip bounces, delivery notifications, automated emails, and marketing/newsletter emails
            const isAutomatedEmail =
                // Header checks (standard for automated mail)
                (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
                (precedence && (precedence.toLowerCase() === 'bulk' || precedence.toLowerCase() === 'junk' || precedence.toLowerCase() === 'list')) ||
                (xAutoResponse && xAutoResponse.toLowerCase() !== 'none') ||
                // Marketing/newsletter indicators
                listUnsubscribe !== '' ||
                listId !== '' ||
                // Keyword checks in subject/from
                subject.toLowerCase().includes('delivery status notification') ||
                subject.toLowerCase().includes('mailer-daemon') ||
                subject.toLowerCase().includes('mail delivery subsystem') ||
                subject.toLowerCase().includes('undelivered mail') ||
                subject.toLowerCase().includes('mail delivery failed') ||
                subject.toLowerCase().includes('automatic reply') ||
                subject.toLowerCase().includes('out of office') ||
                subject.toLowerCase().includes('unsubscribe') ||
                from.toLowerCase().includes('mailer-daemon') ||
                from.toLowerCase().includes('postmaster') ||
                from.toLowerCase().includes('mail delivery subsystem') ||
                from.toLowerCase().includes('microsoft outlook') ||
                from.toLowerCase().includes('noreply@') ||
                from.toLowerCase().includes('no-reply@') ||
                from.toLowerCase().includes('donotreply@') ||
                from.toLowerCase().includes('do-not-reply@')

            if (isAutomatedEmail) {
                continue
            }

            // Extract body: text/plain first, fallback to text/html
            let body = ''
            let htmlBody = ''
            const payload = msgDetail.data.payload
            if (payload?.body?.data) {
                const raw = Buffer.from(payload.body.data, 'base64').toString('utf-8')
                body = raw
                if (raw.includes('<div') || raw.includes('<body') || raw.includes('<p>')) {
                    htmlBody = raw
                    body = raw.replace(/<[^>]*>?/gm, '')
                }
            } else if (payload?.parts) {
                let plainPart = payload.parts.find(p => p.mimeType === 'text/plain')
                let htmlPart = payload.parts.find(p => p.mimeType === 'text/html')
                if (!plainPart && !htmlPart) {
                    const nested = payload.parts.find(p => p.mimeType === 'multipart/alternative')
                    if (nested?.parts) {
                        plainPart = nested.parts.find(p => p.mimeType === 'text/plain')
                        htmlPart = nested.parts.find(p => p.mimeType === 'text/html')
                    }
                }
                if (plainPart?.body?.data) {
                    body = Buffer.from(plainPart.body.data, 'base64').toString('utf-8')
                }
                if (htmlPart?.body?.data) {
                    htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8')
                    if (!body) body = htmlBody.replace(/<[^>]*>?/gm, '')
                } else if (!plainPart && !htmlPart) {
                    const part = payload.parts[0]
                    if (part?.body?.data) {
                        const raw = Buffer.from(part.body.data, 'base64').toString('utf-8')
                        if (raw.includes('<div') || raw.includes('<body') || raw.includes('<p>')) {
                            htmlBody = raw
                            body = raw.replace(/<[^>]*>?/gm, '')
                        } else {
                            body = raw
                        }
                    }
                }
            }

            messages.push({
                id: message.id!,
                threadId: msgDetail.data.threadId!,
                from,
                to,
                subject,
                body,
                htmlBody,
                receivedAt: date
            })
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`[Gmail Sync] Error fetching message ${message.id}:`, error.message)
            continue
        }
    }

    return messages
}

/**
 * RFC 2047 Base64-encode a header value that may contain non-ASCII characters.
 * Email clients require this encoding for subjects/names with emojis or Turkish chars.
 */
function mimeEncodeHeader(value: string): string {
    if (/^[\x00-\x7F]*$/.test(value)) return value // pure ASCII — no encoding needed
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

/**
 * Send email via Gmail
 * Supports both plain text and HTML content
 */
export async function sendGmailMessage(
    integrationId: string,
    to: string,
    subject: string,
    body: string,
    threadId?: string,
    supabaseClient?: SupabaseClient<Database>,
    htmlBody?: string
) {
    const oauth2Client = await getGmailClient(integrationId, supabaseClient)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Build a proper MIME message with UTF-8 headers so Turkish chars / emojis
    // render correctly in all email clients.
    let lines: string[]

    if (htmlBody) {
        // Multipart/alternative message with both plain text and HTML
        const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, '')}`
        const plainTextBase64 = Buffer.from(body, 'utf8').toString('base64')
        const htmlBase64 = Buffer.from(htmlBody, 'utf8').toString('base64')

        lines = [
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            `To: ${to}`,
            `Subject: ${mimeEncodeHeader(subject)}`,
            threadId ? `In-Reply-To: ${threadId}` : null,
            threadId ? `References: ${threadId}` : null,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            plainTextBase64,
            `--${boundary}`,
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            htmlBase64,
            `--${boundary}--`
        ].filter((l): l is string => l !== null)
    } else {
        // Plain text only (original behavior)
        lines = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            `To: ${to}`,
            `Subject: ${mimeEncodeHeader(subject)}`,
            threadId ? `In-Reply-To: ${threadId}` : null,
            threadId ? `References: ${threadId}` : null,
            '',
            // Body is base64-encoded separately as part of content-transfer-encoding
            Buffer.from(body, 'utf8').toString('base64')
        ].filter((l): l is string => l !== null)
    }

    const encodedMessage = Buffer.from(lines.join('\r\n'), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
            threadId
        }
    })

    return { success: true, messageId: response.data.id, threadId: response.data.threadId }
}

/**
 * Process incoming Gmail messages and create leads/conversations
 */
export async function processGmailInbox(integrationId: string) {
    const supabase = createAdminClient()
    const messages = await fetchGmailMessages(integrationId)

    let processed = 0

    // Bolt Optimization: Move integration query outside the loop to prevent N+1 queries.
    // Fetch account_id and config (to get the Gmail email address) from integration once.
    const { data: rawIntegration } = await supabase
        .from('integrations')
        .select('account_id, config')
        .eq('id', integrationId)
        .single();

    const integration = rawIntegration;

    if (!integration?.account_id) return { processed: 0 };

    const integrationEmail = (integration.config as unknown as GmailConfig)?.email ?? null;

    // Batch-fetch all active enrollments for this account upfront to avoid N+1
    const { data: allEnrollments } = await supabase
        .from('sequence_enrollments')
        .select('id, sequence_id, account_id, lead_id, current_step_index')
        .eq('account_id', integration.account_id)
        .eq('status', 'active');

    const enrollmentByLead = new Map<string, typeof allEnrollments extends (infer T)[] | null ? T : never>();
    for (const enrollment of allEnrollments ?? []) {
        enrollmentByLead.set(enrollment.lead_id, enrollment);
    }

    for (const msg of messages) {
        // Extract email from "Name <email@domain.com>" format
        const emailMatch = msg.from.match(/<(.+?)>/)
        const email = (emailMatch ? emailMatch[1] : msg.from).toLowerCase().trim()

        // 1. Find or create lead
        let leadId: string | null = null
        const { data: rawLead } = await supabase
            .from('leads')
            .select('id')
            .eq('account_id', integration.account_id)
            .eq('email', email)
            .maybeSingle();
        
        const existingLead = rawLead;

        if (existingLead) {
            leadId = existingLead.id
        } else {
            // Create new lead
            const nameParts = msg.from.replace(/<.+>/, '').trim().split(' ')
            const { data: rawNewLead, error: leadError } = await supabase
                .from('leads')
                .insert({
                    account_id: integration.account_id,
                    first_name: nameParts[0] || 'Gmail',
                    last_name: nameParts.slice(1).join(' ') || 'User',
                    email,
                    source: 'gmail',
                    status: 'new',
                    metadata: integrationEmail ? { source_email: integrationEmail } : {}
                })
                .select('id')
                .single();
            
            const newLead = rawNewLead as Record<string, any>;
            
            if (leadError) {
                console.error('Error creating lead from Gmail:', leadError)
                continue
            }
            leadId = newLead?.id
        }

        if (leadId) {
            // 2. Create or find active conversation
            const { data: rawConv } = await supabase
                .from('conversations')
                .select('id, integration_id')
                .eq('lead_id', leadId)
                .eq('account_id', integration.account_id)
                .eq('status', 'active')
                .maybeSingle();

            const existingConv = rawConv;
            let conversationId = existingConv?.id;

            // Backfill integration_id if missing on existing conversation
            if (conversationId && !existingConv?.integration_id) {
                await supabase
                    .from('conversations')
                    .update({ integration_id: integrationId })
                    .eq('id', conversationId)
            }

            if (!conversationId) {
                const { data: rawNewConv, error: _convError } = await supabase
                    .from('conversations')
                    .insert({
                        account_id: integration.account_id,
                        lead_id: leadId,
                        status: 'active',
                        channel: 'email',
                        integration_id: integrationId,
                        last_message_at: new Date().toISOString()
                    })
                    .select('id')
                    .single();
                
                const newConv = rawNewConv;
                conversationId = newConv?.id;
            }

            if (conversationId) {
                // 3. Check if this specific email message was already processed using its unique Gmail ID
                const { data: rawExistingMsg } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('conversation_id', conversationId)
                    .contains('metadata', { gmail_message_id: msg.id })
                    .maybeSingle();
                
                const existingMsg = rawExistingMsg;
                if (!existingMsg) {
                    // Use processMessage from AI service to handle storage and auto-response
                    const { processMessage } = await import('@/features/conversations/services/message-processor');
                    const aiResult = await processMessage(
                        conversationId,
                        msg.body || msg.subject || '(no content)',
                        {
                            externalMessageId: msg.id,
                            provider: 'gmail',
                            channel: 'email',
                            threadId: msg.threadId,
                            subject: msg.subject || undefined,
                            html_body: msg.htmlBody || undefined,
                        }
                    );


                    if (aiResult.success) {
                        processed++
                        
                        // Track Sequence Reply — use pre-fetched enrollment map (no extra DB query)
                        const enrollment = enrollmentByLead.get(leadId) ?? null;

                        if (enrollment) {
                            // Log replied event
                            await supabase.from('sequence_events').insert({
                                account_id: enrollment.account_id,
                                sequence_id: enrollment.sequence_id,
                                lead_id: enrollment.lead_id,
                                event_type: 'replied',
                                channel: 'email',
                                metadata: {
                                    enrollment_id: enrollment.id,
                                    step_index: enrollment.current_step_index
                                }
                            });

                            // Stop the sequence by completing the enrollment
                            await supabase
                                .from('sequence_enrollments')
                                .update({ status: 'completed', updated_at: new Date().toISOString() })
                                .eq('id', enrollment.id);
                        }
                    }
                }
            }
        }
    }

    // 4. Update last_pulled_at to ensure next poll picks up from now
    const { data: currentIntegration } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', integrationId)
        .single()
    
    if (currentIntegration) {
        const newConfig: GmailConfig = { 
            ...(currentIntegration.config as unknown as GmailConfig || {}), 
            last_pulled_at: Math.floor(Date.now() / 1000) 
        }
        await supabase
            .from('integrations')
            .update({ config: newConfig as any })
            .eq('id', integrationId)
    }

    return { processed }
}
