/**
 * Comprehensive type definitions for all integrations
 * This eliminates the need for `as any` when accessing integration data
 */

export interface IntegrationConfig {
  id: string
  account_id: string
  provider: string
  status: 'connected' | 'disconnected' | 'error'
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GmailIntegration extends IntegrationConfig {
  provider: 'gmail'
  config: {
    email?: string
    refreshToken?: string
    accessToken?: string
    expiresAt?: number
  }
}

export interface CalendarIntegration extends IntegrationConfig {
  provider: 'google_calendar'
  config: {
    calendarId?: string
    email?: string
    refreshToken?: string
  }
}

export interface SheetsIntegration extends IntegrationConfig {
  provider: 'google_sheets'
  config: {
    sheetId?: string
    worksheetId?: string
    autoExport?: boolean
  }
}

export interface SlackIntegration extends IntegrationConfig {
  provider: 'slack'
  config: {
    webhookUrl?: string
    channelId?: string
    teamId?: string
  }
}

export interface DiscordIntegration extends IntegrationConfig {
  provider: 'discord'
  config: {
    webhookUrl?: string
    serverId?: string
  }
}

export interface TwilioIntegration extends IntegrationConfig {
  provider: 'twilio'
  config: {
    accountSid?: string
    authToken?: string
    phoneNumber?: string
  }
}

export type AnyIntegration =
  | GmailIntegration
  | CalendarIntegration
  | SheetsIntegration
  | SlackIntegration
  | DiscordIntegration
  | TwilioIntegration
  | IntegrationConfig

export function isGmailIntegration(int: IntegrationConfig): int is GmailIntegration {
  return int.provider === 'gmail'
}

export function isCalendarIntegration(int: IntegrationConfig): int is CalendarIntegration {
  return int.provider === 'google_calendar'
}

export function isSheetsIntegration(int: IntegrationConfig): int is SheetsIntegration {
  return int.provider === 'google_sheets'
}
