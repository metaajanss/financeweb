import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { ValidationError } from '../errors/AppError'

export type WebhookProvider = 'twilio' | 'paddle' | 'meta' | 'svix' | 'crm'

/**
 * Verify webhook signatures from various providers
 *
 * Supported:
 * - Twilio: X-Twilio-Signature (HMAC-SHA1 via Twilio SDK)
 * - Paddle: X-Paddle-Signature (HMAC-SHA256, ts:body format)
 * - Meta: X-Hub-Signature-256 (HMAC-SHA256)
 * - Svix: Svix-Signature (via Svix SDK)
 * - CRM: X-Signature (generic HMAC-SHA256)
 */
export async function verifyWebhookSignature(
  provider: WebhookProvider,
  request: NextRequest,
  body: Buffer | string
): Promise<boolean> {
  switch (provider) {
    case 'twilio':
      return verifyTwilioSignature(request, body)
    case 'paddle':
      return verifyPaddleSignature(request, body)
    case 'meta':
      return verifyMetaSignature(request, body)
    case 'svix':
      return verifySvixSignature(request, body)
    case 'crm':
      return verifyCrmSignature(request, body)
    default:
      throw new ValidationError(`Unknown webhook provider: ${provider}`)
  }
}

/**
 * Verify Twilio webhook signature
 * Uses HMAC-SHA1 via Twilio SDK validateRequestWithBody for JSON payloads
 */
async function verifyTwilioSignature(request: NextRequest, body: Buffer | string): Promise<boolean> {
  const signature = request.headers.get('x-twilio-signature')
  if (!signature) throw new ValidationError('Missing X-Twilio-Signature header')

  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) throw new Error('TWILIO_AUTH_TOKEN not configured')

  const url = request.url

  try {
    const { validateRequestWithBody } = await import('twilio/lib/webhooks/webhooks')
    const rawBody = typeof body === 'string' ? body : body.toString('utf-8')
    return validateRequestWithBody(authToken, signature, url, rawBody)
  } catch {
    return false
  }
}

/**
 * Verify Paddle webhook signature
 * Header format: ts=TIMESTAMP;h1=HMAC_SHA256_HEX
 * Signed payload: "ts:rawBody"
 */
function verifyPaddleSignature(request: NextRequest, body: Buffer | string): boolean {
  const signatureHeader = request.headers.get('x-paddle-signature')
  if (!signatureHeader) throw new ValidationError('Missing X-Paddle-Signature header')

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('PADDLE_WEBHOOK_SECRET not configured')

  const parts = Object.fromEntries(
    signatureHeader.split(';').map(part => part.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']

  if (!ts || !h1) throw new ValidationError('Malformed X-Paddle-Signature header')

  const rawBody = typeof body === 'string' ? body : body.toString('utf-8')
  const signedPayload = `${ts}:${rawBody}`

  const expectedHmac = createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex')

  return timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(h1))
}

/**
 * Verify Meta (Facebook/WhatsApp) webhook signature
 * Header format: sha256=HMAC_SHA256_HEX
 * Uses META_APP_SECRET (App Secret, not Verify Token)
 */
function verifyMetaSignature(request: NextRequest, body: Buffer | string): boolean {
  const signatureHeader = request.headers.get('x-hub-signature-256')
  if (!signatureHeader) throw new ValidationError('Missing X-Hub-Signature-256 header')

  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) throw new Error('META_APP_SECRET not configured')

  if (!signatureHeader.startsWith('sha256=')) {
    throw new ValidationError('Malformed X-Hub-Signature-256 header')
  }

  const receivedHash = signatureHeader.slice('sha256='.length)
  const rawBody = typeof body === 'string' ? body : body.toString('utf-8')

  const expectedHash = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash))
  } catch {
    return false
  }
}

/**
 * Verify Svix webhook signature
 * Uses Svix SDK which validates svix-id, svix-timestamp, svix-signature headers
 */
async function verifySvixSignature(request: NextRequest, body: Buffer | string): Promise<boolean> {
  const webhookSecret = process.env.SVIX_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('SVIX_WEBHOOK_SECRET not configured')

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new ValidationError('Missing Svix headers (svix-id, svix-timestamp, svix-signature)')
  }

  try {
    const { Webhook } = await import('svix')
    const wh = new Webhook(webhookSecret)
    const rawBody = typeof body === 'string' ? body : body.toString('utf-8')
    wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Verify CRM webhook signature
 * Generic HMAC-SHA256 using X-Signature header
 */
function verifyCrmSignature(request: NextRequest, body: Buffer | string): boolean {
  const signature = request.headers.get('x-signature')
  if (!signature) throw new ValidationError('Missing X-Signature header')

  const webhookSecret = process.env.CRM_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('CRM_WEBHOOK_SECRET not configured')

  const rawBody = typeof body === 'string' ? body : body.toString('utf-8')

  const expectedHash = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(signature))
  } catch {
    return false
  }
}
