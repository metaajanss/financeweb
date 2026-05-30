import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/shared/types'
import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import dns from 'dns'
import { promisify } from 'util'

const lookup = promisify(dns.lookup)

export type SmtpMessage = {
    id: string
    threadId: string
    from: string
    to: string
    subject: string
    body: string
    receivedAt: string
}

export type SmtpConfig = {
    smtp_host: string
    smtp_port: number
    smtp_secure: boolean
    smtp_user: string
    smtp_password: string
    imap_host: string
    imap_port: number
    imap_secure: boolean
    imap_user: string
    imap_password: string
    email: string
    from_name?: string
    last_pulled_at?: number
}

async function checkSSRF(hostname: string) {
    // Block obviously private/loopback hostnames without DNS lookup
    if (
        hostname === 'localhost' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('127.') ||
        hostname === '::1' ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
        return false
    }

    try {
        const { address } = await lookup(hostname)
        if (
            address.startsWith('10.') ||
            address.startsWith('192.168.') ||
            address.startsWith('127.') ||
            address === '::1' ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address)
        ) {
            return false
        }
        return true
    } catch {
        // DNS lookup failed — allow through and let the actual SMTP/IMAP
        // connection fail with a meaningful error instead of a misleading SSRF message
        return true
    }
}

export async function getSmtpTransport(integrationId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || createAdminClient()
    const { data: integration } = await supabase.from('integrations').select('config').eq('id', integrationId).single()
    const config = (integration?.config as unknown as SmtpConfig) || {} as SmtpConfig

    if (!config?.smtp_host) throw new Error('SMTP not configured')

    return nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_password
        }
    })
}

export async function testSmtpConnection(params: SmtpConfig) {
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, imap_host, imap_port, imap_secure, imap_user, imap_password } = params

    if (!(await checkSSRF(smtp_host))) return { smtp: false, imap: false, error: 'Invalid SMTP host (SSRF Protection)' }
    if (!(await checkSSRF(imap_host))) return { smtp: false, imap: false, error: 'Invalid IMAP host (SSRF Protection)' }

    let smtpSuccess = false
    let imapSuccess = false
    let errorMsg = ''

    try {
        const transport = nodemailer.createTransport({
            host: smtp_host,
            port: smtp_port,
            secure: smtp_secure,
            auth: { user: smtp_user, pass: smtp_password }
        })
        await transport.verify()
        smtpSuccess = true
    } catch (e: unknown) {
        errorMsg += `SMTP Error: ${e instanceof Error ? e.message : String(e)}. `
    }

    try {
        const client = new ImapFlow({
            host: imap_host,
            port: imap_port,
            secure: imap_secure,
            auth: { user: imap_user, pass: imap_password },
            logger: false
        })
        await client.connect()
        await client.logout()
        imapSuccess = true
    } catch (e: unknown) {
        errorMsg += `IMAP Error: ${e instanceof Error ? e.message : String(e)}. `
    }

    return { smtp: smtpSuccess, imap: imapSuccess, error: errorMsg ? errorMsg.trim() : undefined }
}

export async function connectSmtpAccount(params: SmtpConfig & { label?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', user.id).single()
    if (!profile?.account_id) return { error: 'No account found' }

    const accountId = profile.account_id

    const testResult = await testSmtpConnection(params)
    if (!testResult.smtp || !testResult.imap) {
        return { error: testResult.error || 'Connection test failed' }
    }

    const email = params.email.toLowerCase().trim()

    const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('account_id', accountId)
        .eq('provider', 'email')
        .eq('status', 'connected')
        .filter('config->>email', 'eq', email)
        .maybeSingle()

    if (existing) return { error: 'email_already_connected', email }

    const { data: existingEmails } = await supabase
        .from('integrations')
        .select('id')
        .eq('account_id', accountId)
        .in('provider', ['email', 'gmail'])
        .eq('status', 'connected')

    const isPrimary = !existingEmails || existingEmails.length === 0

    const { data, error } = await supabase.from('integrations').insert({
        account_id: accountId,
        provider: 'email',
        status: 'connected',
        is_primary: isPrimary,
        label: params.label || email,
        config: {
            ...params,
            provider: 'email',
            email
        }
    }).select('id').single()

    if (error) return { error: error.message }
    return { success: true, integrationId: data.id }
}

export async function sendSmtpMessage(
    integrationId: string,
    to: string,
    subject: string,
    body: string,
    threadId?: string,
    supabaseClient?: SupabaseClient<Database>,
    htmlBody?: string
) {
    const supabase = supabaseClient || createAdminClient()
    const { data: integration } = await supabase.from('integrations').select('config').eq('id', integrationId).single()
    const config = (integration?.config as unknown as SmtpConfig) || {} as SmtpConfig

    if (!config?.smtp_host) throw new Error('SMTP not configured')

    const transport = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: { user: config.smtp_user, pass: config.smtp_password }
    })

    const fromAddress = config.from_name ? `"${config.from_name}" <${config.email}>` : config.email

    const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to,
        subject,
        text: body
    }

    if (htmlBody) mailOptions.html = htmlBody
    if (threadId) {
        mailOptions.inReplyTo = threadId
        mailOptions.references = threadId
    }

    const info = await transport.sendMail(mailOptions)
    return { success: true, messageId: info.messageId, threadId: threadId || info.messageId }
}

export async function fetchSmtpInboxMessages(integrationId: string): Promise<SmtpMessage[]> {
    const supabase = createAdminClient()
    const { data: integration } = await supabase.from('integrations').select('config').eq('id', integrationId).single()
    const config = (integration?.config || {}) as unknown as SmtpConfig

    const client = new ImapFlow({
        host: config.imap_host,
        port: config.imap_port,
        secure: config.imap_secure,
        auth: { user: config.imap_user, pass: config.imap_password },
        logger: false
    })

    const messages: SmtpMessage[] = []
    
    try {
        await client.connect()
        const lock = await client.getMailboxLock('INBOX')
        
        try {
            const searchCriteria: { since?: Date } = {}
            if (config.last_pulled_at) {
                searchCriteria.since = new Date(config.last_pulled_at * 1000)
            } else {
                const oneDayAgo = new Date()
                oneDayAgo.setDate(oneDayAgo.getDate() - 1)
                searchCriteria.since = oneDayAgo
            }

            for await (const msg of client.fetch(searchCriteria, { source: true, envelope: true, bodyStructure: true, headers: ['subject', 'date', 'from', 'to', 'message-id', 'in-reply-to', 'references', 'auto-submitted', 'precedence', 'x-auto-response-suppress'] })) {
                // Parse headers and check for automated emails similar to Gmail implementation
                const headers = msg.headers ? Object.fromEntries(msg.headers.entries()) : {}
                
                const from = msg.envelope?.from?.[0] ? `${msg.envelope.from[0].name ? msg.envelope.from[0].name + ' ' : ''}<${msg.envelope.from[0].address}>` : ''
                const to = msg.envelope?.to?.[0] ? msg.envelope.to[0].address : ''
                const subject = msg.envelope?.subject || ''
                const date = msg.envelope?.date?.toISOString() || new Date().toISOString()
                const messageId = msg.envelope?.messageId || ''
                const threadId = msg.envelope?.inReplyTo || messageId

                const autoSubmitted = String(headers['auto-submitted'] || '')
                const precedence = String(headers['precedence'] || '')
                const xAutoResponse = String(headers['x-auto-response-suppress'] || '')

                const isAutomatedEmail = 
                    (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
                    (precedence && (precedence.toLowerCase() === 'bulk' || precedence.toLowerCase() === 'junk' || precedence.toLowerCase() === 'list')) ||
                    (xAutoResponse && xAutoResponse.toLowerCase() !== 'none') ||
                    subject.toLowerCase().includes('delivery status notification') ||
                    subject.toLowerCase().includes('mailer-daemon') ||
                    subject.toLowerCase().includes('mail delivery subsystem') ||
                    subject.toLowerCase().includes('undelivered mail') ||
                    subject.toLowerCase().includes('mail delivery failed') ||
                    subject.toLowerCase().includes('automatic reply') ||
                    subject.toLowerCase().includes('out of office') ||
                    from.toLowerCase().includes('mailer-daemon') ||
                    from.toLowerCase().includes('postmaster') ||
                    from.toLowerCase().includes('mail delivery subsystem') ||
                    from.toLowerCase().includes('microsoft outlook')

                if (isAutomatedEmail) continue

                let body = ''
                if (msg.source) {
                    const sourceStr = msg.source.toString('utf-8')
                    // Strip headers (everything before the first blank line)
                    const bodyStart = sourceStr.indexOf('\r\n\r\n')
                    const rawBody = bodyStart !== -1 ? sourceStr.slice(bodyStart + 4) : sourceStr
                    // Remove quoted-printable soft line breaks and decode basic entities
                    const decoded = rawBody.replace(/=\r\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                    // Strip HTML tags if present
                    body = decoded.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
                }

                messages.push({
                    id: messageId,
                    threadId,
                    from,
                    to: to || '',
                    subject,
                    body,
                    receivedAt: date
                })
            }
        } finally {
            lock.release()
        }
        await client.logout()
    } catch (e: unknown) {
        console.error('IMAP Fetch Error:', e instanceof Error ? e.message : String(e))
    }

    return messages
}

export async function processSmtpInbox(integrationId: string) {
    const supabase = createAdminClient()
    const messages = await fetchSmtpInboxMessages(integrationId)

    let processed = 0

    const { data: rawIntegration } = await supabase
        .from('integrations')
        .select('account_id')
        .eq('id', integrationId)
        .single();

    const integration = rawIntegration as { account_id: string } | null;

    if (!integration?.account_id) return { processed: 0 };

    for (const msg of messages) {
        const emailMatch = msg.from.match(/<(.+?)>/)
        const email = (emailMatch ? emailMatch[1] : msg.from).toLowerCase().trim()

        let leadId: string | null = null
        const { data: existingLead } = await supabase.from('leads').select('id').eq('account_id', integration.account_id).eq('email', email).maybeSingle()

        if (existingLead) {
            leadId = existingLead.id
        } else {
            const nameParts = msg.from.replace(/<.+>/, '').trim().split(' ')
            const { data: newLead, error: leadError } = await supabase.from('leads').insert({
                account_id: integration.account_id,
                first_name: nameParts[0] || 'Email',
                last_name: nameParts.slice(1).join(' ') || 'User',
                email,
                source: 'email',
                status: 'new'
            }).select('id').single()
            if (!leadError) leadId = newLead.id
        }

        if (leadId) {
            const { data: existingConv } = await supabase.from('conversations').select('id, integration_id').eq('lead_id', leadId).eq('account_id', integration.account_id).eq('status', 'active').maybeSingle()
            let conversationId = existingConv?.id

            if (conversationId && !existingConv?.integration_id) {
                await supabase.from('conversations').update({ integration_id: integrationId }).eq('id', conversationId)
            }

            if (!conversationId) {
                const { data: newConv } = await supabase.from('conversations').insert({
                    account_id: integration.account_id,
                    lead_id: leadId,
                    status: 'active',
                    channel: 'email',
                    integration_id: integrationId,
                    last_message_at: new Date().toISOString()
                }).select('id').single()
                conversationId = newConv?.id
            }

            if (conversationId) {
                const { data: existingMsg } = await supabase.from('messages').select('id').eq('conversation_id', conversationId).contains('metadata', { external_message_id: msg.id }).maybeSingle()
                
                if (!existingMsg) {
                    const { processMessage } = await import('@/features/conversations/services/message-processor')
                    const aiResult = await processMessage(
                        conversationId,
                        msg.body || msg.subject || '(no content)',
                        {
                            externalMessageId: msg.id,
                            provider: 'email',
                            channel: 'email',
                            threadId: msg.threadId,
                            subject: msg.subject
                        }
                    )

                    if (aiResult.success) {
                        processed++
                        const { data: enrollment } = await supabase.from('sequence_enrollments').select('id, sequence_id, account_id, lead_id, current_step_index').eq('account_id', integration.account_id).eq('lead_id', leadId).eq('status', 'active').maybeSingle()
                        if (enrollment) {
                            await supabase.from('sequence_events').insert({
                                account_id: enrollment.account_id,
                                sequence_id: enrollment.sequence_id,
                                lead_id: enrollment.lead_id,
                                event_type: 'replied',
                                channel: 'email',
                                metadata: { enrollment_id: enrollment.id, step_index: enrollment.current_step_index }
                            })

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

    const { data: currentIntegration } = await supabase.from('integrations').select('config').eq('id', integrationId).single()
    
    if (currentIntegration) {
        const newConfig = { ...((currentIntegration.config as unknown as SmtpConfig) || {}), last_pulled_at: Math.floor(Date.now() / 1000) }
        await supabase.from('integrations').update({ config: newConfig }).eq('id', integrationId)
    }

    return { processed }
}
