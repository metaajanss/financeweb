/**
 * Extended AIConfig types with all nested properties properly typed
 */

export interface WorkingHours {
  start?: string
  end?: string
  timezone?: string
}

export interface OnboardingData {
  working_hours?: WorkingHours
  email_signature?: string
  company_info?: string
  [key: string]: unknown
}

export interface AvatarConfig {
  enabled?: boolean
  model?: string
  voice?: string
  language?: string
  persona_id?: string
}

export interface AIConfigMetadata {
  [key: string]: unknown
}

export interface AIConfigFull {
  id: string
  account_id: string

  // Identity
  persona_name?: string | null
  persona_intro?: string | null

  // Knowledge
  brand_voice?: string | null
  knowledge_base?: string | null

  // Rules
  mandatory_rules?: string[] | null
  forbidden_topics?: string[] | null

  // Responses
  auto_response_enabled?: boolean
  auto_response_message?: string | null
  response_delay_seconds?: number | null

  // Qualification
  qualification_enabled?: boolean
  qualification_questions?: string[] | null

  // Fallback
  fallback_action?: 'end' | 'transfer' | 'queue' | null
  fallback_message?: string | null

  // FAQs
  faq_items?: Array<{ question: string; answer: string }> | null

  // Avatar
  avatar_config?: AvatarConfig | null

  // Advanced
  onboarding_data?: OnboardingData | null
  ai_config?: Record<string, unknown> | null
  metadata?: AIConfigMetadata | null

  // Timestamps
  created_at?: string
  updated_at?: string
}

export function getWorkingHours(config: AIConfigFull | null | undefined): WorkingHours | undefined {
  return config?.onboarding_data?.working_hours as WorkingHours | undefined
}

export function getAvatarConfig(config: AIConfigFull | null | undefined): AvatarConfig | undefined {
  return config?.avatar_config ?? undefined
}

export function getFallbackAction(config: AIConfigFull | null | undefined): string | null {
  return config?.fallback_action ?? null
}
