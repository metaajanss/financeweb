/**
 * Avatar Presentation feature types.
 *
 * An account can upload one PDF pitch deck. Each page becomes a slide with a
 * generated speaking script that the avatar reads in meetings. The renderer
 * runs a state machine (greeting → small talk → ask consent → present →
 * answer questions → resume) and reports metrics back to the meeting record.
 */

export type PresentationStatus = 'processing' | 'ready' | 'failed'

export interface AccountPresentation {
    id: string
    account_id: string
    title: string | null
    pdf_path: string
    page_count: number
    status: PresentationStatus
    error_message: string | null
    created_at: string
    updated_at: string
}

export interface AccountSlide {
    id: string
    presentation_id: string
    account_id: string
    page_number: number
    image_path: string
    raw_text: string | null
    speaking_script: string
    created_at: string
    updated_at: string
}

/** Slide shape sent to the avatar renderer (with signed image URL). */
export interface RendererSlide {
    page_number: number
    image_url: string
    speaking_script: string
    raw_text: string | null
}

export interface RendererPresentation {
    id: string
    title: string | null
    slides: RendererSlide[]
}

/** Bus events broadcast from the Recall webhook to the SSE stream. */
export type PresentationBusEvent =
    | { type: 'meeting_started'; meeting_id: string }
    | { type: 'transcript'; meeting_id: string; speaker: string; text: string }
    | { type: 'question'; meeting_id: string; text: string }

/** Avatar metrics persisted into meetings.avatar_metadata. */
export interface AvatarMetrics {
    slides_shown?: number[]
    questions_answered?: number
    presentation_started_at?: string
    presentation_ended_at?: string
    presentation_duration_ms?: number
    summary?: string
}

export type ConsentClassification = 'yes' | 'no' | 'unclear'
