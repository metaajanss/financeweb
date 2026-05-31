'use server';

import { createClient } from '@/core/db/server';
import { createLead } from '@/features/leads/server/actions';
import { createAdminClient } from '@/core/db/admin';
import { generateCoreResponse } from '@/features/conversations/services';
import { buildAccountContext } from '@/core/ai/context-builder';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createCalendarEvent, checkCalendarAvailability } from '@/features/integrations/providers/google/calendar';
import { fetchWithRetry } from '@/core/http/fetch';
import { sendSlackNotification } from '@/features/integrations/providers/messaging/slack';
import { sendDiscordNotification } from '@/features/integrations/providers/messaging/discord';
import { notifyAdmins } from '@/features/notifications/server/actions';
import { syncGoogleCalendarEvents } from '@/features/meetings/server/actions';

const LANGUAGE_MAP: Record<string, string> = {
    tr: 'Turkish',
    en: 'English',
    zh: 'Chinese',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    hi: 'Hindi',
    ar: 'Arabic',
    ru: 'Russian',
    id: 'Indonesian'
};

const WELCOME_MESSAGES: Record<string, string> = {
    tr: "Merhaba! Ben **Payoff Lab AI** asistanınız. Size lead verileriniz, randevularınız veya platform kullanımı hakkında nasıl yardımcı olabilirim?",
    en: "Hello! I am your **Payoff Lab AI** assistant. How can I help you with your lead data, appointments, or platform usage?",
    zh: "您好！我是您的 **Payoff Lab AI** 助手。我能如何帮助您处理潜客数据、预约或平台使用问题？",
    fr: "Bonjour ! Je suis votre assistant **Payoff Lab AI**. Comment puis-je vous aider avec vos données de prospects, vos rendez-vous ou l'utilisation de la plateforme ?",
    de: "Hallo! Ich bin Ihr **Payoff Lab AI** Assistent. Wie kann ich Ihnen mit Ihren Lead-Daten, Terminen oder der Plattformnutzung helfen?",
    es: "¡Hola! Soy tu asistente de **Payoff Lab AI**. ¿Cómo puedo ayudarte con tus datos de leads, citas o el uso de la plataforma?",
    ar: "مرحبًا! أنا مساعد **Payoff Lab AI** الخاص بك. كيف يمكنني مساعدتك في بيانات العملاء المحتملين أو المواعيد أو استخدام النظام الأساسي؟",
    ru: "Привет! Я ваш помощник **Payoff Lab AI**. Чем я могу помочь вам с данными о лидах, встречами или использованием платформы?",
    hi: "नमस्ते! मैं आपका **Payoff Lab AI** सहायक हूँ। मैं लीड डेटा, अपॉइंटमेंट या प्लेटफ़ॉर्म उपयोग में आपकी कैसे मदद कर सकता हूँ?",
    id: "Halo! Saya asisten **Payoff Lab AI** Anda. Bagaimana saya bisa membantu Anda dengan data prospek, janji temu, atau penggunaan platform Anda?"
};

// ─── Unified Intent & Date Extraction ────────────────────────────────────────

async function analyzeMeetingRequest(message: string, userTimezone: string): Promise<{ isBooking: boolean, startTime: string | null }> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('[analyzeMeetingRequest] GEMINI_API_KEY is missing');
        return { isBooking: false, startTime: null };
    }

    try {
        const nowUtc = new Date();
        const localNowStr = nowUtc.toLocaleString('en-US', { timeZone: userTimezone });

        const res = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 12000,
                retries: 2,
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this request: "${message}"
                            Current reference time (${userTimezone}): ${localNowStr}
                            
                            RULES:
                            1. isBooking is true if they want to schedule a meeting/appointment.
                            2. startTime MUST be an ISO-8601 UTC string.
                            3. Resolve relative dates (today, tomorrow, next week) using the reference time.
                            4. If no specific time is mentioned, return startTime: null.
                            
                            Return ONLY JSON:
                            {
                              "isBooking": boolean,
                              "startTime": "YYYY-MM-DDTHH:mm:00Z" (or null)
                            }`
                        }]
                    }],
                    generationConfig: { 
                        maxOutputTokens: 1000, 
                        temperature: 0,
                        responseMimeType: "application/json"
                    }
                })
            }
        );
        const data = await res.json();
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let result = { isBooking: false, startTime: null };
        try {
            result = JSON.parse(text.replace(/```json|```/g, '').trim());
        } catch (parseErr) {
            console.error('[analyzeMeetingRequest] Parse Error:', parseErr, 'for text:', text);
        }
        
        
        return {
            isBooking: !!result.isBooking,
            startTime: result.startTime && !isNaN(new Date(result.startTime).getTime()) ? new Date(result.startTime).toISOString() : null
        };
    } catch (err) {
        console.error('[analyzeMeetingRequest] CRITICAL Error:', err);
        return { isBooking: false, startTime: null };
    }
}

async function sendMeetingConfirmationEmail(
    userEmail: string,
    meetingTitle: string,
    startTime: string,
    hangoutLink: string,
    accountId: string,
    isTurkish: boolean,
    userTimezone: string
) {
    const supabase = await createClient();

    // Use primary Gmail integration for meeting confirmation emails
    const { getPrimaryGmailIntegration } = await import('@/features/integrations/providers/messaging/gmail');
    const gmailIntegration = await getPrimaryGmailIntegration(accountId, supabase as any);

    if (gmailIntegration) {
        try {
            const { sendGmailMessage } = await import('@/features/integrations/providers/messaging/gmail');
            const startDate = new Date(startTime);
            const localeStr = isTurkish ? 'tr-TR' : 'en-US';
            const formattedDate = startDate.toLocaleDateString(localeStr, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone
            });
            const formattedTime = startDate.toLocaleTimeString(localeStr, {
                hour: '2-digit', minute: '2-digit', timeZone: userTimezone
            });

            const emailSubject = isTurkish ? `📅 Toplantı Onayı: ${meetingTitle}` : `📅 Meeting Confirmation: ${meetingTitle}`;
            
            const emailBody = isTurkish 
                ? `Merhaba,\n\nToplantınız başarıyla oluşturuldu!\n\n📅 Toplantı Adı: ${meetingTitle}\n🗓 Tarih: ${formattedDate}\n🕐 Saat: ${formattedTime}\n🔗 Google Meet Linki: ${hangoutLink}\n\nToplantıya katılmak için yukarıdaki bağlantıya tıklayabilirsiniz.\n\nBu toplantı Payoff Lab AI tarafından otomatik olarak oluşturulmuştur.\n\nİyi görüşmeler!\n— Payoff Lab AI`
                : `Hello,\n\nYour meeting has been successfully created!\n\n📅 Meeting Title: ${meetingTitle}\n🗓 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n🔗 Google Meet Link: ${hangoutLink}\n\nYou can click the link above to join the meeting.\n\nThis meeting was automatically scheduled by Payoff Lab AI.\n\nBest regards,\n— Payoff Lab AI`;

            await sendGmailMessage(
                (gmailIntegration as any).id,
                userEmail,
                emailSubject,
                emailBody
            );
        } catch (err) {
            console.error('[Payoff Lab AI] Failed to send email via Gmail:', err);
        }
    }
}

// ─── Main sendMessage Action ──────────────────────────────────────────────────

export async function sendMessage(sessionId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
    
    if (!profile) return { error: 'Profile not found' };
    const accountId = profile.account_id;
    if (!accountId) return { error: 'Account not found' };

    const userEmail = user.email || '';

    // 1.5 Fetch account regional settings (Hybrid Mode)
    const { data: accountSettings } = await supabase
        .from('accounts')
        .select('timezone, language')
        .eq('id', accountId)
        .single();

    // 1. Save user message
    const { data: _userMsg, error: userMsgErr } = await supabase
        .from('ai_payofflab_messages')
        .insert({
            session_id: sessionId,
            role: 'user',
            content: message
        })
        .select()
        .single();

    if (userMsgErr) {
        console.error('Error saving user message:', userMsgErr);
        return { error: 'Failed to save message' };
    }

    // 2. Build context
    const systemPrompt = await buildAccountContext(accountId);

    // 3. Get chat history for this session (limited to last 20 for context)
    const { data: history } = await supabase
        .from('ai_payofflab_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);

    const messages = (history || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
    }));

    // Detect locale and timezone from headers (Fallback)
    let headerTimezone = 'Europe/Istanbul';
    let headerLocale = 'en-US';
    try {
        const headersList = await headers();
        headerTimezone = headersList.get('x-vercel-ip-timezone') || headersList.get('cf-timezone') || 'Europe/Istanbul';
        headerLocale = headersList.get('accept-language')?.split(',')[0] || 'en-US';
    } catch {}

    // Priority: DB Setting > Header Fallback
    const userTimezone = accountSettings?.timezone || headerTimezone;
    const userLocale = accountSettings?.language || (headerLocale.toLowerCase().startsWith('tr') ? 'tr' : 'en');
    
    const userLanguageStr = LANGUAGE_MAP[userLocale] || 'English';
    const isTurkish = userLocale.toLowerCase().startsWith('tr');

    // 4. Booking intent detection
    let meetingInfo: string | null = null;
    let meetingResultForAI: { created: boolean, hangoutLink?: string, startTime?: string, busy?: boolean, noCalendar?: boolean } | undefined = undefined;
    let calIntegration: any = null;
    let detectedStartTime: string | null = null;
    let detectedIntent = false;

    try {
        const analysis = await analyzeMeetingRequest(message, userTimezone);
        detectedIntent = analysis.isBooking;
        detectedStartTime = analysis.startTime;

        // SANITY CHECK: Protect against dates in the past (e.g., 2001 hallucinations)
        if (detectedIntent && detectedStartTime) {
            const checkDate = new Date(detectedStartTime);
            const now = new Date();
            // If the date is more than 24 hours in the past, or the year is clearly wrong
            if (checkDate < new Date(now.getTime() - 24 * 60 * 60 * 1000) || checkDate.getFullYear() < 2024) {
                console.warn(`[Payoff Lab AI] Sanity Check FAILED: Detected date ${detectedStartTime} is in the past or invalid.`);
                detectedStartTime = null;
                detectedIntent = false; // Reset to avoid booking bad date
            }
        }

        if (detectedIntent && detectedStartTime) {
            const startTime = detectedStartTime;
                // 1. Check for Google Calendar integration — USE ADMIN CLIENT to ensure visibility
                const adminClient = createAdminClient();
                const { data: calIntData, error: _calIntErr } = await adminClient
                    .from('integrations')
                    .select('id, config')
                    .eq('account_id', accountId)
                    .eq('provider', 'google_calendar')
                    .eq('status', 'connected')
                    .maybeSingle();
                
                calIntegration = calIntData;


                const isOnline = message.toLowerCase().includes('online') || message.toLowerCase().includes('google meet');
                const meetingTitle = isTurkish 
                    ? (isOnline ? `Payoff Lab AI Online Toplantısı` : `Payoff Lab AI Toplantısı`) 
                    : (isOnline ? `Payoff Lab AI Online Meeting` : `Payoff Lab AI Meeting`);

                // Try to associate with a lead if email is mentioned or in context
                let associatedLeadId: string | null = null;
                let targetAttendeeEmail = userEmail; // Fallback to admin if no lead email
                
                const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) {
                    const detectedEmail = emailMatch[0];
                    targetAttendeeEmail = detectedEmail;
                    
                    const { data: lead } = await supabase
                        .from('leads')
                        .select('id')
                        .eq('account_id', accountId)
                        .eq('email', detectedEmail)
                        .maybeSingle();
                        
                    if (lead) {
                        associatedLeadId = lead.id;
                    } else {
                        // AUTO-CREATE LEAD: If email provided but lead doesn't exist, create a quick lead
                        const { success: createSuccess, id: createdId, error: createErr } = await createLead({
                            first_name: detectedEmail.split('@')[0],
                            last_name: '(AI)',
                            email: detectedEmail,
                            source: 'AI Assistant'
                        });

                        if (createSuccess && createdId) {
                            associatedLeadId = createdId;
                        } else {
                            console.error('[Payoff Lab AI] createLead action failed:', createErr);
                            // Fallback to direct insertion if the action fails (unlikely given we have session)
                            const { data: newLead } = await adminClient.from('leads').insert({
                                account_id: accountId,
                                email: detectedEmail,
                                first_name: detectedEmail.split('@')[0],
                                source: 'AI Assistant'
                            }).select('id').single();
                            if (newLead) associatedLeadId = newLead.id;
                        }
                    }
                }
                
                // CRITICAL FAIL-SAFE: If still no lead_id (and meetings table requires it), 
                // we must find ANY lead or create a dummy one for the account
                if (!associatedLeadId) {
                    const { data: fallbackLead } = await supabase
                        .from('leads')
                        .select('id')
                        .eq('account_id', accountId)
                        .limit(1)
                        .maybeSingle();
                        
                    if (fallbackLead) {
                        associatedLeadId = fallbackLead.id;
                    } else {
                        // Create a default system lead if none exists
                        const { data: systemLead } = await adminClient.from('leads').insert({
                            account_id: accountId,
                            first_name: 'AI',
                            last_name: 'Contact',
                            source: 'System'
                        }).select('id').single();
                        associatedLeadId = systemLead?.id || null;
                    }
                }

                if (calIntegration) {
                    // Check availability
                    const { available } = await checkCalendarAvailability(
                        (calIntegration as any).id,
                        startTime,
                        60
                    );

                    if (available) {
                        const startDate = new Date(startTime);
                        const localeStr = isTurkish ? 'tr-TR' : 'en-US';
                        const formattedDate = startDate.toLocaleDateString(localeStr, {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone
                        });
                        const formattedTime = startDate.toLocaleTimeString(localeStr, {
                            hour: '2-digit', minute: '2-digit', timeZone: userTimezone
                        });

                        const result = await createCalendarEvent(
                            (calIntegration as any).id,
                            {
                                title: meetingTitle,
                                startTime,
                                durationMinutes: 60,
                                attendeeEmail: targetAttendeeEmail,
                                description: `Generated by Payoff Lab AI Assistant. Request: "${message}"`
                            }
                        );

                        if (result.success) {
                            // 1. Save to meetings table (Payoff Lab internal calendar)
                            try {
                                const meetStart = new Date(startTime);
                                const meetEnd = new Date(meetStart.getTime() + 60 * 60000); // 60 min default
                                // 1. Save to meetings table (Payoff Lab internal calendar) — USE ADMIN CLIENT
                                const { data: meetData, error: dbInsertErr } = await adminClient.from('meetings').insert({
                                    account_id: accountId,
                                    agent_id: user.id,
                                    title: meetingTitle,
                                    description: `Generated by Payoff Lab AI Assistant. Request: "${message}"`,
                                    scheduled_at: startTime,
                                    start_time: meetStart.toISOString(),
                                    end_time: meetEnd.toISOString(),
                                    duration_minutes: 60,
                                    status: 'scheduled',
                                    meeting_type: result.hangoutLink ? 'video' : 'other',
                                    meeting_link: result.hangoutLink ?? null,
                                    google_event_id: (result as any).eventId ?? null,
                                    lead_id: associatedLeadId,
                                } as any).select('id').single();

                                if (dbInsertErr) {
                                    console.error('[Payoff Lab AI] DB Insert Failure:', dbInsertErr);
                                    throw new Error(`DB Error: ${dbInsertErr.message}`);
                                }

                                // Auto-enable avatar bot
                                if (meetData?.id && result.hangoutLink) {
                                    try {
                                        const { data: acctCfg } = await adminClient
                                            .from('accounts')
                                            .select('ai_config')
                                            .eq('id', accountId)
                                            .single()
                                        if ((acctCfg?.ai_config as any)?.avatar_config?.enabled) {
                                            const { createBot } = await import('@/features/meetings/services/recall')
                                            const bot = await createBot({
                                                meeting_url: result.hangoutLink,
                                                meeting_id: meetData.id,
                                                account_id: accountId,
                                                join_at: startTime,
                                            })
                                            await adminClient.from('meetings').update({
                                                ai_avatar_enabled: true,
                                                ai_avatar_bot_id: bot.id,
                                                ai_avatar_status: 'pending',
                                            }).eq('id', meetData.id)
                                        }
                                    } catch (avatarErr) {
                                        console.error('[Payoff Lab AI] Avatar bot error (non-blocking):', avatarErr)
                                    }
                                }

                                // Trigger External Notifications
                                try {
                                    await notifyAdmins(accountId, {
                                        title: isTurkish ? 'AI Yeni Toplantı Oluşturdu' : 'AI Booked a New Meeting',
                                        message: `${meetingTitle} - ${new Date(startTime).toLocaleString(isTurkish ? 'tr-TR' : 'en-US')}`,
                                        type: 'success',
                                        link: '/admin/calendar'
                                    });

                                    await sendSlackNotification(accountId, 'meetings', {
                                        lead_name: associatedLeadId ? 'Associated Lead' : 'Payoff Lab User',
                                        start_time: new Date(startTime).toLocaleString(),
                                        title: `[AI Assistant] ${meetingTitle}`
                                    });

                                    await sendDiscordNotification(accountId, 'meetings', {
                                        lead_name: associatedLeadId ? 'Associated Lead' : 'Payoff Lab User',
                                        start_time: new Date(startTime).toLocaleString(),
                                        title: `[AI Assistant] ${meetingTitle}`
                                    });
                                } catch (notifErr) {
                                    console.error('[Payoff Lab AI] Notification error:', notifErr);
                                }
                            } catch (dbErr) {
                                console.error('[Payoff Lab AI] Could not save meeting to DB:', dbErr);
                            }

                            // 2. Activity / Event log
                            try {
                                await supabase.from('event_logs').insert({
                                    account_id: accountId,
                                    event_type: 'meeting.booked',
                                    entity_type: 'ai_payofflab_session',
                                    entity_id: sessionId,
                                    data: {
                                        title: meetingTitle,
                                        time: startTime,
                                        hangout_link: result.hangoutLink ?? null,
                                        user_email: userEmail
                                    } as any,
                                });
                            } catch (_) {}

                            // 3. Send email confirmation if hangoutLink exists
                            if (result.hangoutLink) {
                                await sendMeetingConfirmationEmail(
                                    userEmail,
                                    meetingTitle,
                                    startTime,
                                    result.hangoutLink,
                                    accountId,
                                    isTurkish,
                                    userTimezone
                                );
                            }
                            
                            meetingResultForAI = { created: true, hangoutLink: result.hangoutLink, startTime };

                            if (isTurkish) {
                                meetingInfo = `\n\n---\n✅ **Toplantı Oluşturuldu!**\n\n| Detay | Bilgi |\n|-------|-------|\n| 📅 Tarih | ${formattedDate} |\n| 🕐 Saat | ${formattedTime} |\n| ⏱ Süre | 60 dakika |\n| 🔗 Google Meet | [Toplantıya Katıl](${result.hangoutLink || '#'}) |\n\n📧 Onay bilgileri **${targetAttendeeEmail}** adresine gönderildi.`;
                            } else {
                                meetingInfo = `\n\n---\n✅ **Meeting Created!**\n\n| Detail | Information |\n|-------|-------|\n| 📅 Date | ${formattedDate} |\n| 🕐 Time | ${formattedTime} |\n| ⏱ Duration | 60 minutes |\n| 🔗 Google Meet | [Join Meeting](${result.hangoutLink || '#'}) |\n\n📧 Confirmation has been sent to **${targetAttendeeEmail}**.`;
                            }
                        } else {
                            meetingResultForAI = { created: false };
                            meetingInfo = isTurkish 
                                ? `\n\n⚠️ Google Calendar'a erişim sağlandı ancak event oluşturulamadı. Lütfen takvim izinlerini kontrol edin.`
                                : `\n\n⚠️ Accessed Google Calendar but could not create the event. Please check your calendar permissions.`;
                        }
                    } else {
                        meetingResultForAI = { created: false, busy: true };
                        const startDate = new Date(startTime);
                        const localeStr = isTurkish ? 'tr-TR' : 'en-US';
                        const formattedTime = startDate.toLocaleTimeString(localeStr, {
                            hour: '2-digit', minute: '2-digit', timeZone: userTimezone
                        });
                        meetingInfo = isTurkish
                            ? `\n\n⚠️ **${formattedTime}** için takviminizde başka bir etkinlik bulunuyor. Farklı bir zaman önerir misiniz?`
                            : `\n\n⚠️ You have another event scheduled at **${formattedTime}**. Could you suggest a different time?`;
                    }
                } else {
                    // Google Calendar not connected — still save to Payoff Lab internal meetings table
                    try {
                        const meetStart = new Date(startTime);
                        const meetEnd = new Date(meetStart.getTime() + 60 * 60000);
                        const { data: _meetData, error: dbInsertErr } = await adminClient.from('meetings').insert({
                            account_id: accountId,
                            agent_id: user.id,
                            title: meetingTitle,
                            description: `Generated by Payoff Lab AI Assistant (No Google Calendar). Request: "${message}"`,
                            scheduled_at: startTime,
                            start_time: meetStart.toISOString(),
                            end_time: meetEnd.toISOString(),
                            duration_minutes: 60,
                            status: 'scheduled',
                            meeting_type: 'video', // Default
                            lead_id: associatedLeadId,
                        } as any).select('id').single();

                        if (dbInsertErr) {
                            console.error('[Payoff Lab AI] DB Insert Failure (No Calendar):', dbInsertErr);
                            meetingResultForAI = { created: false };
                        } else {
                            meetingResultForAI = { created: true, noCalendar: true, startTime };
                            meetingInfo = isTurkish
                                ? `\n\n💡 **Toplantı Payoff Lab takvimine kaydedildi!** Ancak Google Calendar bağlı olmadığı için Google üzerinde oluşturulamadı. Ayarlar → Entegrasyonlar sayfasından Google Takvim'i bağlayabilirsiniz.`
                                : `\n\n💡 **Meeting saved to Payoff Lab calendar!** However, it couldn't be created on Google as the integration is not connected. You can connect Google Calendar in Settings → Integrations.`;
                        }
                    } catch (dbErr) {
                        console.error('[Payoff Lab AI] Could not save meeting (no calendar catch):', dbErr);
                        meetingResultForAI = { created: false };
                    }
                }
            }
        } catch (bookingErr: any) {
        console.error('[Payoff Lab AI] CRITICAL Booking failure:', bookingErr);
        meetingResultForAI = { created: false, busy: false };
        meetingInfo = isTurkish 
            ? `\n\n❌ **Sistem Hatası:** Randevu oluşturulurken bir hata oluştu: ${bookingErr.message || 'Bilinmeyen hata'}`
            : `\n\n❌ **System Error:** An error occurred while creating the appointment: ${bookingErr.message || 'Unknown error'}`;
    }


    // 5. Generate AI Response
    let aiSystemInfo = '';
    
    // Provide explicit feedback about booking attempt — CRITICAL for accuracy
    if (meetingResultForAI?.created) {
        const linkDetail = meetingResultForAI.hangoutLink 
            ? ` (Meet Link: ${meetingResultForAI.hangoutLink})` 
            : (meetingResultForAI.noCalendar ? ' (Payoff Lab Calendar ONLY - No Google Connection)' : ' (Google Calendar updated)');
            
        aiSystemInfo = isTurkish 
            ? `\n\nSİSTEM BİLGİSİ: Toplantı BAŞARIYLA oluşturuldu (${meetingResultForAI.startTime}).${linkDetail}. Kullanıcıya onayı ver.`
            : `\n\nSYSTEM INFO: Meeting was SUCCESSFULLY created at ${meetingResultForAI.startTime}.${linkDetail}. Confirm to the user.`;
    } else if (meetingResultForAI?.busy) {
        aiSystemInfo = isTurkish 
            ? `\n\nSİSTEM BİLGİSİ: İstenilen saat dolu. Özür dile ve alternatif saat iste.`
            : `\n\nSYSTEM INFO: Slot is busy. Apologize and ask for alternative.`;
    } else if (meetingResultForAI?.created === false) {
        aiSystemInfo = isTurkish
            ? `\n\nSİSTEM BİLGİSİ: KRİTİK HATA! Toplantı oluşturulamadı. Kullanıcıya veritabanı veya teknik bir sorun nedeniyle şu an randevu oluşturamadığını bildir. Hata Detayı: ${meetingInfo}`
            : `\n\nSYSTEM INFO: CRITICAL ERROR! Meeting could not be created. Inform the user about a technical/database issue. Error Detail: ${meetingInfo}`;
    } else if (meetingResultForAI?.noCalendar) {
        aiSystemInfo = isTurkish
            ? `\n\nSİSTEM BİLGİSİ: Google Calendar bağlı değil ancak toplantı yine de Payoff Lab iç takvimine kaydedildi. Kullanıcıya ayarlar sayfasından Google Takvim'i bağlayabileceklerini hatırlatabilirsin.`
            : `\n\nSYSTEM INFO: Google Calendar is not connected, but the meeting was still saved to the internal Payoff Lab calendar. You can remind the user they can connect Google Calendar in Settings.`;
    } else {
        // Force the AI to be honest if no booking was confirmed by the backend
        aiSystemInfo = isTurkish
            ? `\n\nSİSTEM BİLGİSİ: KRİTİK UYARI! Şu an bir randevu oluşturma İŞLEMİ YAPILAMADI çünkü tarih/saat bilgisi sistem tarafından algılanamadı. Kullanıcıya "Üzgünüm, istediğiniz günü ve saati netleştirebilir misiniz? (Örn: Yarın saat 14:00)" diyerek sorman gerekiyor. SAKIN ama SAKIN planlıyorum ya da hallettim deme!`
            : `\n\nSYSTEM INFO: CRITICAL! No booking was made because the date/time could not be parsed. You MUST ask the user to clarify the day and time. DO NOT pretend you are scheduling it!`;
    }

    try {
        const geminiMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' as const : 'user' as const,
            parts: [{ text: m.content }] as [{ text: string }]
        }));

        const result = await generateCoreResponse({
            systemPrompt: `You are Payoff Lab AI, an intelligent platform assistant. Your language is ${userLanguageStr}, but always reply in the exact language the user used.
            
OFFICIAL CAPABILITY: You HAVE the authority to schedule meetings, online calls, and appointments. The system detects your intent and handles the Google Calendar/Meet creation automatically. 
If the system says a meeting was created (see AI SYSTEM INFO below), share the details. 
If the user wants a meeting but no date is set, tell them you CAN do it and ask for a time. If the user's email is not specified in the message or context, ask for it to send the invitation.

Account Context:
${systemPrompt}

AI SYSTEM INFO:
${aiSystemInfo}`,
            messages: geminiMessages,
            model: 'gemini-flash-latest',
            temperature: 0.7,
            maxTokens: 2000
        });

        if (result.error) {
            throw new Error(result.error);
        }

        // BUILD FINAL RESPONSE WITH DEBUG INFO
        let aiResponseText = (result.response || '');
        
        // Always append meeting info if exists
        if (meetingInfo) {
            aiResponseText += `\n\n${meetingInfo}`;
        }

        // 6. Save AI message

        // 6. Save AI message
        const { data: aiMsg } = await supabase
            .from('ai_payofflab_messages')
            .insert({
                session_id: sessionId,
                role: 'assistant',
                content: aiResponseText || 'Bir hata oluştu, lütfen tekrar deneyin.'
            })
            .select()
            .single();

        revalidatePath('/admin/ai-payofflab');
        return { data: aiMsg };
    } catch (error: any) {
        console.error('AI Service (Core) error:', error);
        return { error: 'AI Service Error: ' + error.message };
    }
}

export async function createNewSession(title?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

    if (!profile?.account_id) return { error: 'Account not found' };

    // Fetch account language setting
    const { data: account } = await supabase
        .from('accounts')
        .select('language')
        .eq('id', profile.account_id)
        .single();
    
    const userLocale = account?.language || 'tr';

    const { data: session, error } = await supabase
        .from('ai_payofflab_sessions')
        .insert({
            user_id: user.id,
            account_id: profile.account_id,
            title: title || (userLocale === 'tr' ? 'Yeni AI Konuşması' : 'New AI Conversation')
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating session:', error);
        return { error: error.message };
    }

    // Insert initial assistant welcome message
    const welcomeMessage = WELCOME_MESSAGES[userLocale as keyof typeof WELCOME_MESSAGES] || WELCOME_MESSAGES['en'];

    await supabase.from('ai_payofflab_messages').insert({
        session_id: session.id,
        role: 'assistant',
        content: welcomeMessage
    });

    revalidatePath('/admin/ai-payofflab');
    return { data: session };
}

export async function getSessions() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Trigger background sync to keep data fresh (without revalidation to avoid render errors)
    syncGoogleCalendarEvents(false).catch(err => console.error('[Payoff Lab AI] Background sync failed:', err));

    const { data: sessions } = await supabase
        .from('ai_payofflab_sessions')
        .select('id, user_id, account_id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return sessions || [];
}

export async function getMessages(sessionId: string) {
    const supabase = await createClient();
    const { data: messages } = await supabase
        .from('ai_payofflab_messages')
        .select('id, session_id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    return messages || [];
}
