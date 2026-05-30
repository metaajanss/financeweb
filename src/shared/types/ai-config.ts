export type FAQItem = {
    question: string
    answer: string
}

export type KBFile = {
    id: string
    name: string
    size: number
    mime_type: string
    path: string
    uploaded_at: string
    enabled: boolean
    extracted_text: string
    char_count: number
}

export type NurtureConfig = {
    enabled: boolean
    inactivity_threshold_hours: number
    max_nurture_messages: number
    send_time_start: number
    send_time_end: number
    days_between_messages: number
    tone: 'friendly' | 'professional' | 'casual'
    include_meeting_cta: boolean
    custom_prompt?: string
    channels: ('email' | 'whatsapp')[]
}

export type AvatarConfig = {
    enabled: boolean
    model: string
    voice: string
    language: string
    persona_id: string
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    enabled: false,
    model: 'default',
    voice: 'default',
    language: 'tr',
    persona_id: '',
}

export type AIConfig = {
    brand_voice: string
    knowledge_base: string
    qualification_questions: string[]
    auto_response_enabled: boolean
    response_delay_seconds: number
    fallback_action: 'none' | 'human_handoff' | 'custom_message'
    fallback_message: string
    persona_name: string
    persona_intro: string
    forbidden_topics: string[]
    mandatory_rules: string[]
    faq_items: FAQItem[]
    nurture_config?: NurtureConfig
    kb_files?: KBFile[]
    avatar_config?: AvatarConfig
}

export const DEFAULT_NURTURE_CONFIG: NurtureConfig = {
    enabled: false,
    inactivity_threshold_hours: 72,
    max_nurture_messages: 3,
    send_time_start: 9,
    send_time_end: 17,
    days_between_messages: 3,
    tone: 'friendly',
    include_meeting_cta: true,
    channels: ['email'],
    custom_prompt: '',
}

export type AIStats = {
    responses30d: number
    meetings30d: number
    bookingRate: number
}

export type UnansweredQuestion = {
    id: string
    question: string
    lead_name: string
    created_at: string
    added_to_kb: boolean
}

