import { createAdminClient } from '@/core/db/admin'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/shared/types'
import { sendGmailMessage, getPrimaryEmailIntegration } from '@/features/integrations/providers/messaging/gmail'
import { sendSmtpMessage } from '@/features/integrations/providers/messaging/smtp'
import { fetchWithRetry } from '@/core/http/fetch'

/**
 * Channel Adapter Interface
 * Provides unified interface for sending messages across different channels
 */

export type ChannelType = 'email' | 'whatsapp' | 'sms'

export interface ChannelAdapter {
    send(to: string, message: string, metadata?: Record<string, unknown> | undefined): Promise<{ success: boolean; error?: string }>
}

/**
 * Email Channel Adapter (via Gmail)
 */
export class EmailChannelAdapter implements ChannelAdapter {
    constructor(private integrationId: string, private supabaseClient?: SupabaseClient<Database>) { }

    async send(to: string, message: string, metadata?: { subject?: string; threadId?: string; htmlBody?: string }) {
        try {
            const subject = metadata?.subject || 'Message from Jumpix'
            const result = await sendGmailMessage(
                this.integrationId,
                to,
                subject,
                message,
                metadata?.threadId,
                this.supabaseClient,
                metadata?.htmlBody
            )
            return { success: true, messageId: result.messageId ?? undefined, threadId: result.threadId ?? undefined }
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }
}

/**
 * SMTP Channel Adapter
 */
export class SmtpChannelAdapter implements ChannelAdapter {
    constructor(private integrationId: string, private supabaseClient?: SupabaseClient<Database>) { }

    async send(to: string, message: string, metadata?: { subject?: string; threadId?: string; htmlBody?: string }) {
        try {
            const subject = metadata?.subject || 'Message from Jumpix'
            const result = await sendSmtpMessage(
                this.integrationId,
                to,
                subject,
                message,
                metadata?.threadId,
                this.supabaseClient,
                metadata?.htmlBody
            )
            return { success: true, messageId: result.messageId ?? undefined, threadId: result.threadId ?? undefined }
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }
}

/**
 * Normalizes phone numbers to E.164 for WhatsApp delivery
 */
function normalizePhoneForWhatsApp(phone: string): string {
    let normalized = phone.replace(/[^0-9]/g, '');
    if (normalized.startsWith('00')) {
        normalized = normalized.substring(2);
    }
    if (normalized.startsWith('0') && normalized.length === 11) {
        normalized = '90' + normalized.substring(1);
    } else if (normalized.startsWith('5') && normalized.length === 10) {
        normalized = '90' + normalized;
    }
    return normalized;
}

/**
 * WhatsApp Channel Adapter (via Meta Cloud API)
 */
export class WhatsAppChannelAdapter implements ChannelAdapter {
    constructor(private phoneNumberId: string, private accessToken: string) { }

    async send(to: string, message: string) {
        try {
            const cleanPhone = normalizePhoneForWhatsApp(to)
            const response = await fetchWithRetry(
                `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeoutMs: 10000,
                    retries: 1,
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'text',
                        text: { body: message }
                    })
                }
            )

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.error?.message || 'WhatsApp send failed' }
            }

            return { success: true }
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }
}

/**
 * Twilio Channel Adapter (WhatsApp)
 */
export class TwilioChannelAdapter implements ChannelAdapter {
    constructor(private accountSid: string, private authToken: string, private from: string) { }

    async send(to: string, message: string) {
        try {
            const twilio = (await import('twilio')).default
            const client = twilio(this.accountSid, this.authToken)
            
            // Format for Twilio WhatsApp (+ or whatsapp: prefix)
            const cleanPhone = normalizePhoneForWhatsApp(to)
            const toFormatted = `whatsapp:+${cleanPhone}`
            const fromFormatted = this.from.startsWith('whatsapp:') ? this.from : `whatsapp:${this.from}`

            await client.messages.create({
                body: message,
                from: fromFormatted,
                to: toFormatted
            })

            return { success: true }
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }
}

/**
 * SMS Channel Adapter (placeholder - not in MVP scope)
 */
export class SMSChannelAdapter implements ChannelAdapter {
    async send(_to: string, _message: string) {
        // SMS is out of scope for MVP
        return { success: false, error: 'SMS not supported in MVP' }
    }
}

/**
 * Channel Router - selects appropriate channel based on lead data.
 *
 * Email selection priority:
 * 1. preferredIntegrationId  — explicitly provided (from conversation, enrollment, or step)
 * 2. lead.preferred_integration_id — lead-level assignment
 * 3. getPrimaryEmailIntegration()  — workspace primary Email (Gmail or SMTP)
 * 4. First connected Email          — last fallback
 */
export async function sendViaChannel(
    leadId: string,
    message: string,
    preferredChannel?: ChannelType,
    supabaseClient?: SupabaseClient<Database>,
    metadata?: { subject?: string; threadId?: string; htmlBody?: string },
    preferredIntegrationId?: string
): Promise<{ success: boolean; error?: string; channel?: ChannelType; messageId?: string; threadId?: string }> {
    const supabase = supabaseClient || createAdminClient()

    // Get lead details including preferred_integration_id
    const { data: lead } = await supabase
        .from('leads')
        .select('email, phone, account_id, preferred_integration_id')
        .eq('id', leadId)
        .single()

    if (!lead) {
        return { success: false, error: 'Lead not found' }
    }

    // Get integrations for this account
    const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('account_id', lead.account_id)
        .eq('status', 'connected')

    if (!integrations || integrations.length === 0) {
        return { success: false, error: 'No integrations configured' }
    }

    // Try WhatsApp first if phone available and not explicitly preferring email
    if (lead.phone && preferredChannel !== 'email') {
        const whatsappIntegration = integrations.find(i => i.provider === 'whatsapp')
        const whatsappConfig = whatsappIntegration?.config as unknown as { phone_number_id?: string; access_token?: string } | undefined
        if (whatsappConfig?.phone_number_id && whatsappConfig?.access_token) {
            const adapter = new WhatsAppChannelAdapter(
                whatsappConfig.phone_number_id,
                whatsappConfig.access_token
            )
            const result = await adapter.send(lead.phone!, message)
            if (result.success) return { ...result, channel: 'whatsapp' as const }
        }

        // Fallback to Twilio if WhatsApp Meta is not available
        const twilioIntegration = integrations.find(i => i.provider === 'twilio')
        const twilioConfig = twilioIntegration?.config as unknown as { from?: string } | undefined

        const sid = process.env.TWILIO_ACCOUNT_SID
        const token = process.env.TWILIO_AUTH_TOKEN
        const from = twilioConfig?.from

        if (sid && token && from) {
            const adapter = new TwilioChannelAdapter(sid, token, from)
            const result = await adapter.send(lead.phone!, message)
            if (result.success) return { ...result, channel: 'whatsapp' as const }
        }
    }

    // Resolve Email account using priority chain
    if (lead.email) {
        let emailId: string | null = null
        let emailProvider: string | null = null

        // 1. Explicitly provided (from conversation.integration_id or enrollment.integration_id)
        if (preferredIntegrationId) {
            const match = integrations.find(i => i.id === preferredIntegrationId && (i.provider === 'gmail' || i.provider === 'email'))
            if (match) {
                emailId = match.id
                emailProvider = match.provider
            }
        }

        // 2. Lead-level preferred integration
        if (!emailId && lead.preferred_integration_id) {
            const match = integrations.find(i => i.id === lead.preferred_integration_id && (i.provider === 'gmail' || i.provider === 'email'))
            if (match) {
                emailId = match.id
                emailProvider = match.provider
            }
        }

        // 3. Workspace primary Email
        if (!emailId) {
            const primary = await getPrimaryEmailIntegration(lead.account_id, supabase)
            if (primary) {
                emailId = primary.id
                emailProvider = primary.provider
            }
        }

        // 4. First connected Email (last resort)
        if (!emailId) {
            const first = integrations.find(i => i.provider === 'gmail' || i.provider === 'email')
            if (first) {
                emailId = first.id
                emailProvider = first.provider
            }
        }

        if (emailId && emailProvider) {
            const adapter = emailProvider === 'email' ? new SmtpChannelAdapter(emailId, supabase) : new EmailChannelAdapter(emailId, supabase)
            const result = await adapter.send(lead.email, message, metadata)
            return { ...result, channel: 'email' as const }
        }
    }

    return { success: false, error: 'No available channel for this lead' }
}
