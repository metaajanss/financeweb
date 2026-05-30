import { EventEmitter } from 'events'
import type { PresentationBusEvent } from '@/shared/types/presentation'

/**
 * Presentation Event Bus
 *
 * The Recall webhook publishes events here when transcript chunks arrive;
 * SSE handlers (one per active avatar renderer) subscribe and stream events
 * down to the bot's headless browser.
 *
 * Supports two backends:
 * 1. In-memory (single Node.js process) — used by default
 * 2. Redis (multi-instance deployments) — enabled via REDIS_URL env var
 *
 * For multi-instance deployments, set REDIS_URL environment variable.
 * Example: redis://localhost:6379 or rediss://user:pass@host:port
 */

interface IBus {
    publish(event: PresentationBusEvent): void
    subscribe(meetingId: string, listener: (event: PresentationBusEvent) => void): () => void
    /** Active subscriber count (total across meetings). */
    activeSubscriberCount(): number
    /** Per-meeting subscriber snapshot for ops dashboards. */
    subscribersByMeeting(): Record<string, number>
}

/**
 * In-memory implementation (single-instance mode).
 * Suitable for dev/testing and single-server deployments.
 */
class MemoryBus extends EventEmitter implements IBus {
    private readonly meetingSubscriberCounts = new Map<string, number>()

    constructor() {
        super()
        const raw = process.env.PRESENTATION_BUS_MAX_LISTENERS
        const parsed = raw !== undefined ? parseInt(raw, 10) : NaN
        const maxListeners = Number.isInteger(parsed) && parsed > 0 ? parsed : 1000
        this.setMaxListeners(maxListeners)
    }

    publish(event: PresentationBusEvent) {
        try {
            this.emit(`meeting:${event.meeting_id}`, event)
        } catch (err) {
            console.error('[PresentationBus] listener threw on meeting event:', err)
        }
    }

    subscribe(meetingId: string, listener: (event: PresentationBusEvent) => void) {
        const safe = (event: PresentationBusEvent) => {
            try {
                listener(event)
            } catch (err) {
                console.error('[PresentationBus] subscriber error for', meetingId, err)
            }
        }
        this.on(`meeting:${meetingId}`, safe)
        this.meetingSubscriberCounts.set(meetingId, (this.meetingSubscriberCounts.get(meetingId) || 0) + 1)
        return () => {
            this.off(`meeting:${meetingId}`, safe)
            const next = (this.meetingSubscriberCounts.get(meetingId) || 1) - 1
            if (next <= 0) this.meetingSubscriberCounts.delete(meetingId)
            else this.meetingSubscriberCounts.set(meetingId, next)
        }
    }

    activeSubscriberCount(): number {
        let total = 0
        for (const v of this.meetingSubscriberCounts.values()) total += v
        return total
    }

    subscribersByMeeting(): Record<string, number> {
        return Object.fromEntries(this.meetingSubscriberCounts.entries())
    }
}

/**
 * Redis-backed implementation (multi-instance mode).
 *
 * Wraps an inner MemoryBus so that:
 *  - Local subscribers are always reachable, even before Redis is ready
 *  - If Redis init fails or the connection drops, publishes degrade gracefully
 *    to in-process delivery instead of silently disappearing
 *  - When Redis is healthy, cross-process events arrive via the inner bus too
 */
class RedisBus implements IBus {
    private pub: any = null
    private sub: any = null
    private ready = false
    private readonly local = new MemoryBus()

    constructor(redisUrl: string) {
        this.initialize(redisUrl).catch((err) => {
            console.error('[RedisBus] Initialization failed; falling back to in-memory delivery for this process:', err)
            this.ready = false
            this.pub = null
            this.sub = null
        })
    }

    private async initialize(redisUrl: string) {
        const { createClient } = await (import('redis') as any)
        const pub = createClient({ url: redisUrl })
        const sub = createClient({ url: redisUrl })

        pub.on('error', (err: unknown) => console.error('[RedisBus] pub error:', err))
        sub.on('error', (err: unknown) => console.error('[RedisBus] sub error:', err))

        await pub.connect()
        await sub.connect()

        await sub.subscribe('presentation:events', (message: string) => {
            try {
                const event = JSON.parse(message) as PresentationBusEvent
                // Re-emit cross-process events through the local bus so all
                // local subscribers (and the per-meeting fan-out) see them.
                this.local.publish(event)
            } catch (err) {
                console.error('[RedisBus] Failed to process message:', err)
            }
        })

        this.pub = pub
        this.sub = sub
        this.ready = true
        console.log('[RedisBus] Connected and ready')
    }

    publish(event: PresentationBusEvent) {
        if (!this.ready || !this.pub) {
            // Redis not ready (init pending or failed) — deliver locally so
            // this process's subscribers still get the event.
            this.local.publish(event)
            return
        }

        let serialized: string
        try {
            serialized = JSON.stringify(event)
        } catch (err) {
            // AVT-006: Log serialization failure with event details for debugging
            console.error('[RedisBus] JSON serialization failed', {
                event_type: event.type,
                meeting_id: event.meeting_id,
                error: err instanceof Error ? err.message : String(err),
            })
            this.local.publish(event)
            return
        }

        // node-redis v4+ returns a Promise here. Always await via .then/.catch
        // — the previous duck-typing on .catch was unreliable for callers that
        // had monkey-patched the client. Local-fallback dispatch happens
        // immediately so a Redis hang doesn't delay in-process subscribers.
        Promise.resolve(this.pub.publish('presentation:events', serialized)).catch((err: unknown) => {
            console.error('[RedisBus] Redis publish failed, falling back to local delivery', {
                error: err instanceof Error ? err.message : String(err),
                event_type: event.type,
                meeting_id: event.meeting_id,
            })
            this.local.publish(event)
        })
    }

    subscribe(meetingId: string, listener: (event: PresentationBusEvent) => void) {
        return this.local.subscribe(meetingId, listener)
    }

    activeSubscriberCount(): number {
        return this.local.activeSubscriberCount()
    }

    subscribersByMeeting(): Record<string, number> {
        return this.local.subscribersByMeeting()
    }
}

function createBus(): IBus {
    const redisUrl = process.env.REDIS_URL?.trim()

    if (redisUrl) {
        console.log('[PresentationBus] Using Redis backend (multi-instance mode)')
        try {
            return new RedisBus(redisUrl)
        } catch (err) {
            console.error('[PresentationBus] Redis initialization failed, falling back to memory:', err)
        }
    }

    console.log('[PresentationBus] Using in-memory backend (single-instance mode)')
    return new MemoryBus()
}

// Use globalThis to survive Next.js dev server hot reloads.
declare global {
    var __presentationBus: IBus | undefined
}

export const presentationBus: IBus = (() => {
    if (globalThis.__presentationBus) {
        return globalThis.__presentationBus
    }
    const bus = createBus()
    globalThis.__presentationBus = bus
    return bus
})()
