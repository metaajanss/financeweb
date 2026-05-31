import { createClient } from '@/core/db/server';
import { HELP_ARTICLES } from '@/config/help-articles';

export interface AIExecutionContext {
    accountInfo: any;
    leads: any[];
    conversations: any[];
    meetings: any[];
    integrations: any[];
    sequences: any[];
    helpArticles: any[];
}

export async function buildAccountContext(accountId: string): Promise<string> {
    const supabase = await createClient();

    // Fetch only the columns actually used in the prompt — avoids transferring full rows
    const [
        { data: account },
        { data: leads },
        { data: conversations },
        { data: meetings },
        { data: integrations },
        { data: sequences }
    ] = await Promise.all([
        supabase.from('accounts').select('business_name, name, plan_id, subscription_status').eq('id', accountId).single(),
        supabase.from('leads').select('id, first_name, last_name, email, status, source, created_at').eq('account_id', accountId).order('created_at', { ascending: false }).limit(20),
        supabase.from('conversations').select('id, status, last_message_at').eq('account_id', accountId).limit(50),
        supabase.from('meetings').select('id, title, status, scheduled_at').eq('account_id', accountId).limit(20),
        supabase.from('integrations').select('provider, status').eq('account_id', accountId),
        supabase.from('sequences').select('id, name, is_active').eq('account_id', accountId)
    ]);

    const context = `
YOU ARE "AI PAYOFF LAB", AN INTELLIGENT DATA ANALYST AND PLATFORM EXPERT FOR THE PAYOFF LAB B2B SAAS.
USER IS ASKING QUESTIONS ABOUT THEIR ACCOUNT DATA AND HOW TO USE THE PLATFORM.

--- BUSINESS INFO ---
Account Name: ${account?.business_name || account?.name}
Plan: ${account?.plan_id || 'free'}
Status: ${account?.subscription_status || 'trialing'}

--- HELP CENTER ARTICLES (USE THIS TO ANSWER "HOW TO" QUESTIONS) ---
${HELP_ARTICLES.map(art => `Title: ${art.title}\nContent: ${art.content}`).join('\n\n')}

--- DASHBOARD DATA SUMMARY ---
Total Leads: ${leads?.length || 0}
Active Conversations: ${conversations?.filter(c => c.status === 'active').length || 0}
Total Meetings: ${meetings?.length || 0}
Connected Integrations: ${integrations?.filter(i => i.status === 'connected').map(i => i.provider).join(', ') || 'None'}
Active Sequences: ${sequences?.filter(s => s.is_active).length || 0}

--- RAW DATA SAMPLES (FOR DETAILED QUESTIONS) ---
LEADS (Last 10):
${leads?.slice(0, 10).map(l => `- ${l.first_name} ${l.last_name} (${l.email}, Status: ${l.status}, Source: ${l.source})`).join('\n') || 'No leads yet'}

UPCOMING MEETINGS:
${meetings?.filter(m => m.status === 'scheduled').slice(0, 5).map(m => `- ${m.title} at ${m.scheduled_at}`).join('\n') || 'No scheduled meetings'}

INTEGRATION STATUS:
${integrations?.map(i => `- ${i.provider}: ${i.status}`).join('\n') || 'No integrations configured'}

INSTRUCTIONS:
1. IMPORTANT: ALWAYS respond in the exact same language that the user wrote to you in (Default if unknown: Turkish).
2. Use Markdown formatting for tables, bold text, and lists.
3. If asked about lead stats, calculate them from the data provided.
4. If asked "how to", refer to the Help Center Articles.
5. If the user asks for more than 1000 items, explain that you are showing the most relevant/recent data.
6. Be conversational, professional, and helpful. Focus on providing actionable sales insights.
7. MEETING SCHEDULING: You CAN schedule meetings. If the user mentions wanting a meeting, online call, or any appointment, confirm you will create it. The system will automatically create a Google Calendar event with a Google Meet link and send confirmation to their email. Tell the user the meeting will be created.
8. If Google Calendar is not connected (shown in INTEGRATION STATUS), politely inform the user and guide them to Settings → Integrations to connect it first.
    `;

    return context;
}
