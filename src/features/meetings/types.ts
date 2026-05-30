/**
 * Meetings Feature - Type Definitions
 */

export type Meeting = {
    id: string
    lead_id: string | null
    title: string | null
    description: string | null
    scheduled_at: string | null
    start_time: string
    end_time: string
    duration_minutes: number | null
    status: string | null
    meeting_type: string | null
    location: string | null
    meeting_link: string | null
    created_at: string | null
    recording_url?: string | null
    transcript_url?: string | null
    ai_avatar_status?: string | null
    lead?: {
        first_name: string | null
        last_name: string | null
        email: string | null
    }
}

export type MeetingPlatform = 'google_meet' | 'zoom' | 'microsoft_teams' | 'webex'

export interface CreateBotOptions {
    meeting_url: string
    bot_name?: string
    recording_mode?: 'default' | 'speaker_view' | 'gallery_view' | 'audio_only'
    transcription_mode?: 'default' | 'hybrid' | 'speech_to_text'
    transcription_language?: string
    real_time_audio?: boolean
    real_time_transcription?: boolean
    webhook_url?: string
    auto_join?: boolean
    recording_format?: 'mp4' | 'webm'
    video_output_settings?: {
        width?: number
        height?: number
        fps?: number
    }
    output_video_webpage_url?: string
    meeting_id?: string
    account_id?: string
    join_at?: string | null
}

export type RawRecallStatus = string
export type NormalizedRecallStatus =
    | 'pending'
    | 'ready'
    | 'joining'
    | 'joined'
    | 'calibrating'
    | 'in_call'
    | 'recording'
    | 'paused'
    | 'left'
    | 'completed'
    | 'analysis_pending'
    | 'analysis_complete'
    | 'failed'
    | 'cancelled'
    | 'unknown'

export interface Bot {
    id: string
    status: 'pending' | 'joining' | 'in_call' | 'recording' | 'stopped' | 'failed' | 'completed'
    meeting_url: string
    meeting_platform: MeetingPlatform
    bot_name: string
    recording_mode: string
    transcription_mode: string
    created_at: string
    updated_at: string
    ended_at: string | null
    recording_url: string | null
    recording_expires_at: string | null
    transcript_url: string | null
    transcript_expires_at: string | null
    error_message: string | null
    metadata: Record<string, unknown> | null
}

export interface TranscriptEntry {
    speaker: string
    text: string
    start_time: number
    end_time: number
    words: Array<{
        text: string
        start_time: number
        end_time: number
    }>
}

export interface BotTranscript {
    id: string
    bot_id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    transcript: TranscriptEntry[] | null
    speakers: string[]
    created_at: string
    updated_at: string
    expires_at: string | null
}

export interface BotRecording {
    id: string
    bot_id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    url: string | null
    format: string
    duration: number | null
    size_bytes: number | null
    created_at: string
    updated_at: string
    expires_at: string | null
}

export interface OutputMediaOptions {
    audio?: string
    video?: string
    audio_url?: string
    video_url?: string
    loop?: boolean
}
