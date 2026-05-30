import { fetchWithRetry } from '@/core/http/fetch'

export type Sentiment = 'negative' | 'neutral' | 'positive'

/**
 * Detect sentiment of a lead message. Returns 'negative' for angry/frustrated messages.
 */
export async function detectSentiment(message: string): Promise<Sentiment> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) return 'neutral'

    try {
        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 8000,
                retries: 1,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Classify the sentiment of this message in any language. Return ONLY one word: "negative", "neutral", or "positive". Negative includes: anger, frustration, complaints, threats (şikayet, dava, avukat, sinirli, kızgın, complaint, lawsuit, angry, frustrated, unacceptable). Message: "${message}"` }] }],
                    generationConfig: { maxOutputTokens: 5, temperature: 0 }
                })
            }
        )
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? ''
        if (text.includes('negative')) return 'negative'
        if (text.includes('positive')) return 'positive'
        return 'neutral'
    } catch {
        return 'neutral'
    }
}
