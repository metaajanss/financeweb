/**
 * Sequences Feature - Type Definitions
 */

import type { FAQItem } from '@/shared/types/ai-config'

export type SequenceStep = {
    id: string
    type: 'trigger' | 'email' | 'whatsapp' | 'linkedin' | 'task' | 'condition'
    delay_hours: number
    message_template?: string
    template_subject?: string
    message_template_b?: string
    template_subject_b?: string
    ab_test_enabled?: boolean
    channel: 'email' | 'whatsapp' | 'sms' | 'linkedin' | 'task' | 'condition'
    from_gmail_id?: string
    template_id?: string
    ai_icebreaker?: boolean
    ai_autopilot?: boolean
    parentId?: string
    branch?: 'yes' | 'no'
    settings?: any
}

export type SequenceMetrics = {
    enrolled: number
    active: number
    completed: number
    email: {
        sent: number
        opened: number
        replied: number
    }
    whatsapp: {
        sent: number
        opened: number
        replied: number
    }
    failed: number
    revenue?: number
}

export type SequenceTriggerType =
    | 'instant'
    | 'now'
    | 'no_response'
    | 'meeting_booked'
    | 'lead_created'
    | 'custom'
    | 'hubspot_lead'
    | 'salesforce_lead'
    | 'pipedrive_lead'
    | 'zoho_lead'

export type Sequence = {
    id: string
    account_id: string
    name: string
    trigger_type: SequenceTriggerType
    lead_type?: string
    steps: SequenceStep[]
    is_active: boolean
    metrics?: SequenceMetrics
    performanceScore?: number
    created_at: string
}

export type EnrollmentStatus = 'active' | 'failed' | 'pending' | 'paused' | 'completed'

export type HistoryItem = {
    id: string
    lead_name: string
    sequence_name: string
    channel: string
    event_type: string
    step_index: number | null
    created_at: string
}

export type FailedEnrollment = {
    id: string
    lead_name: string
    sequence_name: string
    current_step_index: number
    retry_count: number
    last_executed_at: string | null
    error_message: string | null
}

export type QueueItem = {
    id: string
    lead_name: string
    sequence_name: string
    channel: string
    step_index: number
    next_step_due_at: string
    retry_count: number
    status: EnrollmentStatus
}

export type GlobalSequenceAnalytics = {
    totals: {
        enrolled: number
        active: number
        completed: number
        email: { sent: number; opened: number; replied: number }
        whatsapp: { sent: number; opened: number; replied: number }
        revenue: number
    }
    daily: {
        date: string
        sent: number
        opened: number
        replied: number
    }[]
}

export type SequencePerformanceReport = {
    sequenceId: string
    sequenceName: string
    performanceScore: number
    totals: {
        sent: number
        opened: number
        replied: number
        failed: number
        enrolled: number
        active: number
        completed: number
    }
    rates: {
        openRate: number
        replyRate: number
        completionRate: number
    }
    daily: {
        date: string
        sent: number
        opened: number
        replied: number
    }[]
}

export type SequenceSettingsPayload = {
    dailyEmailLimit: number
    monthlyWhatsappLimit: number
    blackoutStartHour: number
    blackoutEndHour: number
    blackoutAction: 'delay' | 'skip'
    defaultTimezone: string
    respectUnsubscribes: boolean
}

export interface SequenceSettings {
    dailyEmailLimit: number
    monthlyWhatsappLimit: number
    blackoutStartHour: number
    blackoutEndHour: number
    blackoutAction: 'delay' | 'skip'
    defaultTimezone: string
    respectUnsubscribes: boolean
}

export type SequenceTemplate = {
    id: string
    name: string
    description: string
    trigger_type: SequenceTriggerType
    lead_type: string
    steps: SequenceStep[]
    tags: string[]
    icon: string
    channelType: 'email' | 'whatsapp' | 'mixed'
}

export type IndustryTemplate = {
    id: string
    name: string
    emoji: string
    knowledge_base: string
    qualification_questions: string[]
    brand_voice: 'professional' | 'friendly' | 'casual'
    faq_items: FAQItem[]
    forbidden_topics: string[]
    mandatory_rules: string[]
}
