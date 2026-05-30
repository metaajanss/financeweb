import type { Database } from './database.types'

export interface LeadMetadata {
  source_url?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  referrer?: string
  ip_address?: string
  user_agent?: string
  imported_from_sheets?: boolean
  import_date?: string
  [key: string]: unknown
}

export type LeadRow = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
