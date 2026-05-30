import { NextResponse } from 'next/server'
import { AppError, isAppError } from './AppError'
import { apiError } from '../api/response'

export interface ErrorContext {
  accountId?: string | null
  userId?: string | null
  endpoint?: string
  method?: string
  metadata?: Record<string, unknown>
}

/**
 * Detect error severity based on message content
 */
function detectSeverity(message: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = message.toLowerCase()

  if (
    lower.includes('fatal') ||
    lower.includes('crash') ||
    lower.includes('security') ||
    lower.includes('payment') ||
    lower.includes('auth')
  ) {
    return 'critical'
  }

  if (
    lower.includes('database') ||
    lower.includes('connection') ||
    lower.includes('timeout') ||
    lower.includes('failed to') ||
    lower.includes('external service')
  ) {
    return 'high'
  }

  if (lower.includes('warning') || lower.includes('invalid')) {
    return 'medium'
  }

  return 'low'
}

/**
 * Central error handler: AppError → API response + observability log
 *
 * Usage in API route:
 * ```typescript
 * try {
 *   // handler code
 * } catch (error) {
 *   return handleError(error, { accountId, endpoint: 'POST /api/leads' })
 * }
 * ```
 */
export async function handleError(
  error: unknown,
  ctx?: ErrorContext
): Promise<NextResponse> {
  // If it's already an AppError, use it directly
  if (isAppError(error)) {
    // Fire-and-forget: log to observability (don't block response)
    logErrorAsync(error, ctx).catch(console.error)

    return apiError(error.code, error.message, error.status, error.details)
  }

  // Unknown error: convert to InternalError
  if (error instanceof Error) {
    const appError = new AppError(
      'INTERNAL_ERROR',
      error.message,
      500,
      'high',
      { originalError: error.name }
    )

    // Log unknown error
    logErrorAsync(appError, ctx).catch(console.error)

    console.error('Unhandled error:', error)
    return apiError(appError.code, appError.message, 500)
  }

  // Non-Error object
  const _message = String(error)
  console.error('Unknown error type:', error)
  logErrorAsync(
    new AppError('INTERNAL_ERROR', 'Unknown error', 500, 'high'),
    ctx
  ).catch(console.error)

  return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500)
}

/**
 * Async logging without blocking the response
 */
async function logErrorAsync(
  error: AppError,
  ctx?: ErrorContext
): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { logOperationalError } = await import(
      '../observability/events'
    )

    const severity = error.severity || detectSeverity(error.message)

    const metadata: Record<string, unknown> = {
      code: error.code,
      endpoint: ctx?.endpoint,
      method: ctx?.method,
    }
    if (ctx?.metadata) {
      Object.assign(metadata, ctx.metadata)
    }
    if (error.details) {
      metadata.details = error.details
    }

    await logOperationalError({
      accountId: ctx?.accountId,
      message: error.message,
      severity,
      metadata,
    })
  } catch (err) {
    // Silently fail to prevent error loop
    console.error('[error handler] failed to log error:', err)
  }
}

/**
 * Type guard helper to determine if error should return 500 vs other status
 */
export function getErrorStatus(error: unknown): number {
  if (isAppError(error)) {
    return error.status
  }
  return 500
}
