export interface HubspotConfig {
  provider: 'hubspot'
  access_token: string
  refresh_token?: string
  portal_id?: string
}

export interface SalesforceConfig {
  provider: 'salesforce'
  access_token: string
  instance_url: string
  refresh_token?: string
}

export interface TwilioConfig {
  provider: 'twilio'
  account_sid: string
  auth_token: string
  from: string
}

export interface PipedriveConfig {
  provider: 'pipedrive'
  api_token: string
}

export interface ZohoConfig {
  provider: 'zoho'
  access_token: string
  refresh_token?: string
}

export interface CloseConfig {
  provider: 'close'
  api_key: string
}

export interface CopperConfig {
  provider: 'copper'
  api_key: string
  user_email: string
}

export interface GoogleSheetsConfig {
  provider: 'google_sheets'
  access_token: string
  refresh_token?: string
  expiry_date?: number
  spreadsheetId?: string
  sheetName?: string
  mapping?: Record<string, string>
  autoExport?: boolean
  lastSyncedRow?: number
}

export interface GoogleCalendarConfig {
  provider: 'google_calendar'
  access_token: string
  refresh_token?: string
  expiry_date?: number
  email?: string
}

export interface GmailConfig {
  provider: 'gmail'
  access_token: string
  refresh_token?: string
  expiry_date?: number
  email: string
  scope?: string
  last_pulled_at?: number
}

export interface MetaConfig {
  provider: 'meta'
  access_token: string
  page_id?: string
  phone_number_id?: string
}

export interface WhatsAppConfig {
  provider: 'whatsapp'
  access_token: string
  phone_number_id: string
  business_account_id?: string
}

export interface FormConfig {
  provider: 'form'
  signing_secret: string
  endpoint_id?: string
}

export interface SlackConfig {
  provider: 'slack'
  webhook_url: string
  notifications: {
    leads: boolean
    meetings: boolean
    messages: boolean
    errors: boolean
    reminders: boolean
  }
}

export interface DiscordConfig {
  provider: 'discord'
  webhook_url: string
  notifications: {
    leads: boolean
    meetings: boolean
    messages: boolean
    errors: boolean
    reminders: boolean
  }
}

export interface EmailSmtpConfig {
  provider: 'email'
  email: string
  from_name?: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_password: string
  imap_host: string
  imap_port: number
  imap_secure: boolean
  imap_user: string
  imap_password: string
  last_pulled_at?: number
}

export type IntegrationConfig =
  | HubspotConfig
  | SalesforceConfig
  | PipedriveConfig
  | ZohoConfig
  | CloseConfig
  | CopperConfig
  | GoogleSheetsConfig
  | GoogleCalendarConfig
  | GmailConfig
  | EmailSmtpConfig
  | MetaConfig
  | WhatsAppConfig
  | FormConfig
  | SlackConfig
  | DiscordConfig
  | TwilioConfig

export interface Integration {
  id: string
  provider: IntegrationConfig['provider']
  status: 'connected' | 'disconnected' | 'error'
  config: IntegrationConfig
  is_primary?: boolean
  label?: string
  created_at: string
}
