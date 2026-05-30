/**
 * Utilities for safe error handling without `catch (err: any)`
 * Replaces 85+ instances of unsafe error typing across the codebase
 */

/**
 * Extract error message from unknown error safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as Record<string, unknown>).message
    if (typeof msg === 'string') return msg
  }
  return String(error)
}

/**
 * Extract error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const code = (error as Record<string, unknown>).code
    if (typeof code === 'string') return code
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Safely access error property with fallback
 */
export function getErrorProperty(
  error: unknown,
  property: string,
  defaultValue?: unknown
): unknown {
  if (error && typeof error === 'object' && property in error) {
    return (error as Record<string, unknown>)[property]
  }
  return defaultValue
}

/**
 * Check if error is of specific type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  type: new (...args: unknown[]) => T
): error is T {
  return error instanceof type
}

/**
 * Safe async wrapper that handles errors properly
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (err: unknown) => void
): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    onError?.(err)
    return null
  }
}

/**
 * Safe sync wrapper for error handling
 */
export function tryCatchSync<T>(
  fn: () => T,
  onError?: (err: unknown) => void
): T | null {
  try {
    return fn()
  } catch (err) {
    onError?.(err)
    return null
  }
}

/**
 * Type guard for Supabase error
 */
export interface SupabaseError extends Error {
  code?: string
  status?: number
  hint?: string
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return error instanceof Error && ('code' in error || 'status' in error)
}

/**
 * Type guard for PostgreSQL constraint error
 */
export function isConstraintError(error: unknown): boolean {
  if (!isSupabaseError(error)) return false
  const code = getErrorCode(error)
  return code.startsWith('23') // PostgreSQL integrity constraint errors
}

/**
 * Type guard for not found error
 */
export function isNotFoundError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    return error.status === 404
  }
  return false
}

/**
 * Type guard for timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!isSupabaseError(error)) return false
  const msg = getErrorMessage(error).toLowerCase()
  return msg.includes('timeout') || msg.includes('timed out')
}
