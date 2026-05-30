import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { ValidationError } from '../errors/AppError'
import { apiError, apiResponse } from './response'
import { handleRateLimit } from './rate-limit'

export interface ApiContext {
  request: NextRequest
  params?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: unknown
  user?: {
    id: string
    email: string
  }
  account?: {
    id: string
    name: string
  }
}

export interface ApiHandlerConfig {
  /**
   * Rate limiting config
   */
  rateLimit?: {
    limit: number
    window: number
    keyPrefix?: string
  }

  /**
   * Required authentication level
   * - 'public': no auth required
   * - 'user': authenticated user required
   * - 'admin': admin role required
   * - 'super-admin': super admin role required
   * - 'webhook': webhook signature verification required
   */
  auth?: 'public' | 'user' | 'admin' | 'super-admin' | 'webhook'

  /**
   * Webhook signature verification method
   */
  webhookVerify?: 'twilio' | 'paddle' | 'meta' | 'svix' | 'crm'

  /**
   * Enable CORS
   */
  cors?: boolean | {
    origin?: string[]
    methods?: string[]
    allowedHeaders?: string[]
  }

  /**
   * Zod schema for request body validation
   */
  schema?: ZodSchema

  /**
   * Skip automatic body parsing — required for webhook routes that need raw
   * body bytes for HMAC signature verification (e.g. Meta x-hub-signature-256).
   * When true, the route handler must read the body itself via ctx.request.text()
   * or ctx.request.json(). Incompatible with `schema`.
   */
  rawBody?: boolean

  /**
   * The handler function
   */
  handler: (ctx: ApiContext) => Promise<unknown>

  /**
   * Methods this handler accepts
   */
  methods?: string[]
}

/**
 * Create a standardized API route handler with middleware composition
 *
 * Usage:
 * ```typescript
 * import { createApiHandler } from '@/core/api/handler'
 * import { apiResponse } from '@/core/api/response'
 * import { AuthError } from '@/core/errors/AppError'
 *
 * export const POST = createApiHandler({
 *   auth: 'user',
 *   rateLimit: { limit: 10, window: 60000 },
 *   schema: z.object({ name: z.string() }),
 *   async handler(ctx) {
 *     if (!ctx.user) throw new AuthError()
 *     return { userId: ctx.user.id }
 *   }
 * })
 * ```
 */
export function createApiHandler(config: ApiHandlerConfig) {
  return async function handler(
    request: NextRequest,
    context?: unknown
  ): Promise<NextResponse> {
    try {
      // 1. Rate limiting
      if (config.rateLimit && config.auth !== 'webhook') {
        const rateLimitResult = await handleRateLimit(
          request,
          config.rateLimit.limit,
          config.rateLimit.window,
          config.rateLimit.keyPrefix
        )

        if (rateLimitResult?.status === 429) {
          return rateLimitResult!
        }
      }

      // 2. CORS
      if (config.cors && request.method === 'OPTIONS') {
        return createCorsResponse(config.cors)
      }

      // 3. Method check
      if (config.methods && !config.methods.includes(request.method)) {
        return apiError('METHOD_NOT_ALLOWED', `${request.method} not allowed`, 405)
      }

      // 4. Parse body (tolerant of empty body when no schema is required)
      // Skip entirely when rawBody is set so the route can read it itself for
      // HMAC signature verification (raw bytes must be preserved).
      let body: unknown = undefined
      if (!config.rawBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentLength = request.headers.get('content-length')
        const hasBody = contentLength !== '0' && contentLength !== null
        if (hasBody || config.schema) {
          try {
            body = await request.json()
          } catch (e) {
            if (config.schema) {
              throw new ValidationError('Invalid JSON in request body', { error: String(e) })
            }
            // No schema required, treat empty/invalid body as undefined
            body = undefined
          }
        }
      }

      // 5. Validate schema
      if (config.schema && body) {
        const parsed = config.schema.safeParse(body)
        if (!parsed.success) {
          throw new ValidationError('Validation failed', { errors: parsed.error.flatten() })
        }
        body = parsed.data
      }

      // 6. Authentication
      const paramsPromise = (context as Record<string, unknown> | undefined)?.params
      const params = paramsPromise instanceof Promise ? await paramsPromise : paramsPromise as Record<string, string> | undefined

      // Extract query parameters from URL
      const query: Record<string, string | string[]> = {}
      request.nextUrl.searchParams.forEach((value, key) => {
        if (query[key]) {
          if (Array.isArray(query[key])) {
            (query[key] as string[]).push(value)
          } else {
            query[key] = [query[key] as string, value]
          }
        } else {
          query[key] = value
        }
      })

      const ctx: ApiContext = {
        request,
        params,
        query: Object.keys(query).length > 0 ? query : undefined,
        body,
      }

      if (config.auth && config.auth !== 'public' && config.auth !== 'webhook') {
        const { verifyAuth } = await import('./auth')
        await verifyAuth(request, config.auth, ctx)
      }

      // 7. Call handler
      const result = await config.handler(ctx)

      // 8. Return response
      if (result instanceof NextResponse) {
        return result
      }

      // Apply CORS headers if enabled
      const response = apiResponse(result)
      if (config.cors) {
        applyCorsHeaders(response, config.cors)
      }
      return response
    } catch (error) {
      // Handle error
      const { handleError } = await import('../errors/handler')
      return handleError(error, {
        endpoint: `${request.method} ${request.nextUrl.pathname}`,
        method: request.method,
      })
    }
  }
}

/**
 * Helper: Create CORS preflight response
 */
function createCorsResponse(cors: boolean | Record<string, unknown>): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  applyCorsHeaders(response, cors)
  return response
}

/**
 * Helper: Apply CORS headers to response
 */
function applyCorsHeaders(response: NextResponse, cors: boolean | Record<string, unknown>): void {
  if (cors === true) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  } else if (typeof cors === 'object') {
    const origin = (cors as Record<string, unknown>).origin
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', String(origin))
    }
    const methods = (cors as Record<string, unknown>).methods
    if (methods) {
      response.headers.set('Access-Control-Allow-Methods', String(methods))
    }
    const headers = (cors as Record<string, unknown>).allowedHeaders
    if (headers) {
      response.headers.set('Access-Control-Allow-Headers', String(headers))
    }
  }
}
