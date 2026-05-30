/**
 * Anam AI Service Client
 * 
 * Handles real-time video/audio persona synthesis for AI Avatar Meeting Assistant.
 * Used in conjunction with Recall.ai for meeting bot participation.
 * 
 * Environment Variables:
 * - ANAM_API_KEY: Anam AI API key
 * - ANAM_PERSONA_ID: Default Anam AI persona ID
 * 
 * @see https://www.anam.ai/docs
 */

import { fetchWithRetry } from '@/core/http/fetch';

const ANAM_BASE_URL = process.env.ANAM_BASE_URL?.trim() || 'https://api.anam.ai/v1';

/**
 * Lightweight in-process circuit breaker for the Anam API.
 *
 * If the upstream returns 5 consecutive failures within 30s the breaker
 * trips OPEN for 30s — during which we short-circuit all calls and surface
 * an ExternalServiceError-like response immediately. This prevents a
 * degraded Anam endpoint from being hammered by every meeting reconnect.
 */
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 30_000;
const CIRCUIT_FAILURE_WINDOW_MS = 30_000;

interface CircuitState {
    failures: number[];
    openUntil: number;
}

const anamCircuit: CircuitState = ((): CircuitState => {
    const g = globalThis as unknown as { __anamCircuit?: CircuitState };
    if (g.__anamCircuit) return g.__anamCircuit;
    const state: CircuitState = { failures: [], openUntil: 0 };
    g.__anamCircuit = state;
    return state;
})();

function circuitIsOpen(): boolean {
    return Date.now() < anamCircuit.openUntil;
}

function recordCircuitFailure(): void {
    const now = Date.now();
    anamCircuit.failures = anamCircuit.failures.filter(t => now - t < CIRCUIT_FAILURE_WINDOW_MS);
    anamCircuit.failures.push(now);
    if (anamCircuit.failures.length >= CIRCUIT_FAILURE_THRESHOLD) {
        anamCircuit.openUntil = now + CIRCUIT_OPEN_MS;
        anamCircuit.failures = [];
        console.error(`[AnamService] Circuit breaker OPEN for ${CIRCUIT_OPEN_MS}ms after ${CIRCUIT_FAILURE_THRESHOLD} failures.`);
    }
}

function recordCircuitSuccess(): void {
    if (anamCircuit.failures.length > 0) anamCircuit.failures = [];
}

// Type Definitions

export interface AnamSessionConfig {
    persona_id: string;
    api_key: string;
    system_prompt?: string;
    metadata?: Record<string, unknown>;
    /** Anam voice id (optional; falls back to persona default) */
    voice_id?: string;
    /** Anam language code, e.g. 'tr', 'en' */
    language?: string;
    /** Avatar model identifier (e.g. 'cara-4-latest') */
    avatar_model?: string;
}

export interface AnamSessionResponse {
    session_token: string;
    session_id: string;
    expires_at: string;
    ws_url?: string;
}

interface AnamSessionTokenApiResponse {
    sessionToken?: string;
    session_token?: string;
    sessionId?: string;
    session_id?: string;
    expiresAt?: string;
    expires_at?: string;
    wsUrl?: string;
    ws_url?: string;
}

export interface AnamAvatar {
    id: string;
    name: string;
    description: string;
    thumbnail_url: string;
    status: 'active' | 'inactive' | 'processing';
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
}

export interface AnamVoice {
    id: string;
    name: string;
    description: string;
    gender: 'male' | 'female' | 'neutral';
    language: string;
    preview_url?: string;
    status: 'active' | 'inactive';
}

export interface AnamPersona {
    id: string;
    name: string;
    description?: string;
    avatar?: {
        id: string;
        imageUrl?: string;
        videoUrl?: string;
        displayName?: string;
    } | null;
    // legacy fields
    avatar_id?: string;
    thumbnail_url?: string;
    status?: 'active' | 'inactive' | 'processing';
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
    languageCode?: string;
    isDefaultPersona?: boolean;
}

export interface CreatePersonaPayload {
    name: string;
    description?: string;
    avatar_id?: string;
    voice_id?: string;
    system_prompt?: string;
    personality?: string;
}

export interface AnamApiError {
    error: string;
    message: string;
    code?: string;
}

// Internal helper functions

function getAnamApiKey(): string {
    const apiKey = process.env.ANAM_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('[AnamService] ANAM_API_KEY is not configured');
    }
    return apiKey;
}

// Reject Anam responses larger than this to defend against a malicious or
// misconfigured upstream sending megabyte-scale error blobs that would
// pressure heap / JSON parsing.
const MAX_ANAM_RESPONSE_BYTES = 1024 * 1024 // 1 MB

async function safeReadJson<T>(response: Response): Promise<T | null> {
    const lenHeader = response.headers.get('content-length')
    if (lenHeader && Number(lenHeader) > MAX_ANAM_RESPONSE_BYTES) {
        console.error('[AnamService] response too large:', lenHeader)
        return null
    }
    try {
        return await response.json() as T
    } catch {
        return null
    }
}

async function handleAnamResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = (await safeReadJson<AnamApiError>(response)) ?? {
            error: 'Unknown error',
            message: `HTTP ${response.status}: ${response.statusText}`,
        };

        console.error('[AnamService] API Error:', {
            status: response.status,
            error: errorData.error,
            message: errorData.message
        });

        throw new Error(`[AnamService] ${errorData.error}: ${errorData.message}`);
    }

    const parsed = await safeReadJson<T>(response);
    if (parsed === null) {
        throw new Error('[AnamService] Failed to parse Anam response (too large or invalid JSON)');
    }
    return parsed;
}

// Public API Functions

/**
 * Generate a new Anam AI session token.
 *
 * Uses the documented `/v1/auth/session-token` endpoint with camelCase
 * `personaConfig` payload. Tolerates both camelCase and snake_case responses
 * to remain forward-compatible with older deployments.
 */
export async function createAnamSession(config: AnamSessionConfig): Promise<{
    success: true;
    data: AnamSessionResponse;
} | {
    success: false;
    error: string;
}> {
    if (circuitIsOpen()) {
        return { success: false, error: 'Anam service temporarily unavailable (circuit open)' };
    }
    try {
        const personaConfig: Record<string, unknown> = {
            personaId: config.persona_id,
        };
        if (config.voice_id) personaConfig.voiceId = config.voice_id;
        if (config.avatar_model) personaConfig.avatarModel = config.avatar_model;
        if (config.language) personaConfig.languageCode = config.language;
        if (config.system_prompt) personaConfig.systemPrompt = config.system_prompt;

        const response = await fetchWithRetry(`${ANAM_BASE_URL}/auth/session-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.api_key}`,
                'Content-Type': 'application/json',
            },
            timeoutMs: 30000,
            retries: 2,
            body: JSON.stringify({
                personaConfig,
                metadata: config.metadata || {},
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as Partial<AnamApiError>;
            // 5xx / 429 indicates upstream trouble; feed circuit breaker.
            if (response.status >= 500 || response.status === 429) recordCircuitFailure();
            return {
                success: false,
                error: errorData?.message || errorData?.error || `Anam API error: ${response.status}`,
            };
        }

        const raw = await response.json() as AnamSessionTokenApiResponse;
        const sessionToken = raw.sessionToken ?? raw.session_token;
        if (!sessionToken) {
            return { success: false, error: 'Anam API returned no session token' };
        }

        recordCircuitSuccess();
        return {
            success: true,
            data: {
                session_token: sessionToken,
                session_id: raw.sessionId ?? raw.session_id ?? '',
                expires_at: raw.expiresAt ?? raw.expires_at ?? '',
                ws_url: raw.wsUrl ?? raw.ws_url,
            },
        };
    } catch (error) {
        recordCircuitFailure();
        console.error('[AnamService] Unexpected error creating session:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create Anam session',
        };
    }
}

/**
 * Lists all available avatars for the authenticated account.
 */
export async function listAvatars(): Promise<AnamAvatar[]> {
    const apiKey = getAnamApiKey();

    const response = await fetchWithRetry(`${ANAM_BASE_URL}/avatars`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        },
        timeoutMs: 15000,
        retries: 1
    });

    const result = await handleAnamResponse<AnamAvatar[] | { data: AnamAvatar[] }>(response);
    return Array.isArray(result) ? result : result.data;
}

/**
 * Lists all personas created in the Anam account.
 */
export async function listPersonas(): Promise<AnamPersona[]> {
    const apiKey = getAnamApiKey();

    const response = await fetchWithRetry(`${ANAM_BASE_URL}/personas`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        },
        timeoutMs: 15000,
        retries: 1
    });

    const result = await handleAnamResponse<AnamPersona[] | { data: AnamPersona[] }>(response);
    return Array.isArray(result) ? result : result.data;
}

/**
 * Creates a new persona in the Anam account.
 */
export async function createPersona(payload: CreatePersonaPayload): Promise<AnamPersona> {
    const apiKey = getAnamApiKey();

    const response = await fetchWithRetry(`${ANAM_BASE_URL}/personas`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        timeoutMs: 30000,
        retries: 1
    });

    return handleAnamResponse<AnamPersona>(response);
}

/**
 * Lists all available voices for avatar synthesis.
 */
export async function listVoices(): Promise<AnamVoice[]> {
    const apiKey = getAnamApiKey();

    const response = await fetchWithRetry(`${ANAM_BASE_URL}/voices`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        },
        timeoutMs: 15000,
        retries: 1
    });

    const result = await handleAnamResponse<AnamVoice[] | { data: AnamVoice[] }>(response);
    return Array.isArray(result) ? result : result.data;
}

/**
 * Validates the Anam API key by making a test request.
 */
export async function validateApiKey(): Promise<boolean> {
    try {
        await listAvatars();
        return true;
    } catch (error) {
        console.error('[AnamService] API key validation failed:', error);
        return false;
    }
}

/**
 * Get avatar configuration from AI Config
 * Extracts Anam-specific settings from the account's ai_config
 */
export function getAvatarConfigFromAIConfig(aiConfig: Record<string, unknown> | null): {
    enabled: boolean;
    persona_id: string | null;
    model?: string;
    voice?: string;
    language?: string;
    custom_settings?: Record<string, unknown>;
} {
    if (!aiConfig) {
        return { enabled: false, persona_id: null };
    }

    const avatarConfig = aiConfig.avatar_config as Record<string, unknown> | undefined;

    if (!avatarConfig) {
        return { enabled: false, persona_id: null };
    }

    // Accept boolean true or common truthy string forms ('true', '1', 'yes')
    // so configs imported from systems that store the flag as a string still
    // enable the avatar correctly.
    const rawEnabled = avatarConfig.enabled;
    let enabled = false;
    if (rawEnabled === true) {
        enabled = true;
    } else if (typeof rawEnabled === 'string') {
        const v = rawEnabled.trim().toLowerCase();
        enabled = v === 'true' || v === '1' || v === 'yes';
    }

    return {
        enabled,
        persona_id: (avatarConfig.persona_id as string) || null,
        model: (avatarConfig.model as string) || undefined,
        voice: (avatarConfig.voice as string) || undefined,
        language: (avatarConfig.language as string) || undefined,
        custom_settings: (avatarConfig.settings as Record<string, unknown>) || {},
    };
}

/**
 * Validate that required Anam configuration is present
 */
export function validateAnamConfig(personaId: string | null, apiKey: string | undefined): {
    valid: boolean;
    error?: string;
} {
    if (!apiKey) {
        return { valid: false, error: 'Anam API key not configured' };
    }

    // Check for null AND empty string (after trim)
    const trimmedPersonaId = typeof personaId === 'string' ? personaId.trim() : null;
    if (!personaId || !trimmedPersonaId) {
        return { valid: false, error: 'Avatar persona ID not configured in AI settings' };
    }

    return { valid: true };
}

/**
 * Gets the default persona ID from environment variables (server-only).
 */
export function getDefaultPersonaIdOrUndefined(): string | undefined {
    return process.env.ANAM_PERSONA_ID?.trim();
}

/**
 * AVT-008: Centralized persona ID resolution logic.
 * Fallback chain: request override > account config > env default
 * Prevents inconsistency across code paths (actions.ts, webhook, bot-session).
 */
export function resolvePersonaId(
    configPersonaId: string | null | undefined,
    requestOverride?: string | null,
    envDefault?: string
): string | null {
    // Explicit request override (highest priority)
    const resolved = requestOverride?.trim() || configPersonaId?.trim() || envDefault?.trim();
    return resolved || null;
}
