import { createAdminClient } from '@/core/db/admin'

type OperationalResult = 'success' | 'failure' | 'duplicate' | 'ignored'

type OperationalEventInput = {
  provider?: string
  accountId?: string | null
  integrationId?: string | null
  externalEventId?: string | null
  result: OperationalResult
  eventType: string
  entityType: string
  entityId?: string | null
  data?: Record<string, unknown>
}

type OperationalErrorInput = {
  provider?: string
  accountId?: string | null
  integrationId?: string | null
  externalEventId?: string | null
  message: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

export async function logOperationalEvent(input: OperationalEventInput) {
  try {
    if (!input.accountId) return

    const supabase = createAdminClient()
    await supabase.from('event_logs').insert({
      account_id: input.accountId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      data: {
        ...(input.data ?? {}),
        provider: input.provider ?? null,
        integration_id: input.integrationId ?? null,
        external_event_id: input.externalEventId ?? null,
        result: input.result,
      },
    })
  } catch (error) {
    console.error('[observability] failed to log event', error)
  }
}

export async function logOperationalError(input: OperationalErrorInput) {
  try {
    const supabase = createAdminClient()
    await supabase.from('error_logs').insert({
      tenant_id: input.accountId ?? null,
      error_type: 'server_error',
      severity: input.severity ?? 'medium',
      message: input.message,
      metadata: {
        ...(input.metadata ?? {}),
        provider: input.provider ?? null,
        integration_id: input.integrationId ?? null,
        external_event_id: input.externalEventId ?? null,
      },
    })
  } catch (error) {
    console.error('[observability] failed to log error', error)
  }
}

