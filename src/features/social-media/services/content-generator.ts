import type {
    SocialPlatform,
    ContentType,
    CampaignTone,
    MarketingGoal,
    ContentLibraryItem,
    ChannelSettings,
    SocialMediaPost,
    GeneratedSocialPost,
    SocialAngle,
    TwitterPlatformConfig,
    RedditPlatformConfig,
} from '@/shared/types/social-media.types'
import { SOCIAL_ANGLES } from '@/shared/types/social-media.types'
import { splitToThreadParts } from './twitter'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// ─── Pazarlama hedefi açıklamaları (prompt'a eklenir) ───────────────────────

const MARKETING_GOAL_CONTEXT: Record<MarketingGoal, string> = {
    brand_awareness:    'Payoff Lab markasını tanıt. Ürün adını doğal şekilde kullan. Hedef kitleyle bağ kur.',
    lead_generation:    'İzleyiciyi free trial veya demo almaya yönlendir. Net CTA kullan.',
    thought_leadership: 'Sektörde otorite yansıt. Deneyim ve içgörü paylaş. Promosyon ikinci planda.',
    community_building: 'Tartışma başlat, etkileşim iste, topluluğu büyüt. Ürüne bağlamak zorunda değil.',
    product_education:  'Bir özelliği veya kullanım senaryosunu anlat. Faydayı somutlaştır.',
    problem_awareness:  'Hedef kitlenin yaşadığı acıyı öne çıkar. Çözüm olarak Payoff Lab doğal gelsin.',
}

// ─── İçerik tipi prompt stratejileri ────────────────────────────────────────

const CONTENT_PROMPTS: Record<ContentType, Record<'twitter' | 'reddit', string>> = {
    educational: {
        twitter: `Eğitici, değer odaklı bir tweet yaz. Format seçeneklerinden birini seç:
- "X adımda [konu]" — kısa liste
- "Çoğu [hedef kitle] bilmiyor ama..." hook
- Mini framework veya checklist
- "Yanlış sanılan vs gerçek" karşılaştırma
Ürünü zorlama; bağlam gerektiriyorsa doğal şekilde geç.`,
        reddit: `r/{subreddit} için değer odaklı bir metin post yaz.
"I built X" veya "Here's how we solved Y" formatı iyi performans verir.
Pratik adımlar, gerçek deneyim paylaş. Ürünü sadece bağlam olarak kullan.
Başlık merak uyandırmalı ama clickbait olmamalı.`,
    },
    industry: {
        twitter: `Sektör trendi, istatistik veya haber yorumu yaz.
Kendi bakış açını ekle: "Bu bize ne anlatıyor?"
Hedef kitlenin bu bilgiyi işine nasıl yarayacağını göster.
Kaynak varsa belirt, yoksa "Studies show" gibi belirsiz ifade kullanma.`,
        reddit: `Sektörle ilgili bir trend veya veri paylaş, tartışma başlat.
"What's your take on this?" veya "Anyone else noticing this?" ile bitir.
Topluluğun görüşünü al.`,
    },
    engagement: {
        twitter: `Yorum ve retweet almaya yönelik bir post yaz. Formatlar:
- "Hot take: [sektör görüşü]. Hemfikir misiniz?"
- "[Hedef kitle]'nin en büyük problemi ne?" sorusu
- "Hangisi: A mı B mi?" seçim sorusu
- Controversial ama savunulabilir bir fikir
Ürüne bağlamak zorunlu değil.`,
        reddit: `Sektörle ilgili açık uçlu, samimi bir soru sor.
Topluluğun deneyiminden gerçekten öğrenmek istiyormuş gibi yaz.
"Asking for a friend" veya "I'm curious about..." formatı çalışır.`,
    },
    social_proof: {
        twitter: `Somut bir başarı, metrik veya kullanıcı deneyimi paylaş.
Formatlar:
- "X kullanıcımız Y sonucu elde etti"
- "[Sektör] ekiplerinin Payoff Lab ile [metrik] artırdığını görüyoruz"
- Gerçekçi, abartısız bir use case
Rakam varsa kullan, yoksa genel ama inandırıcı bir ifade seç.`,
        reddit: `"We helped a company achieve X" formatında kısa bir case study yaz.
Teknik süreç veya karar detaylarını içer — Reddit toplulukları bunu takdir eder.
Payoff Lab'i çözümün bir parçası olarak konumlandır, tek çözüm değil.`,
    },
    promotional: {
        twitter: `Direkt bir özellik veya teklif tanıtımı yap.
Faydayı bir cümlede özetle, özelliği değil: "Lead başına X saat tasarruf" gibi.
Net CTA kullan. 200 karakter idealdir, boşluk hashtag'e kalsın.`,
        reddit: `REDDIT KURALI: Açık reklam downvote yer. "We launched X" formatını kullan — şeffaf ol.
r/SaaS, r/IMadeThis veya r/entrepreneur gibi uygun subredditlere yönelik yaz.
Yorumlarda sorulara dürüstçe, savunmacı olmadan cevap verecekmiş gibi bir ton tut.`,
    },
}

// ─── Ana üretim fonksiyonu ───────────────────────────────────────────────────

export interface GeneratePostParams {
    platform: SocialPlatform
    contentType: ContentType
    contentItem?: ContentLibraryItem | null
    marketingGoal: MarketingGoal
    targetAudience: string
    tone: CampaignTone
    knowledgeBase: string
    mandatoryRules?: string[]
    avoidTopics?: string[]
    ctaUrl?: string
    utmParams?: Record<string, string>
    channelSettings: ChannelSettings
    angle?: SocialAngle
    customTopic?: string
}

export async function generateMarketingPost(params: GeneratePostParams): Promise<GeneratedSocialPost> {
    const pc = params.channelSettings.platform_config
    const subreddit = (pc as RedditPlatformConfig)?.default_subreddits?.[0] ?? 'saas'
    const maxHashtags = (pc as TwitterPlatformConfig)?.max_hashtags ?? 3
    const useThreads = (pc as TwitterPlatformConfig)?.use_threads ?? false

    const angle = params.angle ?? SOCIAL_ANGLES[Math.floor(Math.random() * SOCIAL_ANGLES.length)]
    const promptTemplate = CONTENT_PROMPTS[params.contentType][params.platform === 'reddit' ? 'reddit' : 'twitter']
    const platformPrompt = promptTemplate.replace('{subreddit}', subreddit)

    const ctaWithUtm = buildCtaUrl(params.ctaUrl, params.utmParams, params.platform)

    const systemPrompt = buildSystemPrompt({
        ...params,
        subreddit,
        maxHashtags,
        useThreads,
        platformPrompt,
        ctaUrl: ctaWithUtm,
        angle,
    })

    const raw = await callGemini(systemPrompt)
    const parsed = parseGeminiResponse(raw, params.platform, params.contentType)

    // Twitter: uzun içeriği thread'e böl
    if (params.platform === 'twitter' && useThreads && parsed.content.length > 270) {
        const parts = splitToThreadParts(parsed.content)
        parsed.metadata = { is_thread: true, thread_parts: parts }
        parsed.content = parts[0]
    }

    return parsed
}

function buildSystemPrompt(params: GeneratePostParams & {
    subreddit: string
    maxHashtags: number
    useThreads: boolean
    platformPrompt: string
    angle: SocialAngle
}): string {
    const {
        platform,
        tone,
        mandatoryRules,
        avoidTopics,
        contentItem,
        customTopic,
        ctaUrl,
        subreddit,
        maxHashtags,
        knowledgeBase,
        targetAudience,
        marketingGoal,
        contentType,
        platformPrompt,
        angle
    } = params

    const charLimit = platform === 'twitter' ? 280 : null
    const charNote = charLimit ? `\nKarakter limiti: ${charLimit} (hashtag dahil)` : ''

    const rulesBlock = mandatoryRules?.length
        ? `\nZorunlu kurallar:\n${mandatoryRules.map(r => `• ${r}`).join('\n')}`
        : ''

    const avoidBlock = avoidTopics?.length
        ? `\nKaçınılacak konular: ${avoidTopics.join(', ')}`
        : ''

    const contentBlock = contentItem
        ? `\n=== PAYLAŞILACAK İÇERİK ===\nBaşlık: ${contentItem.title}\nDetay: ${contentItem.body}`
        : customTopic
            ? `\n=== KONU ===\n${customTopic}`
            : ''

    const ctaBlock = ctaUrl
        ? `\nCTA URL: ${ctaUrl}`
        : ''

    const outputSchema = platform === 'reddit'
        ? `{
  "title": "Reddit post başlığı (max 300 karakter, değer odaklı)",
  "content": "Post gövdesi (Markdown formatında)",
  "hashtags": [],
  "subreddit": "${subreddit}",
  "estimated_engagement": "high|medium|low"
}`
        : `{
  "content": "Tweet metni (hashtag dahil, max ${charLimit} karakter)",
  "hashtags": ["tag1", "tag2"],
  "estimated_engagement": "high|medium|low"
}`

    return `Sen Payoff Lab'in sosyal medya pazarlama agentısın.

=== ŞİRKET / ÜRÜN BAĞLAMI ===
${knowledgeBase}

=== HEDEF KİTLE ===
${targetAudience || 'SaaS şirket kurucuları, sales direktörleri, B2B pazarlama ekipleri'}

=== PAZARLAMA HEDEFİ ===
${MARKETING_GOAL_CONTEXT[marketingGoal]}

=== MARKA ===
Ton: ${tone}${rulesBlock}${avoidBlock}

=== İÇERİK TÜRÜ: ${contentType.toUpperCase()} ===
${platformPrompt}

İçerik açısı: ${angle}${contentBlock}

=== PLATFORM: ${platform.toUpperCase()}${charNote} ===
${platform === 'twitter' ? `Max hashtag sayısı: ${maxHashtags}` : `Subreddit: r/${subreddit}`}${ctaBlock}

Sadece JSON döndür (markdown code fence YOK):
${outputSchema}`
}

// ─── İçerik tipi seçici (mix logic) ─────────────────────────────────────────

export function selectNextContentType(
    channelSettings: ChannelSettings,
    recentPosts: Pick<SocialMediaPost, 'content_type'>[],
): ContentType {
    const mix: Record<ContentType, number> = {
        educational:  channelSettings.mix_educational,
        industry:     channelSettings.mix_industry,
        engagement:   channelSettings.mix_engagement,
        social_proof: channelSettings.mix_social_proof,
        promotional:  channelSettings.mix_promotional,
    }

    const total = Object.values(mix).reduce((a, b) => a + b, 0)
    if (total === 0) return 'educational'

    // Son 20 posttan her tipin oranını hesapla
    const recentCounts = recentPosts.slice(0, 20).reduce((acc, p) => {
        acc[p.content_type] = (acc[p.content_type] ?? 0) + 1
        return acc
    }, {} as Record<string, number>)

    const recentTotal = recentPosts.slice(0, 20).length || 1

    // Her tipin hedef - gerçek oranı arasındaki farkı bul
    // En büyük pozitif fark = en çok geriye kalan tip
    let maxDeficit = -Infinity
    let selected: ContentType = 'educational'

    for (const [type, targetPct] of Object.entries(mix) as [ContentType, number][]) {
        const actualPct = ((recentCounts[type] ?? 0) / recentTotal) * 100
        const deficit = targetPct - actualPct
        if (deficit > maxDeficit) {
            maxDeficit = deficit
            selected = type
        }
    }

    return selected
}

// ─── Content Library item seçici ─────────────────────────────────────────────

export function mapLibraryTypeToContentType(libType: string): ContentType {
    const mapping: Record<string, ContentType> = {
        educational:  'educational',
        industry:     'industry',
        engagement:   'engagement',
        social_proof: 'social_proof',
        promotional:  'promotional',
        feature:      'promotional',      // feature → promotional içerik
        faq_highlight:'educational',      // FAQ → eğitici içerik
        custom:       'educational',
    }
    return mapping[libType] ?? 'educational'
}

// ─── UTM builder ─────────────────────────────────────────────────────────────

function buildCtaUrl(
    baseUrl?: string,
    utmParams?: Record<string, string>,
    platform?: SocialPlatform,
): string | undefined {
    if (!baseUrl) return undefined
    if (!utmParams && !platform) return baseUrl

    const url = new URL(baseUrl)
    if (platform)       url.searchParams.set('utm_source',   platform)
    if (utmParams?.medium)   url.searchParams.set('utm_medium',   utmParams.medium)
    if (utmParams?.campaign) url.searchParams.set('utm_campaign', utmParams.campaign)

    return url.toString()
}

// ─── Gemini çağrısı ──────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
            }),
        },
    )

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gemini API error: ${err}`)
    }

    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function parseGeminiResponse(raw: string, platform: SocialPlatform, contentType: ContentType): GeneratedSocialPost {
    try {
        const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(clean)

        if (platform === 'reddit') {
            return {
                content:              parsed.content ?? '',
                title:                parsed.title ?? '',
                hashtags:             [],
                content_type:         contentType,
                metadata:             { subreddit: parsed.subreddit, post_type: 'text' },
                estimated_engagement: parsed.estimated_engagement,
            }
        }

        return {
            content:              parsed.content ?? '',
            hashtags:             (parsed.hashtags ?? []).map((h: string) => h.replace(/^#/, '')),
            content_type:         contentType,
            estimated_engagement: parsed.estimated_engagement,
        }
    } catch {
        // JSON parse hatası durumunda raw metni kullan
        return {
            content:      raw.slice(0, platform === 'twitter' ? 280 : 2000),
            hashtags:     [],
            content_type: contentType,
        }
    }
}
