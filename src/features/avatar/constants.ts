/**
 * Avatar feature constants
 *
 * Reflect real implementation limits — these are the source of truth used by
 * `/api/avatar/presentation` and the presentation editor UI.
 */

export const MAX_PRESENTATION_PDF_BYTES = 10 * 1024 * 1024 // 10 MB
// AVT-012: Standardized signed URL TTL across presentation routes (24 hours)
export const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
export const SUPPORTED_PRESENTATION_FORMATS = ['pdf'] as const

export const PRESENTATION_STATUSES = [
    'processing',
    'ready',
    'failed',
] as const
export type PresentationStatus = typeof PRESENTATION_STATUSES[number]
