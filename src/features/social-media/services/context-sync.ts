import type { AIConfig } from '@/shared/types/ai-config'
import { createAdminClient } from '@/core/db/admin'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface ExtractedSection {
    title: string
    body: string
    type: 'feature' | 'educational' | 'industry' | 'promotional'
}

// ─── Ana sync fonksiyonu ─────────────────────────────────────────────────────

/**
 * ai_config kaydedildiğinde çağrılır.
 * Yeni FAQ'ları ve knowledge_base değişikliklerini tespit edip
 * content_library'e ekler.
 */
export async function syncAIConfigToContentLibrary(
    newConfig: AIConfig,
    previousConfig: AIConfig | null,
): Promise<{ added: number }> {
    const supabase = createAdminClient()
    let added = 0

    // ─── 1. FAQ sync ────────────────────────────────────────────────────────
    const prevFaqHashes = new Set(
        (previousConfig?.faq_items ?? []).map(f => hashContent(f.question + f.answer))
    )

    for (const faq of newConfig.faq_items ?? []) {
        const hash = hashContent(faq.question + faq.answer)
        if (prevFaqHashes.has(hash)) continue

        // Duplicate kontrolü
        const { data: existing } = await supabase
            .from('social_media_content_library')
            .select('id')
            .eq('embedding_hash', hash)
            .single()

        if (existing) continue

        await supabase.from('social_media_content_library').insert({
            title:           faq.question,
            body:            faq.answer,
            content_type:    'faq_highlight',
            source:          'ai_config_faq',
            source_ref:      faq.question,
            status:          'approved',
            priority:        6,
            embedding_hash:  hash,
            suggested_platforms: ['twitter'],
            suggested_tone: 'educational',
        })

        added++
    }

    // ─── 2. Knowledge base değişiklik tespiti ───────────────────────────────
    const prevKB = previousConfig?.knowledge_base ?? ''
    const newKB  = newConfig.knowledge_base ?? ''

    if (newKB && newKB !== prevKB) {
        const sections = await extractNewSections(prevKB, newKB)

        for (const section of sections) {
            const hash = hashContent(section.title + section.body)

            const { data: existing } = await supabase
                .from('social_media_content_library')
                .select('id')
                .eq('embedding_hash', hash)
                .single()

            if (existing) continue

            await supabase.from('social_media_content_library').insert({
                title:           section.title,
                body:            section.body,
                content_type:    section.type,
                source:          'ai_config_kb',
                status:          'approved',
                priority:        4,
                embedding_hash:  hash,
                suggested_platforms: ['twitter', 'reddit'],
                ai_config_snapshot: { kb_length: newKB.length, extracted_at: new Date().toISOString() },
            })

            added++
        }
    }

    return { added }
}

// ─── Gemini ile yeni bölüm tespiti ──────────────────────────────────────────

async function extractNewSections(oldKB: string, newKB: string): Promise<ExtractedSection[]> {
    if (!GEMINI_API_KEY || !oldKB) {
        // İlk kez ya da Gemini yoksa: basit heuristik
        return extractSimple(newKB)
    }

    const prompt = `Aşağıdaki iki metin arasındaki farkı analiz et.
Eski metinde olmayan ya da belirgin şekilde değişen/eklenen bölümleri bul.

Eski metin:
"""
${oldKB.slice(0, 1500)}
"""

Yeni metin:
"""
${newKB.slice(0, 1500)}
"""

Yeni veya değişen içerikleri JSON dizisi olarak döndür.
Değişiklik yoksa boş dizi döndür: []

Format (markdown code fence YOK):
[
  {
    "title": "Kısa başlık (max 80 karakter)",
    "body": "Yeni veya değişen içeriğin özeti (1-3 cümle)",
    "type": "feature|educational|industry|promotional"
  }
]`

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
                }),
            },
        )

        if (!res.ok) return extractSimple(newKB)

        const data = await res.json()
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
        const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(clean) as ExtractedSection[]
    } catch {
        return extractSimple(newKB)
    }
}

// Gemini yoksa veya hata durumunda: paragrafları ayrıştır
function extractSimple(kb: string): ExtractedSection[] {
    const paragraphs = kb.split('\n\n').filter(p => p.trim().length > 50)
    return paragraphs.slice(0, 3).map(p => {
        const firstLine = p.split('\n')[0].trim()
        return {
            title: firstLine.slice(0, 80),
            body:  p.trim().slice(0, 300),
            type:  'educational' as const,
        }
    })
}

// ─── Basit hash fonksiyonu ───────────────────────────────────────────────────

function hashContent(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash).toString(36)
}
