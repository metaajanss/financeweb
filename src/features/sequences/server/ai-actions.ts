'use server'

/**
 * Generate a personalized icebreaker or optimize a message template using Gemini
 */
export async function generateSequenceAIContent(type: 'icebreaker' | 'optimize', data: {
    leadName?: string,
    companyName?: string,
    content?: string,
    channel?: 'email' | 'whatsapp',
    locale?: string
}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) return { error: 'API key not configured.' }

    const isTr = data.locale === 'tr'
    let prompt = ''
    
    if (type === 'icebreaker') {
        if (isTr) {
            prompt = `Sen profesyonel bir satış asistanısın. Aşağıdaki lead bilgilerini kullanarak etkileyici, samimi ve kişiselleştirilmiş bir e-posta/mesaj giriş cümlesi (icebreaker) yaz. 
            Maksimum 1-2 cümle olsun. 
            Lead Adı: ${data.leadName || 'Değerli Müşterimiz'}
            Şirket: ${data.companyName || 'Şirketiniz'}
            Dil: Türkçe.
            Cevap olarak SADECE giriş cümlesini dön.`
        } else {
            prompt = `You are a professional sales assistant. Write a compelling, friendly, and personalized email/message opening sentence (icebreaker) using the following lead information. 
            Maximum 1-2 sentences. 
            Lead Name: ${data.leadName || 'Valued Customer'}
            Company: ${data.companyName || 'Your Company'}
            Language: English.
            Return ONLY the opening sentence as the response.`
        }
    } else {
        if (isTr) {
            prompt = `Aşağıdaki ${data.channel || 'mesaj'} şablonunu daha ikna edici, profesyonel ve dönüşüm odaklı olacak şekilde optimize et. 
            Orijinal Mesaj: "${data.content}"
            Kurallar: Samimi ama saygılı bir ton kullan. Kısa ve net ol. Merak uyandır.
            Dil: Türkçe.
            Cevap olarak SADECE optimize edilmiş yeni mesajı dön.`
        } else {
            prompt = `Optimize the following ${data.channel || 'message'} template to be more persuasive, professional, and conversion-oriented. 
            Original Message: "${data.content}"
            Rules: Use a friendly but respectful tone. Be concise and clear. Create curiosity.
            Language: English.
            Return ONLY the optimized new message as the response.`
        }
    }

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: { maxOutputTokens: 500, temperature: 0.8 }
                })
            }
        )

        const result = await res.json()
        
        if (!res.ok) {
            console.error('Gemini Error Response:', result)
            throw new Error(`API Error: ${res.status}`)
        }

        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        
        return { success: true, content: aiText }
    } catch (error: any) {
        console.error('AI Sequence Error:', error)
        return { error: 'Error generating AI content: ' + error.message }
    }
}
