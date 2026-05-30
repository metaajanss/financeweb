/**
 * Proactive Nurture/Follow-up System for Jumpix
 */

import { createAdminClient } from '@/core/db/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/types';
import { sendViaChannel } from '@/core/channels';
import { getPrimaryGmailIntegration } from '@/features/integrations/providers/messaging/gmail';
import { OpenRouterClient } from '@/core/ai/openrouter';
import { sendSlackNotification } from '@/features/integrations/providers/messaging/slack';

import { type NurtureConfig, DEFAULT_NURTURE_CONFIG } from '@/shared/types/ai-config';


interface LeadWithContext {
    id: string;
    account_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
    status: string;
    metadata: any;
    conversation_id: string;
    last_message_at: string | null;
    conversation_status: string;
    nurture_count: number;
    last_nurture_at: string | null;
    account: {
        ai_config: any;
        name: string;
        company_name: string | null;
    };
}

interface NurtureResult {
    leadId: string;
    success: boolean;
    channel: string;
    error?: string;
    message?: string;
}

/**
 * Generate a personalized nurture message using OpenRouter AI
 */
export async function generateNurtureMessage(
    lead: LeadWithContext,
    config: NurtureConfig,
    accountName: string,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<{ message: string; subject?: string }> {
    const openRouter = new OpenRouterClient(
        process.env.OPENROUTER_API_KEY || '',
        process.env.NEXT_PUBLIC_APP_URL || 'https://jumpix.app',
        'Jumpix AI'
    );

    const aiConfig = (lead.account.ai_config || {}) as any;
    const brandVoice = aiConfig.brand_voice || 'professional';
    const knowledgeBase = aiConfig.knowledge_base || '';
    const personaName = aiConfig.persona_name || 'AI Assistant';
    const personaIntro = aiConfig.persona_intro || '';
    const firstName = lead.first_name || 'there';
    const tone = config.tone || 'friendly';
    
    const recentContext = conversationHistory
        .slice(-5)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

    const includeCta = config.include_meeting_cta;
    const customPrompt = (config as any).custom_prompt || '';

    const systemPrompt = `You are ${personaName}, an AI assistant for ${accountName || 'our company'}.
${personaIntro}

Brand Voice: ${brandVoice}
${knowledgeBase ? `Knowledge Base Context:\n${knowledgeBase}\n` : ''}
${customPrompt}

Write a brief, personalized nurture follow-up message (2-4 sentences).
- Tone: ${tone}
- Be warm but professional
- Reference previous conversation naturally
- Do not be pushy
- ${includeCta ? 'Include soft CTA for scheduling' : 'Focus on re-engaging'}
- No placeholders, use actual values

The lead is name is ${firstName}.`;

    const userPrompt = `Write nurture follow-up for ${firstName}.

Context: ${recentContext || 'Initial outreach'}

Write natural, engaging message.`;

    try {
        const needsSubject = config.channels.includes('email');

        // Parallelize: when an email subject is needed, draft a generic subject
        // alongside the message so both LLM round-trips overlap (saves 2-3s per lead).
        const messagePromise = openRouter.chatCompletion({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        const subjectPromise = needsSubject
            ? openRouter.chatCompletion({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [
                    { role: 'system', content: 'Write compelling email subject lines. Be concise.' },
                    {
                        role: 'user',
                        content: `Write a concise (max 50 chars) follow-up email subject line for a nurture email to ${firstName}${accountName ? ` from ${accountName}` : ''}. Context: ${recentContext || 'Initial outreach'}. Tone: ${tone}. Output only the subject line.`
                    }
                ],
                temperature: 0.6,
                max_tokens: 50
            })
            : Promise.resolve(null);

        const [response, subjectResponse] = await Promise.all([messagePromise, subjectPromise]);

        const message = response.choices?.[0]?.message?.content?.trim();

        if (!message) throw new Error('Empty response from AI');

        let subject: string | undefined;
        if (subjectResponse) {
            subject = subjectResponse.choices?.[0]?.message?.content?.trim();
            subject = subject?.replace(/["']/g, '').replace(/^Subject:\s*/i, '');
        }

        return { message, subject };
    } catch (error) {
        console.error('[Nurture] AI generation error:', error);
        
        const fallbacks = [
            `Hi ${firstName}, just wanted to follow up. Let me know if you have any questions!`,
            `Hey ${firstName}, checking in to see if you had a chance to review my message.`,
            `Hi ${firstName}, I wanted to reach out again. Would love to chat when you are free.`
        ];
        
        return { 
            message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
            subject: config.channels.includes('email') ? 'Quick follow-up' : undefined
        };
    }
}

async function findLeadsNeedingNurture(
    supabase: SupabaseClient<Database>,
    batchSize: number = 50,
    processedNurtures: Set<string> = new Set()
): Promise<LeadWithContext[]> {
    const now = new Date();
    
    const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, ai_config, name, company_name')
        .not('ai_config', 'is', null);

    if (accountsError || !accounts) {
        console.error('[Nurture] Error fetching accounts:', accountsError);
        return [];
    }

    const nurtureAccounts = accounts.filter(acc => (acc.ai_config as any)?.nurture_config?.enabled === true);
    if (nurtureAccounts.length === 0) return [];

    const results: LeadWithContext[] = [];

    for (const account of nurtureAccounts) {
        const config: NurtureConfig = { ...DEFAULT_NURTURE_CONFIG, ...(account.ai_config as any)?.nurture_config };

        const accountTimezone = (account.ai_config as any)?.timezone || 'UTC';
        const hourNum = parseInt(new Date().toLocaleString('en-US', { 
            timeZone: accountTimezone, hour: 'numeric', hour12: false 
        }), 10);
        
        if (hourNum < config.send_time_start || hourNum >= config.send_time_end) continue;

        const inactivityThreshold = new Date(now);
        inactivityThreshold.setHours(inactivityThreshold.getHours() - config.inactivity_threshold_hours);
        const minTimeSinceLastNurture = new Date(now.getTime() - config.days_between_messages * 24 * 60 * 60 * 1000);

        const { data: leads, error: leadsError } = await supabase
            .from('conversations')
            .select(`id, lead_id, last_message_at, status, lead:leads!inner(id, account_id, first_name, last_name, email, phone, source, status, metadata)`)
            .eq('account_id', account.id)
            .eq('status', 'active')
            .lt('last_message_at', inactivityThreshold.toISOString())
            .order('last_message_at', { ascending: true })
            .limit(batchSize);

        if (leadsError || !leads) continue;

        for (const conv of leads) {
            const lead = conv.lead as any;
            if (!lead) continue;

            const leadMeta = lead.metadata || {};
            const nurtureCount = leadMeta.nurture_count || 0;
            const lastNurtureAt = leadMeta.last_nurture_at;

            if (nurtureCount >= config.max_nurture_messages) continue;
            if (lastNurtureAt && new Date(lastNurtureAt) > minTimeSinceLastNurture) continue;

            const cacheKey = `${account.id}:${lead.id}`;
            if (processedNurtures.has(cacheKey)) continue;

            results.push({
                id: lead.id, account_id: account.id,
                first_name: lead.first_name, last_name: lead.last_name,
                email: lead.email, phone: lead.phone, source: lead.source,
                status: lead.status, metadata: leadMeta,
                conversation_id: conv.id, last_message_at: conv.last_message_at,
                conversation_status: conv.status || 'active', nurture_count: nurtureCount,
                last_nurture_at: lastNurtureAt,
                account: { ai_config: account.ai_config, name: account.name, company_name: account.company_name }
            });
            processedNurtures.add(cacheKey);
        }
    }
    return results;
}

async function getConversationHistory(supabase: SupabaseClient<Database>, conversationId: string) {
    const { data: messages } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10);

    return (messages || []).map(m => ({
        role: m.sender_type === 'lead' ? 'user' : m.sender_type === 'ai' ? 'assistant' : 'system',
        content: m.content
    }));
}

async function sendNurtureMessage(
    supabase: SupabaseClient<Database>,
    lead: LeadWithContext,
    config: NurtureConfig
): Promise<NurtureResult> {
    const accountName = lead.account.company_name || lead.account.name;
    const conversationHistory = await getConversationHistory(supabase, lead.conversation_id);

    const { message, subject } = await generateNurtureMessage(lead, config, accountName, conversationHistory);

    const channel = config.channels[0];
    let resolvedGmailId: string | undefined;
    if (channel === 'email') {
        const primary = await getPrimaryGmailIntegration(lead.account_id, supabase as any);
        if (primary) resolvedGmailId = primary.id;
    }

    const sendOptions: { subject?: string } = channel === 'email' && subject ? { subject } : {};

    const { success, error: sendError, channel: usedChannel } = await sendViaChannel(
        lead.id, message, channel, supabase, sendOptions, resolvedGmailId
    );

    if (success) {
        const newNurtureCount = lead.nurture_count + 1;
        const updatedMetadata = {
            ...lead.metadata,
            nurture_count: newNurtureCount,
            last_nurture_at: new Date().toISOString(),
            nurture_history: [...(lead.metadata.nurture_history || []), {
                sent_at: new Date().toISOString(),
                channel: usedChannel || channel,
                message_preview: message.substring(0, 100)
            }]
        };

        await supabase.from('leads').update({ metadata: updatedMetadata }).eq('id', lead.id);
        await supabase.from('messages').insert({
            conversation_id: lead.conversation_id,
            sender_type: 'ai',
            content: message,
            metadata: { is_nurture: true, channel: usedChannel || channel }
        });
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', lead.conversation_id);
        await supabase.from('event_logs').insert({
            account_id: lead.account_id,
            event_type: 'nurture.sent',
            entity_type: 'lead',
            entity_id: lead.id,
            data: { channel: usedChannel || channel, nurture_count: newNurtureCount, message_preview: message.substring(0, 100) } as any
        });

        sendSlackNotification(lead.account_id, 'nurture', {
            lead_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead',
            channel: usedChannel || channel,
            message_preview: message.substring(0, 80)
        }).catch(() => {});

        return { leadId: lead.id, success: true, channel: usedChannel || channel, message };
    } else {
        await supabase.from('event_logs').insert({
            account_id: lead.account_id,
            event_type: 'nurture.failed',
            entity_type: 'lead',
            entity_id: lead.id,
            data: { error: sendError, channel } as any
        });
        return { leadId: lead.id, success: false, channel, error: sendError || 'Unknown error' };
    }
}

export async function processNurtureFollowUps(
    batchSize: number = 30,
    supabaseClient?: SupabaseClient<Database>
): Promise<{ processed: number; successful: number; failed: number; errors: string[] }> {
    const supabase = supabaseClient || createAdminClient();
    const processedNurtures = new Set<string>();

    console.log('[Nurture] Starting nurture follow-up processing...');

    try {
        const leads = await findLeadsNeedingNurture(supabase, batchSize, processedNurtures);
        if (leads.length === 0) {
            return { processed: 0, successful: 0, failed: 0, errors: [] };
        }

        const results: NurtureResult[] = [];
        const errors: string[] = [];

        for (const lead of leads) {
            const config: NurtureConfig = { ...DEFAULT_NURTURE_CONFIG, ...(lead.account.ai_config as any)?.nurture_config };
            try {
                const result = await sendNurtureMessage(supabase, lead, config);
                results.push(result);
                await new Promise(r => setTimeout(r, 500));
            } catch (error: any) {
                errors.push(`Lead ${lead.id}: ${error.message}`);
                results.push({ leadId: lead.id, success: false, channel: config.channels[0], error: error.message });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[Nurture] Completed: ${successful} successful, ${failed} failed`);

        return { processed: results.length, successful, failed, errors };
    } catch (error: any) {
        return { processed: 0, successful: 0, failed: 0, errors: [error.message] };
    }
}

export async function getNurtureStats(supabase: SupabaseClient<Database>, accountId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: events } = await supabase
        .from('event_logs')
        .select('data, entity_id')
        .eq('account_id', accountId)
        .eq('event_type', 'nurture.sent')
        .gte('created_at', since.toISOString());

    if (!events) return { totalSent: 0, byChannel: {}, responseRate: 0 };

    const byChannel: Record<string, number> = {};
    let totalSent = 0;

    for (const event of events) {
        totalSent++;
        const channel = (event.data as any)?.channel || 'unknown';
        byChannel[channel] = (byChannel[channel] || 0) + 1;
    }

    return { totalSent, byChannel, responseRate: 0 };
}
