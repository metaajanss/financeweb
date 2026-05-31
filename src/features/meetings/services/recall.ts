import { fetchWithRetry } from '@/core/http/fetch';

// Recall.ai is region-scoped: api keys created in eu-central-1 will not work
// against the global endpoint. Allow operators to override the base URL while
// defaulting to the EU region used by this account.
function getRecallBaseUrl(): string {
    const raw = process.env.RECALL_BASE_URL?.trim();
    if (!raw) return 'https://eu-central-1.recall.ai/api/v1';
    const trimmed = raw.replace(/\/+$/, '');
    return /\/api\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
}

/**
 * Recall.ai API Service
 */

export type MeetingPlatform = 'google_meet' | 'zoom' | 'microsoft_teams' | 'webex';

export interface CreateBotOptions {
    meeting_url: string;
    bot_name?: string;
    recording_mode?: 'default' | 'speaker_view' | 'gallery_view' | 'audio_only';
    transcription_mode?: 'default' | 'hybrid' | 'speech_to_text';
    transcription_language?: string;
    real_time_audio?: boolean;
    real_time_transcription?: boolean;
    webhook_url?: string;
    auto_join?: boolean;
    recording_format?: 'mp4' | 'webm';
    video_output_settings?: {
        width?: number;
        height?: number;
        fps?: number;
    };
    // Webpage-based avatar output: Recall renders the given URL inside the
    // bot's video tile. We use this to stream our /avatar-renderer page so
    // Anam's video and audio reach the meeting participants.
    output_video_webpage_url?: string;
    // Additional fields from main
    meeting_id?: string;
    account_id?: string;
    join_at?: string | null;
}

export type RawRecallStatus = string;
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
    | 'unknown';

const RAW_STATUS_MAP: Record<string, NormalizedRecallStatus> = {
    pending: 'pending',
    ready: 'ready',
    joining: 'joining',
    joining_call: 'joining',
    joined: 'joined',
    in_waiting_room: 'joining',
    calibrating: 'calibrating',
    in_call: 'in_call',
    in_call_not_recording: 'in_call',
    in_call_recording: 'recording',
    recording: 'recording',
    recording_permission_allowed: 'recording',
    recording_permission_denied: 'failed',
    paused: 'paused',
    left: 'left',
    call_ended: 'left',
    done: 'completed',
    completed: 'completed',
    analysis_pending: 'analysis_pending',
    analysis_complete: 'analysis_complete',
    fatal: 'failed',
    failed: 'failed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
};

/**
 * Map any Recall.ai bot status (raw or already normalized) to the closed set
 * accepted by our DB CHECK constraint.
 */
export function normalizeRecallStatus(raw: string | null | undefined): NormalizedRecallStatus {
    if (!raw) return 'unknown';
    return RAW_STATUS_MAP[raw.toLowerCase()] ?? 'unknown';
}

export interface Bot {
    id: string;
    status: 'pending' | 'joining' | 'in_call' | 'recording' | 'stopped' | 'failed' | 'completed';
    meeting_url: string;
    meeting_platform: MeetingPlatform;
    bot_name: string;
    recording_mode: string;
    transcription_mode: string;
    created_at: string;
    updated_at: string;
    ended_at: string | null;
    recording_url: string | null;
    recording_expires_at: string | null;
    transcript_url: string | null;
    transcript_expires_at: string | null;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
}

export interface TranscriptEntry {
    speaker: string;
    text: string;
    start_time: number;
    end_time: number;
    words: Array<{
        text: string;
        start_time: number;
        end_time: number;
    }>;
}

export interface BotTranscript {
    id: string;
    bot_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transcript: TranscriptEntry[] | null;
    speakers: string[];
    created_at: string;
    updated_at: string;
    expires_at: string | null;
}

export interface BotRecording {
    id: string;
    bot_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url: string | null;
    format: string;
    duration: number | null;
    size_bytes: number | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
}

export interface OutputMediaOptions {
    audio?: string;
    video?: string;
    audio_url?: string;
    video_url?: string;
    loop?: boolean;
}

interface RecallApiError {
    error: string;
    message: string;
    details?: Record<string, unknown>;
}

function getRecallApiKey(): string {
    const apiKey = process.env.RECALL_API_KEY;
    if (!apiKey) {
        throw new Error('[RecallService] RECALL_API_KEY environment variable is not set');
    }
    return apiKey;
}

function getHeaders(): Record<string, string> {
    return {
        'Authorization': `Token ${getRecallApiKey()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

async function handleRecallResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as RecallApiError;
        console.error(`[RecallService] API Error: ${JSON.stringify({ status: response.status, statusText: response.statusText, error: errorData })}`);
        throw new Error(
            `[RecallService] API Error ${response.status}: ${errorData.message || errorData.error || response.statusText}`
        );
    }
    return response.json() as Promise<T>;
}

/**
 * Create a new Recall.ai bot to join a meeting
 */
export async function createBot(options: CreateBotOptions): Promise<Bot> {
    const payload: Record<string, unknown> = {
        meeting_url: options.meeting_url,
        bot_name: options.bot_name || 'Payoff Lab AI Assistant',
        transcription_mode: options.transcription_mode || 'default',
        real_time_audio: options.real_time_audio ?? false,
        auto_join: options.auto_join ?? true,
        recording_format: options.recording_format || 'mp4',
        metadata: {
            payofflab_meeting_id: options.meeting_id,
            payofflab_account_id: options.account_id,
            ...((options as any).metadata || {}),
        },
    };

    // Omit optional fields when not provided to avoid sending null/undefined to the API
    if (options.transcription_language) payload.transcription_language = options.transcription_language;
    if (options.webhook_url) payload.webhook_url = options.webhook_url;
    if (options.video_output_settings) payload.video_output_settings = options.video_output_settings;
    if (options.join_at) payload.join_at = options.join_at;

    if (options.output_video_webpage_url) {
        payload.output_media = {
            camera: {
                kind: 'webpage',
                config: { url: options.output_video_webpage_url },
            },
        };
    }

    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
        timeoutMs: 30000,
        retries: 2,
    });
    return handleRecallResponse<Bot>(response);
}

/**
 * Get bot details by ID
 */
export async function getBot(botId: string): Promise<Bot> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}`, {
        method: 'GET',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    return handleRecallResponse<Bot>(response);
}

/**
 * Stop a running bot and leave the meeting
 */
export async function stopBot(botId: string): Promise<Bot> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/stop`, {
        method: 'POST',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    return handleRecallResponse<Bot>(response);
}

/**
 * Delete a bot record
 */
export async function deleteBot(botId: string): Promise<void> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`[RecallService] Failed to delete bot ${botId}: ${response.statusText}`);
    }
}

/**
 * Start streaming audio/video output to the meeting
 */
export async function startOutputMedia(
    botId: string,
    options: OutputMediaOptions
): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/output_media`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            audio: options.audio,
            video: options.video,
            audio_url: options.audio_url,
            video_url: options.video_url,
            loop: options.loop ?? false,
        }),
        timeoutMs: 30000,
        retries: 1,
    });
    return handleRecallResponse<{ success: boolean; message: string }>(response);
}

/**
 * Start streaming a webpage as the bot's video/audio output.
 * Used to broadcast the Anam-driven /avatar-renderer page into the meeting.
 */
export async function startWebpageOutput(
    botId: string,
    webpageUrl: string
): Promise<{ success: boolean; message?: string }> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/output_media`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            camera: {
                kind: 'webpage',
                config: { url: webpageUrl },
            },
        }),
        timeoutMs: 30000,
        retries: 1,
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as RecallApiError;
        console.error(`[RecallService] startWebpageOutput error: ${JSON.stringify({ status: response.status, error: errorData, botId, url: webpageUrl.slice(0, 100) })}`);
        throw new Error(
            `[RecallService] startWebpageOutput failed ${response.status}: ${errorData.message || errorData.error || response.statusText}`
        );
    }
    console.log(`[RecallService] startWebpageOutput success for bot ${botId}`);
    // Recall returns 200/202 with an empty body in some plans; treat any 2xx as success.
    return { success: true };
}

/**
 * Stop streaming output media to the meeting
 */
export async function stopOutputMedia(
    botId: string
): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/output_media`, {
        method: 'DELETE',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    return handleRecallResponse<{ success: boolean; message: string }>(response);
}

/**
 * Get the transcript for a completed bot session
 */
export async function getBotTranscript(botId: string): Promise<BotTranscript> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/transcript`, {
        method: 'GET',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    return handleRecallResponse<BotTranscript>(response);
}

/**
 * Get the recording details for a completed bot session
 */
export async function getBotRecording(botId: string): Promise<BotRecording> {
    const response = await fetchWithRetry(`${getRecallBaseUrl()}/bot/${botId}/recording`, {
        method: 'GET',
        headers: getHeaders(),
        timeoutMs: 10000,
        retries: 1,
    });
    return handleRecallResponse<BotRecording>(response);
}
