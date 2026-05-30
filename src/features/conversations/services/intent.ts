import { fetchWithRetry } from '@/core/http/fetch'

export type MessageIntent = 'booking' | 'question' | 'objection' | 'general'

/**
 * Determine the intent of a user message using Gemini
 */
export async function determineIntent(message: string): Promise<MessageIntent> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
        console.error('[determineIntent] GEMINI_API_KEY is missing in env')
        return 'general'
    }

    try {
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
                            text: `Analyze the following message in ANY language and determine if it's a booking request (scheduling a meeting, call, appointment, zoom, meet, "yarın", "mañana", "morgen", etc.), a question, an objection, or general conversation.
                            Message: "${message}"
                            Return ONLY one of these strings: "booking", "question", "objection", "general".`
                        }]
                    }],
                    generationConfig: { maxOutputTokens: 10, temperature: 0 }
                })
            }
        )

        const data = await res.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? ''
        const foundIntent = (['booking', 'question', 'objection', 'general'] as MessageIntent[])
            .find(k => rawText.includes(k))
        return foundIntent ?? 'general'
    } catch {
        return 'general'
    }
}
