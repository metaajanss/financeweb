/**
 * Sequences feature constants
 */

export const SEQUENCE_TYPES = [
  'email',
  'whatsapp',
  'sms',
  'mixed',
] as const

export const STEP_TYPES = [
  'trigger',
  'wait',
  'email',
  'whatsapp',
  'sms',
  'task',
  'condition',
  'webhook',
] as const

export const SEQUENCE_STATUSES = [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
] as const

export const DEFAULT_WAIT_HOURS = 24
export const MIN_WAIT_HOURS = 1
export const MAX_WAIT_DAYS = 365

export const MAX_SEQUENCE_STEPS = 100
export const DEFAULT_SEQUENCE_PAGE_SIZE = 20

export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
] as const
