/**
 * Conversations feature constants
 */

export const CONVERSATION_STATUSES = [
  'active',
  'archived',
  'closed',
] as const

export const MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const

export const MESSAGE_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'read',
] as const

export const CONVERSATION_SOURCES = [
  'whatsapp',
  'email',
  'slack',
  'discord',
  'sms',
  'widget',
] as const

export const DEFAULT_PAGE_SIZE = 20
export const MESSAGE_BATCH_SIZE = 50
