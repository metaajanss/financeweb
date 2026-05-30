import { fetchWithRetry } from '@/core/http/fetch'

/**
 * Returns the current local datetime as an ISO string (no Z suffix) for the
 * given IANA timezone, using Intl.DateTimeFormat.formatToParts — the only
 * reliable way in Node.js (new Date(localeString) always gives Invalid Date).
 */
export function getLocalISOString(utcDate: Date, timezone: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        }).formatToParts(utcDate)
        const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
        const h = get('hour') === '24' ? '00' : get('hour') // midnight edge case
        return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}:${get('second')}`
    } catch {
        // fallback: shift by UTC+3 (Istanbul default)
        return new Date(utcDate.getTime() + 3 * 60 * 60000).toISOString().replace('Z', '')
    }
}

/**
 * Extract date and time from message using AI (Gemini)
 */
export async function extractDateTime(message: string, userTimezone = 'Europe/Istanbul'): Promise<string | null> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
        console.error('[extractDateTime] GEMINI_API_KEY is missing in env')
        return null
    }

    try {
        const nowUtc = new Date()
        const localNowIso = getLocalISOString(nowUtc, userTimezone)

        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 10000,
                retries: 1,
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract the meeting date and time from the message below.

CURRENT LOCAL DATE-TIME: ${localNowIso} (Timezone: ${userTimezone})

RULES:
- "yarın" = tomorrow, "bugün" = today, "öbür gün" = day after tomorrow.
- "bu akşam" = today evening.
- "saat 8" with no am/pm = usually 20:00 for business meetings.
- Convert the resolved local datetime to UTC before returning.
- Return ONLY a single ISO 8601 UTC string like: 2026-04-15T16:00:00Z
- If no date/time can be determined, return exactly: null
- DO NOT guess or invent a date. Use only information from the message and the current date above.

Message: "${message}"`
                        }]
                    }],
                    generationConfig: { maxOutputTokens: 30, temperature: 0 }
                })
            }
        )

        const data = await res.json()
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (!content || content.toLowerCase() === 'null') return null

        const isoMatch = content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?/)
        if (!isoMatch) return null

        const d = new Date(isoMatch[0])
        if (isNaN(d.getTime())) return null

        // Sanity check: must be within 1h of now (past) and 90 days in the future
        const diffMs = d.getTime() - nowUtc.getTime()
        if (diffMs < -60 * 60 * 1000 || diffMs > 90 * 24 * 60 * 60 * 1000) {
            console.warn('[extractDateTime] Rejected out-of-range date from Gemini:', isoMatch[0])
            return null
        }

        return d.toISOString()
    } catch (_e: any) {
        console.error('[extractDateTime] threw:', _e?.message)
        return null
    }
}
