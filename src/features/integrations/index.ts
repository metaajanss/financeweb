/**
 * Integrations Feature - Public API
 *
 * Only export what's needed by other features.
 * Server-only providers (gmail, smtp, calendar, sheets, maps, gsc, crm)
 * use googleapis/nodemailer and must be imported directly, not via this barrel.
 */

// Components
export { IntegrationConfigModal } from './components/config-modal'
export { EmailAccountsModal } from './components/email-accounts-modal'

// Forms
export { SlackForm } from './components/forms/SlackForm'
export { DiscordForm } from './components/forms/DiscordForm'
export { WhatsAppForm } from './components/forms/WhatsAppForm'
export { GoogleSheetsForm } from './components/forms/GoogleSheetsForm'
export { TwilioForm } from './components/forms/TwilioForm'
export { GenericCrmForm } from './components/forms/GenericCrmForm'

// Server actions (safe to import in client - Next.js handles server/client boundary)
export * from './providers/twilio'

// Types
export type * from './types'

// Constants
export * from './constants'

/**
 * NOTE: Server-only providers (gmail, smtp, calendar, sheets, maps, gsc, crm)
 * must be imported directly from ./providers/, not via this barrel, because they
 * use googleapis/nodemailer and other Node.js modules that can't be bundled for client.
 *
 * Example (server-side only):
 *   import { sendGmailMessage } from '@/features/integrations/providers/messaging/gmail'
 */
