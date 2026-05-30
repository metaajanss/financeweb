import { NextRequest, NextResponse } from 'next/server';

// Rate limit store interface — swap implementation for Redis in production.
// If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars are present,
// the Redis store is used automatically (safe for multi-instance / Vercel).
// Otherwise falls back to in-process Map (single-instance dev only).

interface RateLimitStore {
    increment(_key: string, _windowMs: number): Promise<{ count: number }>;
}

// ── In-memory store (dev / single-instance fallback) ──────────────────
const MAX_KEYS = 10_000;

interface Entry { count: number; expiresAt: number }
const _map = new Map<string, Entry>();

const inMemoryStore: RateLimitStore = {
    async increment(key, windowMs) {
        const now = Date.now();

        // Evict expired entries periodically to prevent unbounded growth
        if (_map.size >= MAX_KEYS) {
            for (const [k, v] of _map) {
                if (v.expiresAt <= now) _map.delete(k);
                if (_map.size < MAX_KEYS) break;
            }
        }

        const entry = _map.get(key);
        if (!entry || entry.expiresAt <= now) {
            _map.set(key, { count: 1, expiresAt: now + windowMs });
            return { count: 1 };
        }

        entry.count += 1;
        return { count: entry.count };
    },
};

// ── Redis store (Upstash — production / multi-instance) ────────────────
// Uses Upstash REST API directly so we don't need to install @upstash/redis.
function buildRedisStore(url: string, token: string): RateLimitStore {
    return {
        async increment(key, windowMs) {
            const windowSec = Math.ceil(windowMs / 1000);
            // MULTI/EXEC pipeline: INCR + EXPIRE in one HTTP round-trip
            const res = await fetch(`${url}/pipeline`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    ['INCR', `rl:${key}`],
                    ['EXPIRE', `rl:${key}`, windowSec, 'NX'],
                ]),
            });

            if (!res.ok) {
                // If Redis is unavailable, fail open (allow the request)
                return { count: 0 };
            }

            const data = (await res.json()) as [{ result: number }, unknown];
            return { count: data[0]?.result ?? 0 };
        },
    };
}

function resolveStore(): RateLimitStore {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) return buildRedisStore(url, token);
    return inMemoryStore;
}

// Lazily resolved once per process
let _store: RateLimitStore | null = null;
function getStore(): RateLimitStore {
    if (!_store) _store = resolveStore();
    return _store;
}

// ── Public API ─────────────────────────────────────────────────────────

export async function rateLimit(key: string, limit: number, windowMs: number) {
    const { count } = await getStore().increment(key, windowMs);
    const remaining = Math.max(0, limit - count);
    return { isAllowed: count <= limit, remaining };
}

export async function handleRateLimit(
    request: NextRequest,
    limit: number = 10,
    windowMs: number = 60_000,
    keyPrefix: string = 'ip',
) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const key = `${keyPrefix}:${ip}`;
    const { isAllowed, remaining: _remaining } = await rateLimit(key, limit, windowMs);

    if (!isAllowed) {
        return NextResponse.json(
            { error: 'Too many requests' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'Retry-After': Math.ceil(windowMs / 1000).toString(),
                },
            },
        );
    }

    return null;
}
