import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = {
  ok: true
  data: T
}

export type ApiErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Standardized successful API response
 */
export function apiResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status })
}

/**
 * Standardized error API response
 */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const error: ApiErrorResponse['error'] = {
    code,
    message,
  }
  if (details) {
    error.details = details
  }
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status }
  )
}
