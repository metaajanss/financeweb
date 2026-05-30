import type { Database } from './database.types'

export interface AccountMetadata {
  onboarding_completed?: boolean
  trial_started_at?: string
  feature_flags?: Record<string, boolean>
  [key: string]: unknown
}

export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
