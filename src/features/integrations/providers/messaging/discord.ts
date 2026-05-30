import { createClient } from '@/core/db/server';
import { fetchWithRetry } from '@/core/http/fetch';

export interface DiscordConfig {
    webhook_url: string;
    notifications: {
        leads: boolean;
        meetings: boolean;
        messages: boolean;
        errors: boolean;
        reminders: boolean;
    };
}

export async function sendDiscordNotification(accountId: string, type: keyof DiscordConfig['notifications'], data: Record<string, unknown>) {
    try {
        const supabase = await createClient();

        // Fetch Discord integration for the account
        const { data: integration, error } = await supabase
            .from('integrations')
            .select('config, status')
            .eq('account_id', accountId)
            .eq('provider', 'discord')
            .single();

        if (error || !integration || integration.status !== 'connected') {
            return;
        }

        const config = integration.config as unknown as DiscordConfig;

        // Check if this type of notification is enabled
        if (!config.notifications[type]) {
            return;
        }

        const embed = formatDiscordEmbed(type, data);

        await fetchWithRetry(config.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            timeoutMs: 10000,
            retries: 1,
            body: JSON.stringify({
                embeds: [embed]
            }),
        });

    } catch (error) {
        console.error('[DiscordService] Unexpected error:', error);
    }
}

/**
 * Backward compatibility alias for sendDiscordNotification
 * Used by legacy modules and integration tests.
 */
export async function sendDiscordMessage(accountId: string, type: keyof DiscordConfig['notifications'], data: Record<string, unknown>) {
    return sendDiscordNotification(accountId, type, data);
}

function formatDiscordEmbed(type: string, data: Record<string, unknown>) {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

    switch (type) {
        case 'leads':
            return {
                title: "🚀 New Lead Inbound!",
                color: 0x10b981, // Emerald
                fields: [
                    { name: "Name", value: `${data.first_name} ${data.last_name}`, inline: true },
                    { name: "Source", value: String(data.source ?? 'Manual'), inline: true },
                    { name: "Email", value: String(data.email ?? 'N/A') },
                    { name: "Phone", value: String(data.phone ?? 'N/A') }
                ],
                url: `${APP_URL}/admin/leads`
            };
        case 'meetings':
            return {
                title: "📅 New Meeting Scheduled!",
                color: 0x3b82f6, // Blue
                fields: [
                    { name: "With", value: String(data.lead_name ?? ''), inline: true },
                    { name: "Topic", value: String(data.title ?? ''), inline: true },
                    { name: "When", value: String(data.start_time ?? '') }
                ],
                url: `${APP_URL}/admin/calendar`
            };
        case 'messages':
            return {
                title: `💬 New Message from ${data.sender_name}`,
                color: 0x8b5cf6, // Violet
                description: String(data.text ?? ''),
                url: `${APP_URL}/admin/conversations`
            };
        case 'reminders':
            return {
                title: "⏰ Appointment Reminder!",
                color: 0xf59e0b, // Amber
                description: `Meeting in ${data.minutes ?? '60'} minutes!`,
                fields: [
                    { name: "With", value: String(data.lead_name ?? ''), inline: true },
                    { name: "Topic", value: String(data.title ?? ''), inline: true },
                    { name: "Time", value: String(data.time ?? '') }
                ],
                url: `${APP_URL}/admin/calendar`
            };
        case 'errors':
            return {
                title: "⚠️ System Alert!",
                color: 0xef4444, // Red
                fields: [
                    { name: "Severity", value: String(data.severity ?? ''), inline: true },
                    { name: "Message", value: String(data.message ?? '') }
                ]
            };
        default:
            return { title: "Notification from Jumpix", color: 0x6366f1 };
    }
}
