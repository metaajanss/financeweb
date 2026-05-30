import type { AIConfig } from '@/shared/types/ai-config';

/**
 * Truncate a string at the last word boundary (space or newline) before maxLen
 * instead of slicing mid-word. Falls back to a hard slice if no boundary exists
 * within the limit.
 */
function truncateAtWord(s: string, maxLen: number): string {
    if (s.length <= maxLen) return s;
    const slice = s.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(' ');
    const lastNewline = slice.lastIndexOf('\n');
    const boundary = Math.max(lastSpace, lastNewline);
    if (boundary <= 0) return slice;
    return slice.slice(0, boundary).trimEnd();
}

const MAX_NAME_LEN = 80;
const MAX_INTRO_LEN = 1000;
const MAX_BRAND_VOICE_LEN = 1000;
const MAX_KNOWLEDGE_BASE_LEN = 20000;
const MAX_FAQ_FIELD_LEN = 2000;
const MAX_RULE_LEN = 500;
const MAX_TOPIC_LEN = 200;
const MAX_QUESTION_LEN = 500;
const MAX_FALLBACK_LEN = 500;

/** Strip control characters (except newline/tab) and injection markers to limit prompt-injection vectors. */
function sanitize(value: string | null | undefined, maxLen: number): string {
    if (!value) return '';

    // NFKC normalization collapses Unicode lookalikes (e.g. Cyrillic 'Ѕ' → 'S')
    // so the injection-marker filter below cannot be bypassed via homoglyphs.
    let cleaned: string;
    try {
        cleaned = value.normalize('NFKC');
    } catch {
        cleaned = value;
    }

    // eslint-disable-next-line no-control-regex
    cleaned = cleaned
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
        // Common LLM control markers in any case ([SYSTEM], [system], [SyStEm], ...)
        // Bracket variants: square, parenthesis, curly, angle.
        .replace(/[\[\(\{<]\s*(?:system|inst|instruction|instructions|human|assistant|user|end|begin|prompt|role)\s*[\]\)\}>]/gi, '')
        // Markdown-style fence often used for jailbreak attempts (### system, --- system).
        .replace(/^[\s#*\-=]*(system|assistant|user|instructions?|prompt|role)\s*:\s*/gim, '')
        .trim();

    if (cleaned.length <= maxLen) return cleaned;
    return truncateAtWord(cleaned, maxLen);
}

/**
 * Builds a comprehensive system prompt for the Anam avatar session
 * using all data from the account's AI Training configuration.
 * This ensures the avatar uses the same knowledge, rules and persona
 * as the text-based AI assistant.
 */
export function buildAvatarSystemPrompt(config: AIConfig): string {
    const parts: string[] = [];

    // --- Identity ---
    const name = sanitize(config.persona_name, MAX_NAME_LEN);
    const intro = sanitize(config.persona_intro, MAX_INTRO_LEN);
    if (name) {
        parts.push(`Sen ${name} adında bir AI satış asistanısın.`);
    }
    if (intro) {
        parts.push(intro);
    }

    // --- Brand voice ---
    const brandVoice = sanitize(config.brand_voice, MAX_BRAND_VOICE_LEN);
    if (brandVoice) {
        parts.push(`\nİletişim tarzın: ${brandVoice}`);
    }

    // --- Knowledge base ---
    const knowledgeBase = sanitize(config.knowledge_base, MAX_KNOWLEDGE_BASE_LEN);
    if (knowledgeBase) {
        parts.push(`\n## Bilgi Tabanı\n${knowledgeBase}`);
    }

    // --- FAQ items ---
    if (config.faq_items && config.faq_items.length > 0) {
        const faqLines = config.faq_items
            .map(f => `S: ${sanitize(f.question, MAX_FAQ_FIELD_LEN)}\nC: ${sanitize(f.answer, MAX_FAQ_FIELD_LEN)}`)
            .join('\n\n');
        parts.push(`\n## Sık Sorulan Sorular\n${faqLines}`);
    }

    // --- Mandatory rules ---
    if (config.mandatory_rules && config.mandatory_rules.length > 0) {
        const rules = config.mandatory_rules
            .map(r => sanitize(r, MAX_RULE_LEN))
            .filter(r => r)
            .map(r => `- ${r}`)
            .join('\n');
        if (rules) parts.push(`\n## Uyulması Gereken Kurallar\n${rules}`);
    }

    // --- Forbidden topics ---
    if (config.forbidden_topics && config.forbidden_topics.length > 0) {
        const topics = config.forbidden_topics
            .map(t => sanitize(t, MAX_TOPIC_LEN))
            .filter(t => t)
            .join(', ');
        if (topics) parts.push(`\n## Yasak Konular\nAşağıdaki konulardan kesinlikle bahsetme: ${topics}`);
    }

    // --- Qualification questions (context only) ---
    if (config.qualification_questions && config.qualification_questions.length > 0) {
        const questions = config.qualification_questions
            .map(q => sanitize(q, MAX_QUESTION_LEN))
            .filter(q => q)
            .map(q => `- ${q}`)
            .join('\n');
        if (questions) parts.push(`\n## Müşteri Nitelendirme Soruları\nKonuşma sırasında uygun fırsatlarda şu soruları sor:\n${questions}`);
    }

    // --- Fallback instruction ---
    if (config.fallback_action === 'human_handoff') {
        parts.push('\nCevap veremediğin sorularda nazikçe bir insan temsilcisine yönlendireceğini belirt.');
    } else if (config.fallback_action === 'custom_message' && config.fallback_message?.trim()) {
        const fb = sanitize(config.fallback_message, MAX_FALLBACK_LEN);
        if (fb) parts.push(`\nCevap veremediğin durumlarda şunu söyle: "${fb}"`);
    }

    // --- General avatar behavior ---
    parts.push('\nVideo görüşme yapıyorsun. Yanıtların kısa, net ve konuşma diline uygun olsun. Uzun paragraflardan kaçın.');

    // --- Presentation-aware behavior ---
    parts.push(
        '\n## Sunum Modu\n' +
        'Toplantıda bir sunum yapıyor olabilirsin. Bu durumda şu öncelik sırasına uy:\n' +
        '1. Sana addContext ile iletilen "Şu an gösterilen slayt" bilgisi varsa, sorulan soruları öncelikle o slaytın bağlamına göre cevapla.\n' +
        '2. Slayt bağlamı yetersizse genel Bilgi Tabanı ve SSS\'lere başvur.\n' +
        '3. Sunum sırasında kısa soru-cevap araları olabilir; sorulara 2-3 cümlede cevap ver, sonra konuya devam edilebilsin.\n' +
        '4. Henüz cevap veremiyorsan müşteriyi nezaketle bir sonraki slayda yönlendir veya not aldığını söyle.'
    );

    return parts.join('\n').trim();
}
