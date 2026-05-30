/**
 * Lead feature constants
 */

export const LEAD_SCORE_THRESHOLDS = {
  HOT: 80,
  WARM: 50,
  COLD: 0,
} as const

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'opportunity', 'customer', 'lost'] as const

export const LEAD_SOURCES = [
  'website',
  'email',
  'whatsapp',
  'linkedin',
  'phone',
  'referral',
  'event',
  'social_media',
  'other',
] as const

export const DEFAULT_LEAD_PAGE_SIZE = 20
export const MAX_BULK_IMPORT_SIZE = 1000

export const NURTURE_SEQUENCE_DEFAULTS = {
  MIN_INTERVAL_HOURS: 24,
  MAX_INTERVAL_DAYS: 90,
  DEFAULT_INTERVAL_DAYS: 7,
} as const
