import { fetchWithRetry } from '@/core/http/fetch'
import type { FAQItem, AIContext, MeetingResult } from '../types'

export type { FAQItem, AIContext, MeetingResult }

/**
 * Core function to generate AI response via Google Gemini HTTP API
 */
export async function generateCoreResponse({
    systemPrompt,
    messages,
    model = 'gemini-flash-latest',
    temperature = 0.7,
    maxTokens = 1000
}: {
    systemPrompt?: string,
    messages: Array<{ role: 'user' | 'model', parts: [{ text: string }] }>,
    model?: string,
    temperature?: number,
    maxTokens?: number
}): Promise<{ response: string, error?: string }> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
        console.error('[generateCoreResponse] GEMINI_API_KEY is missing in env')
        return { response: '', error: 'Gemini API key not configured' }
    }

    try {
        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 15000,
                retries: 3,
                retryDelayMs: 500,
                retryOnStatuses: [408, 429, 500, 502, 503, 504],
                body: JSON.stringify({
                    ...(systemPrompt && { systemInstruction: { parts: [{ text: systemPrompt }] } }),
                    contents: messages,
                    generationConfig: { maxOutputTokens: maxTokens, temperature }
                })
            }
        )

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            return { response: '', error: `Gemini API error ${res.status}: ${errData.error?.message || res.statusText}` }
        }

        const data = await res.json()
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return { response: aiResponse }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return { response: '', error: message }
    }
}

/**
 * Generate AI response using Google Gemini API (Legacy wrapper for Sales Flow)
 */
export async function generateResponse(context: AIContext, meetingResult?: MeetingResult): Promise<{ response: string, error?: string }> {
    const {
        brand_voice = 'professional',
        knowledge_base,
        qualification_questions,
        persona_name,
        persona_intro,
        forbidden_topics,
        mandatory_rules,
        faq_items,
    } = context.aiConfig || {}

    // Build persona identity
    const agentName = persona_name?.trim() || 'AI Assistant'
    const identityLine = persona_intro?.trim()
        ? `Your name is ${agentName}. ${persona_intro}`
        : `Your name is ${agentName}.`

    // Build meeting context so AI knows the outcome before responding
    let meetingContext = ''
    if (meetingResult?.created && meetingResult.hangoutLink) {
        meetingContext = `[SYSTEM_EVENT: MEETING_BOOKED]
A meeting has been SUCCESSFULLY created at ${meetingResult.startTime}.
Google Meet link: ${meetingResult.hangoutLink}.
ACTION: Confirm the meeting naturally and share the link.`
    } else if (meetingResult?.created && !meetingResult.hangoutLink) {
        meetingContext = `[SYSTEM_EVENT: MEETING_BOOKED]
A meeting has been SUCCESSFULLY scheduled at ${meetingResult.startTime}.
There is no video link.
ACTION: Confirm the meeting naturally.`
    } else if (meetingResult?.busy) {
        meetingContext = `[SYSTEM_EVENT: CALENDAR_BUSY]
The requested time slot is busy.
ACTION: Apologize and ask for an alternative time.`
    } else if (meetingResult && !meetingResult.created) {
        meetingContext = `[SYSTEM_EVENT: BOOKING_FAILED]
The meeting could NOT be created (likely unclear date/time).
ACTION: Ask the user to provide a more specific date and time.`
    }

    // Working hours context
    let workingHoursContext = ''
    if (context.workingHours?.start && context.workingHours?.end) {
        workingHoursContext = `\n<WORKING_HOURS>
Our working hours are ${context.workingHours.start} – ${context.workingHours.end}.
Only propose slots within these hours. Polite rejection if outside.
</WORKING_HOURS>`
    }

    const bookingCapability = `\n<CAPABILITY_BOOKING>
You CAN book meetings. Confirm requests; system handles calendar.
Ask for email if unknown (Current Lead Email: ${context.leadEmail || 'Unknown'}).
</CAPABILITY_BOOKING>`

    const qualSection = qualification_questions && qualification_questions.length > 0
        ? `\n<QUALIFICATION_STEPS>
Ask these naturally ONE AT A TIME during conversation:
${qualification_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
</QUALIFICATION_STEPS>`
        : ''

    const forbiddenBlock = forbidden_topics && forbidden_topics.length > 0
        ? `\n<STRICT_FORBIDDEN_TOPICS>
NEVER discuss or answer questions about these:
${forbidden_topics.map(t => `- ${t}`).join('\n')}
If asked, politely decline and steer back to company goals.
</STRICT_FORBIDDEN_TOPICS>`
        : ''

    const mandatoryBlock = mandatory_rules && mandatory_rules.length > 0
        ? `\n<MANDATORY_OPERATIONAL_RULES>
You MUST follow these rules in every response:
${mandatory_rules.map(r => `- ${r}`).join('\n')}
</MANDATORY_OPERATIONAL_RULES>`
        : ''

    const faqBlock = faq_items && faq_items.length > 0
        ? `\n<KNOWLEDGE_FAQ>
Use these verified Q&A pairs for specific queries:
${faq_items.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
</KNOWLEDGE_FAQ>`
        : ''

    const fallbackAction = context.aiConfig?.fallback_action
    const fallbackInstruction = fallbackAction && fallbackAction !== 'none'
        ? `\n<FALLBACK_PROTOCOL>
If information is missing, append exactly [NEEDS_HUMAN] at the very end of your reply.
</FALLBACK_PROTOCOL>`
        : ''

    const baseIdentity = `<IDENTITY>
You are an AI assistant for ${context.companyInfo || 'our company'}.
${identityLine}
Tone: ${brand_voice}.
</IDENTITY>`

    const leadLangCode = context.leadLanguage || 'en';

    const coreInstructions = `
<CORE_INSTRUCTIONS>
- Help qualify leads, answer questions, and book meetings.
- Be concise (under 150 words).
- IMPORTANT: The primary language of this lead is '${leadLangCode}'. You MUST always generate your response in this language.
- If a meeting event occurred, address it first using the [SYSTEM_EVENT] context.
</CORE_INSTRUCTIONS>`

    const systemPrompt = `${baseIdentity}${coreInstructions}${bookingCapability}${qualSection}${forbiddenBlock}${mandatoryBlock}${faqBlock}${fallbackInstruction}${workingHoursContext}${meetingContext ? `\n\n${meetingContext}` : ''}${knowledge_base ? `\n\n<KNOWLEDGE_BASE>\n${knowledge_base}\n</KNOWLEDGE_BASE>` : ''}`

    const messages: Array<{ role: 'user' | 'model', parts: [{ text: string }] }> = context.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: msg.content }]
    }))

    return generateCoreResponse({
        systemPrompt,
        messages,
        temperature: 0.7,
        maxTokens: 1000
    })
}
