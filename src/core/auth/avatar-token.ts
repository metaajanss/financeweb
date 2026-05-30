/**
 * Signed tokens that allow the Recall.ai bot's headless browser to authenticate
 * to /avatar-renderer and /api/avatar/bot-session without a Supabase user
 * cookie. The token is a base64url-encoded payload + HMAC SHA-256 signature.
 *
 * Secret resolution order:
 *   1. AVATAR_TOKEN_SECRET (preferred — independent rotation)
 *   2. RECALL_WEBHOOK_SECRET (acceptable but ties two systems)
 *
 * SUPABASE_SERVICE_ROLE_KEY is intentionally NOT a fallback: that key carries
 * full RLS bypass authority, and reusing it as a token secret means any leaked
 * avatar token would be equivalent to leaking the master key.
 */

export interface AvatarTokenPayload {
    account_id: string;
    meeting_id: string;
    /** Unix seconds */
    exp: number;
    /** Optional Anam persona override */
    persona_id?: string;
}

function getSecret(): string {
    const dedicated = process.env.AVATAR_TOKEN_SECRET?.trim();
    const webhook = process.env.RECALL_WEBHOOK_SECRET?.trim();

    if (dedicated) return dedicated;
    if (webhook) {
        console.warn('[avatar-token] Using RECALL_WEBHOOK_SECRET. Consider setting AVATAR_TOKEN_SECRET for independent rotation.');
        return webhook;
    }

    throw new Error('[avatar-token] No signing secret configured. Set AVATAR_TOKEN_SECRET or RECALL_WEBHOOK_SECRET.');
}

function b64url(buf: Uint8Array | string): string {
    let str = "";
    if (typeof buf === 'string') {
        const bytes = new TextEncoder().encode(buf);
        for (let i = 0; i < bytes.length; i++) {
            str += String.fromCharCode(bytes[i]);
        }
    } else {
        for (let i = 0; i < buf.length; i++) {
            str += String.fromCharCode(buf[i]);
        }
    }
    return btoa(str).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Uint8Array {
    let base64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    base64 += pad;
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

export async function signAvatarToken(payload: Omit<AvatarTokenPayload, 'exp'> & { ttlSeconds?: number }): Promise<string> {
    // 2 hours — covers a long meeting + SSE reconnects but limits the replay
    // window if the token leaks via URL/proxy/log (it travels as a ?token=
    // query string for the SSE stream).
    const ttl = payload.ttlSeconds ?? 60 * 60 * 2;
    const body: AvatarTokenPayload = {
        account_id: payload.account_id,
        meeting_id: payload.meeting_id,
        exp: Math.floor(Date.now() / 1000) + ttl,
        ...(payload.persona_id ? { persona_id: payload.persona_id } : {}),
    };
    const encoded = b64url(JSON.stringify(body));

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
    const sig = b64url(new Uint8Array(signatureBuffer));

    return `${encoded}.${sig}`;
}

export async function verifyAvatarToken(token: string | null | undefined): Promise<AvatarTokenPayload | null> {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;

    let key: CryptoKey;
    try {
        const encoder = new TextEncoder();
        key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(getSecret()),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
    } catch {
        return null;
    }

    const signatureBuffer = b64urlDecode(sig);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(encoded);

    try {
        const isValid = await crypto.subtle.verify('HMAC', key, signatureBuffer as unknown as BufferSource, dataBuffer as unknown as BufferSource);
        if (!isValid) return null;
    } catch {
        return null;
    }

    let payload: AvatarTokenPayload;
    try {
        const decodedBytes = b64urlDecode(encoded);
        const parsed = JSON.parse(new TextDecoder().decode(decodedBytes));
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.account_id !== 'string' || !parsed.account_id.trim()) return null;
        if (typeof parsed.meeting_id !== 'string' || !parsed.meeting_id.trim()) return null;
        if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return null;
        if (parsed.persona_id !== undefined && typeof parsed.persona_id !== 'string') return null;
        payload = parsed as AvatarTokenPayload;
    } catch {
        return null;
    }

    // Allow 30-second clock skew tolerance for distributed systems
    const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000;
    if (payload.exp * 1000 < Date.now() - CLOCK_SKEW_TOLERANCE_MS) return null;
    return payload;
}
