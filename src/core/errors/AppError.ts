export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'CONFLICT'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'DATABASE_ERROR'
  | 'TENANCY_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 500,
    public severity: ErrorSeverity = 'medium',
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, 'low', details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super('AUTH_ERROR', message, 401, 'medium', details)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super('UNAUTHORIZED', message, 401, 'medium', details)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super('FORBIDDEN', message, 403, 'medium', details)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', details?: unknown) {
    super('NOT_FOUND', message, 404, 'low', details)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super('RATE_LIMIT', message, 429, 'medium', { retryAfter })
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: unknown) {
    super('CONFLICT', message, 409, 'medium', details)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message: string,
    details?: unknown
  ) {
    const errorDetails: Record<string, unknown> = { service: serviceName }
    if (details && typeof details === 'object') {
      Object.assign(errorDetails, details)
    }
    super(
      'EXTERNAL_SERVICE_ERROR',
      `${serviceName} error: ${message}`,
      502,
      'high',
      errorDetails
    )
    this.name = 'ExternalServiceError'
    Object.setPrototypeOf(this, ExternalServiceError.prototype)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, 500, 'high', details)
    this.name = 'DatabaseError'
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

export class TenancyError extends AppError {
  constructor(message: string = 'Tenancy violation', details?: unknown) {
    super('TENANCY_ERROR', message, 403, 'critical', details)
    this.name = 'TenancyError'
    Object.setPrototypeOf(this, TenancyError.prototype)
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super('INTERNAL_ERROR', message, 500, 'high', details)
    this.name = 'InternalError'
    Object.setPrototypeOf(this, InternalError.prototype)
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
