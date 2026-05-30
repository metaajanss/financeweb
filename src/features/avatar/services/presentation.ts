/**
 * Presentation service: PDF → slide images + speaking scripts, plus
 * lightweight classifiers used by the Recall webhook (question detection
 * and yes/no consent detection).
 *
 * Uses pdfjs-dist (legacy build for Node.js) + node-canvas for per-page PNG
 * rendering, and Gemini Flash via `generateCoreResponse` for script
 * generation and classification.
 */

import { generateCoreResponse } from '@/features/conversations/services'
import type { ConsentClassification } from '@/shared/types/presentation'

// pdfjs-dist legacy build is the only one that works server-side in Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs')

const SCRIPT_MODEL = 'gemini-flash-latest'
const CLASSIFY_MODEL = 'gemini-flash-latest'

// Defensive limits — prevent OOM / runaway processing on adversarial PDFs.
// Reasonable pitch deck is well under 50 slides; a single canvas above
// 4096px per side would exceed node-canvas's safe rendering envelope.
const MAX_PDF_PAGES = 20
const MAX_CANVAS_DIMENSION = 4096
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_RAW_TEXT_PER_PAGE = 50 * 1024 // 50KB per page — protects against adversarial PDFs with massive text streams

// ---------------------------------------------------------------------------
// PDF processing
// ---------------------------------------------------------------------------

export interface RenderedPage {
    pageNumber: number
    rawText: string
    pngBuffer: Buffer
    width: number
    height: number
}

/**
 * Render every page of a PDF buffer to a PNG and extract its text.
 * Returns one entry per page (1-indexed page numbers).
 */
export async function renderPdfPages(
    pdfBuffer: Buffer,
    options: { language?: string } = {},
): Promise<RenderedPage[]> {
    const isEn = options.language === 'en'
    if (pdfBuffer.length > MAX_PDF_SIZE_BYTES) {
        const sizeMb = (pdfBuffer.length / (1024 * 1024)).toFixed(2)
        throw new Error(
            isEn
                ? `PDF size limit exceeded (${sizeMb} MB > 10 MB). Please upload a smaller file.`
                : `PDF dosya boyutu limiti aşıldı (${sizeMb}MB > 10MB). Lütfen daha küçük bir dosya yükleyin.`,
        )
    }

    let doc: any = null
    let timeoutId: NodeJS.Timeout | null = null

    try {
        const processingPromise = (async () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { createCanvas } = require('canvas')
            
            const data = new Uint8Array(pdfBuffer)
            const loadingTask = pdfjs.getDocument({
                data,
                useSystemFonts: true,
                disableFontFace: true,
            })
            doc = await loadingTask.promise

            if (doc.numPages > MAX_PDF_PAGES) {
                throw new Error(
                    isEn
                        ? `PDF page count limit exceeded (${doc.numPages} > ${MAX_PDF_PAGES}). Please upload a shorter presentation.`
                        : `PDF sayfa sayısı limiti aşıldı (${doc.numPages} > ${MAX_PDF_PAGES}). Lütfen daha kısa bir sunum yükleyin.`,
                )
            }

            const pages: RenderedPage[] = []

            for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
                const page = await doc.getPage(pageNumber)

                // Cap the rendered canvas at MAX_CANVAS_DIMENSION on the longer side
                // to defend against PDFs that declare an enormous viewport.
                const baseViewport = page.getViewport({ scale: 2 })
                const longest = Math.max(baseViewport.width, baseViewport.height)
                const scale = longest > MAX_CANVAS_DIMENSION
                    ? 2 * (MAX_CANVAS_DIMENSION / longest)
                    : 2
                const viewport = page.getViewport({ scale })

                const canvas = createCanvas(viewport.width, viewport.height)
                const context = canvas.getContext('2d')

                await page.render({
                    // node-canvas's CanvasRenderingContext2D is structurally compatible.
                    canvasContext: context as unknown as CanvasRenderingContext2D,
                    viewport,
                }).promise

                const textContent = await page.getTextContent()
                const rawText = (Array.isArray(textContent.items) ? textContent.items : [])
                    .map((item: unknown): string => {
                        if (item && typeof item === 'object' && 'str' in item) {
                            const s = (item as { str?: unknown }).str
                            return typeof s === 'string' ? s : ''
                        }
                        return ''
                    })
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, MAX_RAW_TEXT_PER_PAGE)

                pages.push({
                    pageNumber,
                    rawText,
                    pngBuffer: canvas.toBuffer('image/png'),
                    width: viewport.width,
                    height: viewport.height,
                })

                page.cleanup()
            }

            return pages
        })()

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(
                    isEn
                        ? 'PDF processing timed out (15s limit). The file might be too complex.'
                        : 'PDF işleme süresi doldu (15s sınırı). Dosya çok karmaşık veya çok büyük olabilir.'
                ))
            }, 15000)
        })

        return await Promise.race([processingPromise, timeoutPromise])
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        if (doc) {
            try {
                await doc.destroy()
            } catch (_e) {
                // Ignore destruction error during cleanup
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Speaking script generation
// ---------------------------------------------------------------------------

/**
 * Generate a natural Turkish speaking script for a single slide.
 * Returns ~30-60 seconds worth of spoken content.
 */
export async function generateSpeakingScript(
    pageNumber: number,
    pageCount: number,
    rawText: string,
    options: {
        language?: string
        brandVoice?: string
        accountName?: string
    } = {},
): Promise<string> {
    const { language = 'tr', brandVoice, accountName } = options
    const isFirst = pageNumber === 1
    const isLast = pageNumber === pageCount

    const systemPrompt = [
        language === 'tr'
            ? 'Sen profesyonel bir satış sunucususun. Sana verilen slayt içeriğini doğal, samimi ve akıcı bir Türkçe ile sözlü olarak anlatacaksın.'
            : 'You are a professional sales presenter. You will deliver the given slide content out loud in a natural, conversational style.',
        brandVoice ? `Marka sesi/tonu: ${brandVoice}` : '',
        accountName ? `Şirket: ${accountName}` : '',
        '',
        'Kurallar:',
        '- Sadece okunacak metni döndür, başlık veya açıklama ekleme.',
        '- Maksimum 60 saniye sürecek uzunlukta olsun (~120-160 kelime).',
        '- Listeleri tek tek okuma; ana fikri akıcı cümlelerle özetle.',
        '- Slayt görselinde olduğunu varsay, "şu slaytta" gibi referanslar uygun.',
        isFirst ? '- Bu ilk slayt; kısa bir giriş cümlesiyle başla.' : '',
        isLast ? '- Bu son slayt; kapanış cümlesiyle bitir.' : '',
    ]
        .filter(Boolean)
        .join('\n')

    const userText = `Slayt ${pageNumber}/${pageCount} içeriği:\n\n${rawText || '(metin çıkarılamadı, slayt görsele dayalı)'}\n\nBu slayt için sözlü anlatım metnini üret.`

    const result = await generateCoreResponse({
        systemPrompt,
        messages: [{ role: 'user', parts: [{ text: userText }] }],
        model: SCRIPT_MODEL,
        temperature: 0.6,
        maxTokens: 350,
    })

    return result.response.trim() || rawText.slice(0, 600)
}

// ---------------------------------------------------------------------------
// Question detection
// ---------------------------------------------------------------------------

// Whole-word matching avoids false positives like "anne " matching "ne " or
// "ekim " matching "kim ". JS regex `\b` works on the Latin-1 set so it
// correctly treats Turkish letters (ç, ş, ı, ğ, ü, ö) as non-word characters
// at boundaries — which is exactly what we want for the keywords below.
const QUESTION_REGEX_TR = /\b(ne|neden|niye|nasıl|nerede|nereye|kim|kimi|kaç|hangi|mi|mı|mu|mü|misin|mısın|musun|müsün|mıdır|midir)\b/u
const QUESTION_REGEX_EN = /\b(what|why|how|where|when|who|which|can you|could you|do you|does|is it|are you|will you)\b/u

function looksLikeQuestion(text: string): boolean {
    const t = text.trim().toLowerCase()
    if (!t) return false
    if (t.endsWith('?')) return true
    return QUESTION_REGEX_TR.test(t) || QUESTION_REGEX_EN.test(t)
}

/**
 * Classify whether a transcript chunk is a question directed at the avatar.
 * Heuristic first; LLM confirmation only for borderline cases.
 */
export async function classifyQuestion(text: string): Promise<boolean> {
    const trimmed = text.trim()
    if (trimmed.length < 3) return false

    const hint = looksLikeQuestion(trimmed)
    // Confident NO if no signal at all and short.
    if (!hint && trimmed.length < 30) return false
    // Confident YES if clearly a question (ends with ?).
    if (trimmed.endsWith('?')) return true

    // Borderline: ask the LLM (low cost).
    const result = await generateCoreResponse({
        systemPrompt:
            'Sen bir sınıflandırıcısın. Verilen ifade bir soru mu yoksa beyan/yorum mu?\n' +
            'Sadece "yes" veya "no" döndür. Soru ise yes, soru değilse no.',
        messages: [{ role: 'user', parts: [{ text: trimmed }] }],
        model: CLASSIFY_MODEL,
        temperature: 0,
        maxTokens: 5,
    })
    return result.response.trim().toLowerCase().startsWith('yes')
}

// ---------------------------------------------------------------------------
// Consent detection (for "İsterseniz sunum yapabilirim" → yes/no/unclear)
// ---------------------------------------------------------------------------

// Whole-word matching: substring matching causes "number" → no, "know" → no,
// "yoksa" → no, "looking" → ok=yes, etc. Multi-word entries are matched as
// phrases (the surrounding `\b` still anchors on the first/last token).
const CONSENT_YES_REGEX = /\b(evet|olur|tabii|tabi|hadi|başlayalım|buyurun|devam|lütfen|isterim|yes|sure|ok|okay|alright|go ahead|let's|please)\b/u
const CONSENT_NO_REGEX = /\b(hayır|yok|şimdi olmaz|sonra|gerek yok|istemem|no|not now|later|skip|pass)\b/u

function consentHeuristic(text: string): ConsentClassification {
    const t = text.trim().toLowerCase()
    if (!t) return 'unclear'
    // Yes wins if both signals appear — "yes, no problem" / "okay, no worries"
    // express agreement despite the literal "no".
    const yes = CONSENT_YES_REGEX.test(t)
    const no = CONSENT_NO_REGEX.test(t)
    if (yes && !no) return 'yes'
    if (no && !yes) return 'no'
    if (yes && no) return 'yes'
    return 'unclear'
}

/**
 * Classify a user response to "Would you like me to present?" as yes/no/unclear.
 */
export async function classifyConsent(text: string): Promise<ConsentClassification> {
    const heuristic = consentHeuristic(text)
    if (heuristic !== 'unclear') return heuristic

    const result = await generateCoreResponse({
        systemPrompt:
            'Aşağıdaki metin "sunumu izlemek ister misiniz?" sorusuna verilen cevaptır.\n' +
            'Cevabı sınıflandır: yes (kabul), no (red), unclear (belirsiz).\n' +
            'Sadece tek kelime döndür: yes, no, veya unclear.',
        messages: [{ role: 'user', parts: [{ text }] }],
        model: CLASSIFY_MODEL,
        temperature: 0,
        maxTokens: 5,
    })
    const raw = result.response.trim().toLowerCase()
    if (raw.startsWith('yes')) return 'yes'
    if (raw.startsWith('no')) return 'no'
    return 'unclear'
}

// ---------------------------------------------------------------------------
// Meeting summary
// ---------------------------------------------------------------------------

/**
 * Summarize a meeting transcript in 3-4 sentences (TR by default).
 */
export async function summarizeMeetingTranscript(
    transcript: Array<{ speaker?: string | null; content: string }>,
    language: string = 'tr',
): Promise<string> {
    if (transcript.length === 0) return ''
    // Gemini-flash context window is ~1M tokens; 12KB transcript is well within budget. Adjust if model swap.
    const flattened = transcript
        .map(t => `${t.speaker || 'Konuşmacı'}: ${t.content}`)
        .join('\n')
        .slice(0, 12000)

    const systemPrompt =
        language === 'tr'
            ? 'Sen bir toplantı özetleme asistanısın. Verilen toplantı transkriptini 3-4 cümlede özetle. Konuşulan ana konuyu, alınan kararları ve takip gerektiren noktaları belirt.'
            : 'You are a meeting summarization assistant. Summarize the meeting transcript in 3-4 sentences, capturing the main topic, decisions, and follow-up items.'

    const result = await generateCoreResponse({
        systemPrompt,
        messages: [{ role: 'user', parts: [{ text: flattened }] }],
        model: SCRIPT_MODEL,
        temperature: 0.3,
        maxTokens: 250,
    })
    return result.response.trim()
}
