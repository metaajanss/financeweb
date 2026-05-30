import crypto from 'crypto'
import { createAdminClient } from '@/core/db/admin'
import { createClient } from '@/core/db/server'
import type { Database, FormConfig, MetaConfig, WhatsAppConfig } from '@/shared/types'

type IntegrationRow = Database['public']['Tables']['integrations']['Row']
type WebhookRow = Database['public']['Tables']['webhooks']['Row']

export interface WebhookPayload {
  event: string
  timestamp: string
  data: unknown
  account_id: string
}

export function verifyHmacSignature(args: {
  payload: string
  secret: string
  signature: string
  prefix?: string
}) {
  const normalized = args.prefix && args.signature.startsWith(args.prefix)
    ? args.signature.slice(args.prefix.length)
    : args.signature

  const expected = crypto
    .createHmac('sha256', args.secret)
    .update(args.payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(normalized)
  )
}

export function verifyTimedSignature(args: {
  payload: string
  secret: string
  signature: string
  timestamp: string
  maxAgeSeconds?: number
}) {
  const maxAgeSeconds = args.maxAgeSeconds ?? 300
  const timestampMs = Number(args.timestamp) * 1000
  if (!Number.isFinite(timestampMs)) return false

  if (Math.abs(Date.now() - timestampMs) > maxAgeSeconds * 1000) {
    return false
  }

  const signedPayload = `${args.timestamp}.${args.payload}`
  return verifyHmacSignature({
    payload: signedPayload,
    secret: args.secret,
    signature: args.signature,
  })
}

async function getConnectedIntegrations(provider: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('provider', provider)
    .eq('status', 'connected')

  if (error) {
    throw error
  }

  return (data ?? []) as IntegrationRow[]
}

export async function resolveMetaIntegration({
  pageId,
  phoneNumberId,
}: {
  pageId?: string | null
  phoneNumberId?: string | null
}) {
  if (!pageId && !phoneNumberId) return null

  const supabase = createAdminClient()
  let query = supabase
    .from('integrations')
    .select('*')
    .in('provider', ['meta', 'whatsapp'])
    .eq('status', 'connected')

  const orConditions: string[] = []
  if (phoneNumberId) {
    orConditions.push(`config->>phone_number_id.eq.${phoneNumberId}`)
  }
  if (pageId) {
    orConditions.push(`config->>page_id.eq.${pageId}`)
  }

  if (orConditions.length > 0) {
    query = query.or(orConditions.join(','))
  }

  const { data, error } = await query
  let integrations = data

  if (error || !integrations || integrations.length === 0) {
    // Fallback: fetch all and filter in memory
    integrations = [
      ...(await getConnectedIntegrations('meta')),
      ...(await getConnectedIntegrations('whatsapp')),
    ]
  }

  return (integrations as IntegrationRow[]).find((integration) => {
    const config = integration.config as MetaConfig | WhatsAppConfig | null
    return (
      (pageId && config && 'page_id' in config && config.page_id === pageId) ||
      (phoneNumberId && config?.phone_number_id === phoneNumberId)
    )
  }) ?? null
}

export async function resolveFormIntegration(integrationId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('provider', 'form')
    .eq('status', 'connected')
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as IntegrationRow | null) ?? null
}

export async function verifyFormSignature(args: {
  integrationId: string
  payload: string
  signature: string | null
  timestamp: string | null
}) {
  if (!args.signature || !args.timestamp) return null

  const integration = await resolveFormIntegration(args.integrationId)
  if (!integration) return null

  const config = integration.config as FormConfig | null
  if (!config?.signing_secret) return null

  const valid = verifyTimedSignature({
    payload: args.payload,
    secret: config.signing_secret,
    signature: args.signature,
    timestamp: args.timestamp,
  })

  return valid ? integration : null
}

export async function resolveTwilioIntegration(to: string) {
  const cleanTo = to.replace(/[^0-9]/g, '')
  if (!cleanTo) return null

  const supabase = createAdminClient()
  
  // Try to find by direct JSONB matching first (highly optimized)
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('provider', 'twilio')
    .eq('status', 'connected')
    .or(`config->>from.ilike.%${cleanTo}%,config->>from.eq.${to}`)

  let integrations = data

  if (error || !integrations || integrations.length === 0) {
    // Fallback: fetch all connected twilio integrations
    integrations = await getConnectedIntegrations('twilio')
  }

  return (integrations as IntegrationRow[]).find((integration) => {
    const config = integration.config as { from?: string } | null
    if (!config?.from) return false

    // Normalize both for comparison (remove 'whatsapp:+')
    const cleanConfigFrom = config.from.replace(/[^0-9]/g, '')

    return cleanTo === cleanConfigFrom
  }) ?? null
}

export async function triggerWebhook(accountId: string, event: string, data: unknown) {
  const supabase = await createClient()

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret, events, status')
    .eq('account_id', accountId)
    .eq('status', 'active')

  if (error || !webhooks?.length) return

  const activeWebhooks = (webhooks as WebhookRow[]).filter(
    (wh) => wh.events.includes(event) || wh.events.includes('*')
  )

  if (!activeWebhooks.length) return

  const timestamp = new Date().toISOString()

  await Promise.allSettled(
    activeWebhooks.map(async (webhook) => {
      const payload: WebhookPayload = { event, timestamp, data, account_id: accountId }

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhook.secret ?? '',
            'X-Event-Type': event,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        })

        await response.text()
      } catch {
        // Silently fail webhook delivery - should be logged elsewhere
      }
    })
  )
}
