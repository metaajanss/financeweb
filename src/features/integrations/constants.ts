/**
 * Integrations feature constants
 */

export const SUPPORTED_INTEGRATIONS = {
  MESSAGING: ['slack', 'discord', 'whatsapp', 'gmail', 'smtp'],
  GOOGLE: ['google_calendar', 'google_sheets', 'google_search_console', 'google_maps'],
  CRM: ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'close', 'copper'],
  OTHER: ['paddle', 'recall'],
} as const

export const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
  slack: 'Slack',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  smtp: 'SMTP',
  google_calendar: 'Google Calendar',
  google_sheets: 'Google Sheets',
  google_search_console: 'Google Search Console',
  google_maps: 'Google Maps',
  hubspot: 'HubSpot',
  salesforce: 'Salesforce',
  pipedrive: 'Pipedrive',
  zoho: 'Zoho',
  close: 'Close',
  copper: 'Copper',
  paddle: 'Paddle',
  recall: 'Recall',
}

export const INTEGRATION_ICONS: Record<string, string> = {
  slack: '🔷',
  discord: '💜',
  whatsapp: '💬',
  gmail: '📧',
  smtp: '📬',
  google_calendar: '📅',
  google_sheets: '📊',
  google_search_console: '🔍',
  google_maps: '🗺️',
  hubspot: '🟠',
  salesforce: '☁️',
  pipedrive: '🔵',
  zoho: '🟦',
  close: '📞',
  copper: '🟧',
  paddle: '🛒',
  recall: '🎥',
}
