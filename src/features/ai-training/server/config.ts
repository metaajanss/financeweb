'use server'

import { createClient } from '@/core/db/server'
import { revalidatePath } from 'next/cache'

import {
    type FAQItem,
    type AIConfig,
    type AIStats,
    type UnansweredQuestion,
    type KBFile,
    DEFAULT_NURTURE_CONFIG
} from '@/shared/types/ai-config'

type AIPageData = {
    config: AIConfig | null
    stats: AIStats | null
    unansweredQuestions: UnansweredQuestion[]
}

/**
 * Fetch all AI training page data in a single round-trip (1 auth + 1 profile query shared)
 */
export async function getAIPageData(): Promise<AIPageData> {
    try {
        const supabase = await createClient()

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return { config: null, stats: null, unansweredQuestions: [] }

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return { config: null, stats: null, unansweredQuestions: [] }

        const accountId = profile.account_id
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const since = thirtyDaysAgo.toISOString()

        const [
            { data: account },
            { count: responses30d },
            { count: meetings30d },
            { data: unansweredRows },
        ] = await Promise.all([
            supabase.from('accounts').select('ai_config').eq('id', accountId).single(),
            supabase.from('event_logs').select('*', { count: 'exact', head: true })
                .eq('account_id', accountId).eq('event_type', 'ai.response.generated').gte('created_at', since),
            supabase.from('event_logs').select('*', { count: 'exact', head: true })
                .eq('account_id', accountId).eq('event_type', 'meeting.booked').gte('created_at', since),
            supabase.from('event_logs').select('id, data, created_at')
                .eq('account_id', accountId).eq('event_type', 'ai.needs_human')
                .gte('created_at', since).order('created_at', { ascending: false }).limit(50),
        ])

        const currentConfig = account?.ai_config as Partial<AIConfig> || {}
        const config: AIConfig = {
            brand_voice: currentConfig.brand_voice || 'professional',
            knowledge_base: currentConfig.knowledge_base || '',
            qualification_questions: currentConfig.qualification_questions || [],
            auto_response_enabled: currentConfig.auto_response_enabled ?? true,
            response_delay_seconds: currentConfig.response_delay_seconds || 0,
            fallback_action: currentConfig.fallback_action || 'none',
            fallback_message: currentConfig.fallback_message || '',
            persona_name: currentConfig.persona_name || '',
            persona_intro: currentConfig.persona_intro || '',
            forbidden_topics: currentConfig.forbidden_topics || [],
            mandatory_rules: currentConfig.mandatory_rules || [],
            faq_items: currentConfig.faq_items || [],
            nurture_config: currentConfig.nurture_config || DEFAULT_NURTURE_CONFIG,
            kb_files: (currentConfig.kb_files as KBFile[]) || [],
            avatar_config: currentConfig.avatar_config,
        }

        const r = responses30d || 0
        const m = meetings30d || 0
        const stats: AIStats = {
            responses30d: r,
            meetings30d: m,
            bookingRate: r > 0 ? Math.round((m / r) * 100) : 0,
        }

        const unansweredQuestions: UnansweredQuestion[] = (unansweredRows || []).map((row: any) => ({
            id: row.id,
            question: row.data?.question || '',
            lead_name: row.data?.lead_name || 'Unknown',
            created_at: row.created_at,
            added_to_kb: row.data?.added_to_kb || false,
        }))

        return { config, stats, unansweredQuestions }
    } catch (error) {
        console.error('getAIPageData error:', error)
        return { config: null, stats: null, unansweredQuestions: [] }
    }
}

/**
 * Get AI configuration for current account
 */
export async function getAIConfig(): Promise<AIConfig | null> {
    try {
        const supabase = await createClient()

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return null

        const { data: account } = await supabase
            .from('accounts')
            .select('ai_config')
            .eq('id', profile.account_id)
            .single()

        const currentConfig = account?.ai_config as Partial<AIConfig> || {}

        return {
            brand_voice: currentConfig.brand_voice || 'professional',
            knowledge_base: currentConfig.knowledge_base || '',
            qualification_questions: currentConfig.qualification_questions || [],
            auto_response_enabled: currentConfig.auto_response_enabled ?? true,
            response_delay_seconds: currentConfig.response_delay_seconds || 0,
            fallback_action: currentConfig.fallback_action || 'none',
            fallback_message: currentConfig.fallback_message || '',
            persona_name: currentConfig.persona_name || '',
            persona_intro: currentConfig.persona_intro || '',
            forbidden_topics: currentConfig.forbidden_topics || [],
            mandatory_rules: currentConfig.mandatory_rules || [],
            faq_items: currentConfig.faq_items || [],
            nurture_config: currentConfig.nurture_config || DEFAULT_NURTURE_CONFIG,
            kb_files: (currentConfig.kb_files as KBFile[]) || [],
            avatar_config: currentConfig.avatar_config,
        }
    } catch (error) {
        console.error('getAIConfig error:', error);
        return null;
    }
}

/**
 * Update AI configuration
 */
export async function updateAIConfig(config: Partial<AIConfig>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    // Get current config
    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', profile.account_id)
        .single()

    const currentConfig = account?.ai_config || {}
    const updatedConfig = { ...(currentConfig as Record<string, unknown>), ...config }

    const { error } = await supabase
        .from('accounts')
        .update({ ai_config: updatedConfig })
        .eq('id', profile.account_id)

    if (error) {
        return { error: error.message }
    }

    // Social media content library'yi async olarak güncelle (fire-and-forget)
    try {
        const { syncAIConfigToContentLibrary } = await import('@/features/social-media/services/context-sync')
        syncAIConfigToContentLibrary(
            updatedConfig as any,
            currentConfig as any,
        ).catch(() => {})
    } catch {
        // sync hatası ana flow'u etkilemesin
    }

    revalidatePath('/admin/ai-training')
    return { success: true }
}

/**
 * Get AI performance stats for the last 30 days
 */
export async function getAIStats(): Promise<AIStats | null> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return null

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const since = thirtyDaysAgo.toISOString()

        const [{ count: responses30d }, { count: meetings30d }] = await Promise.all([
            supabase
                .from('event_logs')
                .select('*', { count: 'exact', head: true })
                .eq('account_id', profile.account_id)
                .eq('event_type', 'ai.response.generated')
                .gte('created_at', since),
            supabase
                .from('event_logs')
                .select('*', { count: 'exact', head: true })
                .eq('account_id', profile.account_id)
                .eq('event_type', 'meeting.booked')
                .gte('created_at', since),
        ])

        const r = responses30d || 0
        const m = meetings30d || 0

        return {
            responses30d: r,
            meetings30d: m,
            bookingRate: r > 0 ? Math.round((m / r) * 100) : 0,
        }
    } catch (error) {
        console.error('getAIStats error:', error)
        return null
    }
}

/**
 * Get unanswered questions (flagged with [NEEDS_HUMAN]) from event_logs
 */
export async function getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return []

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data } = await supabase
            .from('event_logs')
            .select('id, data, created_at')
            .eq('account_id', profile.account_id)
            .eq('event_type', 'ai.needs_human')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(50)

        return (data || []).map((row: any) => ({
            id: row.id,
            question: row.data?.question || '',
            lead_name: row.data?.lead_name || 'Unknown',
            created_at: row.created_at,
            added_to_kb: row.data?.added_to_kb || false,
        }))
    } catch (error) {
        console.error('getUnansweredQuestions error:', error)
        return []
    }
}

/**
 * Add an unanswered question to the knowledge base
 */
export async function addQuestionToKnowledgeBase(questionId: string, question: string, answer: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    // Fetch current config
    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', profile.account_id)
        .single()

    const currentConfig = (account?.ai_config as any) || {}
    const faqItems: FAQItem[] = currentConfig.faq_items || []

    // Append new FAQ item
    faqItems.push({ question, answer })

    const updatedConfig = { ...currentConfig, faq_items: faqItems }

    await supabase
        .from('accounts')
        .update({ ai_config: updatedConfig })
        .eq('id', profile.account_id)

    // Mark the event log entry as added_to_kb
    await supabase
        .from('event_logs')
        .update({ data: { added_to_kb: true, question } } as any)
        .eq('id', questionId)

    revalidatePath('/admin/ai-training')
    return { success: true }
}

/**
 * Submit feedback for an AI message (thumbs up/down)
 */
export async function submitMessageFeedback(messageId: string, feedback: 'positive' | 'negative', correction?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    // Update message metadata with feedback
    const { data: msg } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', messageId)
        .single()

    const currentMeta = (msg?.metadata as any) || {}
    await supabase
        .from('messages')
        .update({ metadata: { ...currentMeta, feedback, feedback_correction: correction || null } } as any)
        .eq('id', messageId)

    // Log positive feedback to knowledge base as example
    if (feedback === 'positive') {
        await supabase.from('event_logs').insert({
            account_id: profile.account_id,
            event_type: 'ai.feedback.positive',
            entity_type: 'message',
            entity_id: messageId,
            data: { message_id: messageId } as any,
        })
    } else if (feedback === 'negative' && correction) {
        // Fetch current message and its conversation to find the question
        const { data: currentMsg } = await supabase
            .from('messages')
            .select('conversation_id, created_at')
            .eq('id', messageId)
            .single()

        if (currentMsg) {
            // Find the last message from the lead before this AI message
            const { data: previousMsgs } = await supabase
                .from('messages')
                .select('content')
                .eq('conversation_id', currentMsg.conversation_id)
                .eq('sender_type', 'lead')
                .lt('created_at', currentMsg.created_at)
                .order('created_at', { ascending: false })
                .limit(1)

            const question = previousMsgs?.[0]?.content || '[Correction from feedback]'
            
            // Store negative feedback + correction for training
            const { data: account } = await supabase
                .from('accounts')
                .select('ai_config')
                .eq('id', profile.account_id)
                .single()

            const currentConfig = (account?.ai_config as any) || {}
            const faqItems: FAQItem[] = currentConfig.faq_items || []

            // Prevent exact duplicates
            const isDuplicate = faqItems.some(f => 
                f.question.toLowerCase() === question.toLowerCase() && 
                f.answer.toLowerCase() === correction.toLowerCase()
            )

            if (!isDuplicate) {
                faqItems.push({ question, answer: correction })
                await supabase
                    .from('accounts')
                    .update({ ai_config: { ...currentConfig, faq_items: faqItems } })
                    .eq('id', profile.account_id)
            }
        }
    }

    revalidatePath('/admin/conversations')
    return { success: true }
}

/**
 * Test AI response with sample message, supporting multi-turn conversation history
 */
export async function testAIResponse(
    message: string,
    testConfig?: Partial<AIConfig>,
    history?: Array<{ role: 'user' | 'assistant', content: string }>
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const config = await getAIConfig()
    if (!config) return { error: 'No AI config found' }

    const { generateResponse } = await import('@/features/conversations/services')

    const conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [
        ...(history || []),
        { role: 'user', content: message },
    ]

    // Combine manual knowledge base text with enabled file extractions
    const manualKB = testConfig?.knowledge_base || config.knowledge_base
    const fileTexts = (config.kb_files ?? [])
        .filter(f => f.enabled && f.extracted_text)
        .map(f => `=== ${f.name} ===\n${f.extracted_text}`)
        .join('\n\n')
    const combinedKB = [manualKB, fileTexts].filter(Boolean).join('\n\n')

    const { response, error: aiError } = await generateResponse({
        leadName: 'Test User',
        leadEmail: 'test@example.com',
        conversationHistory,
        companyInfo: 'Your Company',
        aiConfig: {
            brand_voice: testConfig?.brand_voice || config.brand_voice,
            knowledge_base: combinedKB,
            qualification_questions: testConfig?.qualification_questions || config.qualification_questions,
            persona_name: testConfig?.persona_name || config.persona_name,
            persona_intro: testConfig?.persona_intro || config.persona_intro,
            forbidden_topics: testConfig?.forbidden_topics || config.forbidden_topics,
            mandatory_rules: testConfig?.mandatory_rules || config.mandatory_rules,
            faq_items: testConfig?.faq_items || config.faq_items,
        }
    })

    if (aiError) {
        return { error: aiError }
    }

    return { response }
}

/**
 * Apply an industry template to the AI config
 */
export async function applyIndustryTemplate(template: {
    knowledge_base: string
    qualification_questions: string[]
    brand_voice: string
    faq_items: FAQItem[]
    forbidden_topics: string[]
    mandatory_rules: string[]
}) {
    return updateAIConfig(template)
}

// ─── Knowledge Base File Actions ────────────────────────────────────────────

const KB_MAX_FILES = 10
const KB_MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const KB_MAX_TEXT_CHARS = 80_000           // max extracted chars per file
const KB_ALLOWED_TYPES = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const KB_ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx']

async function getAccountId(supabase: Awaited<ReturnType<typeof import('@/core/db/server')['createClient']>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()
    return profile?.account_id ?? null
}

async function getKBFiles(supabase: Awaited<ReturnType<typeof import('@/core/db/server')['createClient']>>, accountId: string): Promise<KBFile[]> {
    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', accountId)
        .single()
    return ((account?.ai_config as Record<string, unknown>)?.kb_files as KBFile[]) ?? []
}

async function saveKBFiles(supabase: Awaited<ReturnType<typeof import('@/core/db/server')['createClient']>>, accountId: string, files: KBFile[]) {
    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', accountId)
        .single()
    const currentConfig = (account?.ai_config as Record<string, unknown>) ?? {}
    await supabase
        .from('accounts')
        .update({ ai_config: { ...currentConfig, kb_files: files } })
        .eq('id', accountId)
}

/**
 * Upload a file to the knowledge base (PDF, TXT, MD, DOCX)
 * Limits: 10 files max · 10 MB per file
 */
export async function uploadKnowledgeBaseFile(formData: FormData): Promise<{ success: true; file: KBFile } | { error: string }> {
    const supabase = await createClient()
    const accountId = await getAccountId(supabase)
    if (!accountId) return { error: 'Unauthorized' }

    const file = formData.get('file') as File | null
    if (!file) return { error: 'Dosya bulunamadı' }

    if (file.size > KB_MAX_FILE_BYTES)
        return { error: `Dosya çok büyük. Maksimum ${KB_MAX_FILE_BYTES / 1024 / 1024} MB izinli.` }

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!KB_ALLOWED_TYPES.includes(file.type) && !KB_ALLOWED_EXTENSIONS.includes(ext))
        return { error: 'Desteklenmeyen dosya türü. PDF, TXT, MD veya DOCX yükleyin.' }

    const existingFiles = await getKBFiles(supabase, accountId)
    if (existingFiles.length >= KB_MAX_FILES)
        return { error: `Maksimum ${KB_MAX_FILES} dosya yüklenebilir. Önce bir dosyayı silin.` }

    // Extract text content
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''
    const isPdf = file.type === 'application/pdf' || ext === '.pdf'
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx'
    try {
        if (isPdf) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require('pdf-parse')
            const parsed = await pdfParse(buffer)
            extractedText = (parsed.text as string).substring(0, KB_MAX_TEXT_CHARS)
        } else if (isDocx) {
            const mammoth = await import('mammoth')
            const result = await mammoth.extractRawText({ buffer })
            extractedText = result.value.substring(0, KB_MAX_TEXT_CHARS)
        } else {
            extractedText = buffer.toString('utf-8').substring(0, KB_MAX_TEXT_CHARS)
        }
    } catch (e) {
        console.error('KB file text extraction error:', e)
        // Continue with empty text rather than failing the upload
    }

    // Upload file bytes to storage
    const fileId = crypto.randomUUID()
    const storageExt = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${accountId}/${fileId}.${storageExt}`

    const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (storageError) return { error: storageError.message }

    const newFile: KBFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        path: storagePath,
        uploaded_at: new Date().toISOString(),
        enabled: true,
        extracted_text: extractedText,
        char_count: extractedText.length,
    }

    await saveKBFiles(supabase, accountId, [...existingFiles, newFile])
    revalidatePath('/admin/ai-training')
    return { success: true, file: newFile }
}

/**
 * Delete a knowledge base file from storage and metadata
 */
export async function deleteKnowledgeBaseFile(fileId: string): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient()
    const accountId = await getAccountId(supabase)
    if (!accountId) return { error: 'Unauthorized' }

    const files = await getKBFiles(supabase, accountId)
    const target = files.find(f => f.id === fileId)
    if (!target) return { error: 'Dosya bulunamadı' }

    const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .remove([target.path])

    if (storageError) return { error: storageError.message }

    await saveKBFiles(supabase, accountId, files.filter(f => f.id !== fileId))
    revalidatePath('/admin/ai-training')
    return { success: true }
}

/**
 * Fetch personas from Anam AI account
 */
export async function getAnamPersonas(): Promise<{ personas: import('@/features/avatar/services/anam').AnamPersona[] } | { error: string }> {
    try {
        const { listPersonas } = await import('@/features/avatar/services/anam')
        const personas = await listPersonas()
        return { personas }
    } catch (error) {
        console.error('getAnamPersonas error:', error)
        return { error: error instanceof Error ? error.message : 'Personalar yüklenemedi' }
    }
}

/**
 * Fetch available avatars from Anam AI account
 */
export async function getAnamAvatars(): Promise<{ avatars: import('@/features/avatar/services/anam').AnamAvatar[] } | { error: string }> {
    try {
        const { listAvatars } = await import('@/features/avatar/services/anam')
        const avatars = await listAvatars()
        return { avatars }
    } catch (error) {
        console.error('getAnamAvatars error:', error)
        return { error: error instanceof Error ? error.message : 'Avatarlar yüklenemedi' }
    }
}

/**
 * Fetch available voices from Anam AI account
 */
export async function getAnamVoices(): Promise<{ voices: import('@/features/avatar/services/anam').AnamVoice[] } | { error: string }> {
    try {
        const { listVoices } = await import('@/features/avatar/services/anam')
        const voices = await listVoices()
        return { voices }
    } catch (error) {
        console.error('getAnamVoices error:', error)
        return { error: error instanceof Error ? error.message : 'Sesler yüklenemedi' }
    }
}

/**
 * Create a new persona in Anam AI account
 */
export async function createAnamPersona(
    payload: import('@/features/avatar/services/anam').CreatePersonaPayload
): Promise<{ persona: import('@/features/avatar/services/anam').AnamPersona } | { error: string }> {
    try {
        const { createPersona } = await import('@/features/avatar/services/anam')
        const persona = await createPersona(payload)
        return { persona }
    } catch (error) {
        console.error('createAnamPersona error:', error)
        return { error: error instanceof Error ? error.message : 'Persona oluşturulamadı' }
    }
}

/**
 * Enable or disable a knowledge base file (controls whether AI uses it)
 */
export async function toggleKnowledgeBaseFile(fileId: string, enabled: boolean): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient()
    const accountId = await getAccountId(supabase)
    if (!accountId) return { error: 'Unauthorized' }

    const files = await getKBFiles(supabase, accountId)
    const updated = files.map(f => f.id === fileId ? { ...f, enabled } : f)
    await saveKBFiles(supabase, accountId, updated)
    revalidatePath('/admin/ai-training')
    return { success: true }
}
