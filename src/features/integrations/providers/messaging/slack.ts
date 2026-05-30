import { createClient } from '@/core/db/server';
import { createAdminClient } from '@/core/db/admin';
import { fetchWithRetry } from '@/core/http/fetch';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/types';

export interface SlackConfig {
    bot_token: string;
    channel_id: string;
    notifications: {
        leads: boolean;
        meetings: boolean;
        messages: boolean;
        errors: boolean;
        reminders: boolean;
        nurture: boolean;
        ai_weekly_report: boolean;
    };
}

export interface SlackLeadData {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    source?: string;
}

export interface SlackMeetingData {
    lead_name: string;
    start_time: string;
    title: string;
}

export interface SlackMessageData {
    sender_name: string;
    text: string;
}

export interface SlackErrorData {
    severity: string;
    message: string;
}

export interface SlackReminderData {
    minutes?: string;
    lead_name: string;
    title: string;
    time: string;
}

export interface SlackNurtureData {
    lead_name: string;
    channel: string;
    message_preview: string;
}

export interface SlackAIReportData {
    score: string;
    grade: string;
    conversations: string;
    top_insight: string;
}

export type SlackNotificationData = SlackLeadData | SlackMeetingData | SlackMessageData | SlackErrorData | SlackReminderData | SlackNurtureData | SlackAIReportData;

async function _sendSlackNotificationCore(supabase: SupabaseClient<Database>, accountId: string, type: keyof SlackConfig['notifications'], data: SlackNotificationData) {
    const { data: integration, error } = await supabase
        .from('integrations')
        .select('config, status')
        .eq('account_id', accountId)
        .eq('provider', 'slack')
        .single();

    if (error || !integration || integration.status !== 'connected') return;

    const config = integration.config as unknown as SlackConfig;
    if (!config.notifications[type]) return;

    const message = formatSlackMessage(type, data);

    const response = await fetchWithRetry('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.bot_token}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
        timeoutMs: 10000,
        retries: 1,
        body: JSON.stringify({
            channel: config.channel_id,
            ...message
        }),
    });

    const result = await response.json();
    if (!result.ok) {
        console.error('[SlackService] Slack API error:', result.error);
    }
}

export async function sendSlackNotification(accountId: string, type: keyof SlackConfig['notifications'], data: SlackNotificationData) {
    try {
        const supabase = await createClient();
        await _sendSlackNotificationCore(supabase, accountId, type, data);
    } catch (error) {
        console.error('[SlackService] Unexpected error:', error);
    }
}

// Use this from background jobs / server-side processors that already use admin client
export async function sendSlackNotificationAdmin(accountId: string, type: keyof SlackConfig['notifications'], data: SlackNotificationData) {
    try {
        const supabase = createAdminClient();
        await _sendSlackNotificationCore(supabase, accountId, type, data);
    } catch (error) {
        console.error('[SlackService] Unexpected error:', error);
    }
}

/**
 * Backward compatibility alias for sendSlackNotification
 * Used by legacy modules and integration tests.
 */
export async function sendSlackMessage(accountId: string, type: keyof SlackConfig['notifications'], data: SlackNotificationData) {
    return sendSlackNotification(accountId, type, data);
}

function formatSlackMessage(type: string, data: SlackNotificationData) {
    switch (type) {
        case 'leads': {
            const leadData = data as SlackLeadData;
            return {
                text: `🚀 *New Lead Inbound!*`,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🚀 New Lead Inbound!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Name:* ${leadData.first_name} ${leadData.last_name}\n*Email:* ${leadData.email || 'N/A'}\n*Phone:* ${leadData.phone || 'N/A'}\n*Source:* ${leadData.source || 'Manual'}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View Lead Details",
                                    emoji: true
                                },
                                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads?search=${encodeURIComponent(leadData.email || leadData.phone || '')}`,
                                style: "primary"
                            }
                        ]
                    }
                ]
            };
        }
        case 'meetings': {
            const meetingData = data as SlackMeetingData;
            return {
                text: `📅 *New Meeting Scheduled!*`,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "📅 New Meeting Scheduled!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*With:* ${meetingData.lead_name}\n*When:* ${meetingData.start_time}\n*Topic:* ${meetingData.title}`
                        }
                    }
                ]
            };
        }
        case 'messages': {
            const messageData = data as SlackMessageData;
            return {
                text: `💬 *New Message Received!*`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*New message from ${messageData.sender_name}:*\n> ${messageData.text}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Reply in Dashboard",
                                    emoji: true
                                },
                                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/conversations`,
                                style: "primary"
                            }
                        ]
                    }
                ]
            };
        }
        case 'errors': {
            const errorData = data as SlackErrorData;
            return {
                text: `⚠️ *System Alert!*`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `⚠️ *System Alert!*\n*Severity:* ${errorData.severity}\n*Message:* ${errorData.message}`
                        }
                    }
                ]
            };
        }
        case 'reminders': {
            const reminderData = data as SlackReminderData;
            return {
                text: `⏰ *Appointment Reminder!*`,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "⏰ Appointment Reminder!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Meeting in ${reminderData.minutes || '60'} minutes!*\n*With:* ${reminderData.lead_name}\n*Topic:* ${reminderData.title}\n*Time:* ${reminderData.time}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View in Calendar",
                                    emoji: true
                                },
                                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/calendar`,
                                style: "primary"
                            }
                        ]
                    }
                ]
            };
        }
        case 'nurture': {
            const nurtureData = data as SlackNurtureData;
            return {
                text: `🌱 *Lead Nurtured!*`,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🌱 Lead Nurtured!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Lead:* ${nurtureData.lead_name}\n*Channel:* ${nurtureData.channel}\n*Message:* ${nurtureData.message_preview}...`
                        }
                    }
                ]
            };
        }
        case 'ai_weekly_report': {
            const reportData = data as SlackAIReportData;
            return {
                text: `📊 *AI Weekly Performance Report*`,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "📊 AI Weekly Performance",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Score:* ${reportData.score}/100 (${reportData.grade})\n*Conversations:* ${reportData.conversations}\n*Top Insight:* ${reportData.top_insight}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View Full Report",
                                    emoji: true
                                },
                                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/ai-performance`,
                                style: "primary"
                            }
                        ]
                    }
                ]
            };
        }
        default:
            return { text: "🔔 Notification from Jumpix" };
    }
}
