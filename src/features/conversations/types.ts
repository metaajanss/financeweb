/**
 * Conversations Feature - Type Definitions
 *
 * Centralized types for conversations, messages, and message processing.
 */

export type Message = {
    id: string
    conversation_id: string
    sender_type: 'lead' | 'agent' | 'ai' | 'system'
    content: string
    created_at?: string | null
    metadata?: Record<string, unknown>
}

export type Conversation = {
    id: string
    lead_id: string
    status: 'active' | 'paused' | 'closed'
    last_message_at: string
    is_ai_active: boolean
    integration_id?: string
    integration?: {
        id: string
        config?: { email?: string }
        is_primary?: boolean
        label?: string
    }
    lead: {
        first_name: string
        last_name: string
        email: string
        source: string
        status?: string
    }
    messages: Message[]
    conversations?: Array<{ id: string; channel: string; created_at: string }>
}

export type MessageIntent = 'booking' | 'question' | 'objection' | 'general'

export type FAQItem = { question: string; answer: string }

export type AIContext = {
    leadName: string
    leadEmail: string
    leadLanguage?: string
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    companyInfo?: string
    workingHours?: { start: string; end: string }
    aiConfig?: {
        brand_voice?: string
        knowledge_base?: string
        qualification_questions?: string[]
        fallback_action?: string
        fallback_message?: string
        persona_name?: string
        persona_intro?: string
        forbidden_topics?: string[]
        mandatory_rules?: string[]
        faq_items?: FAQItem[]
    }
}

export type MeetingResult = {
    created: boolean
    hangoutLink?: string
    startTime?: string
    busy?: boolean
    noCalendar?: boolean
}
