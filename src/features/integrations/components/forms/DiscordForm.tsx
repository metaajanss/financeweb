'use client';

import { NotificationToggles } from './NotificationToggles';

interface DiscordFormProps {
    webhookUrl: string; setWebhookUrl: (v: string) => void;
    notifyLeads: boolean; setNotifyLeads: (v: boolean) => void;
    notifyMeetings: boolean; setNotifyMeetings: (v: boolean) => void;
    notifyMessages: boolean; setNotifyMessages: (v: boolean) => void;
    notifyErrors: boolean; setNotifyErrors: (v: boolean) => void;
    notifyReminders: boolean; setNotifyReminders: (v: boolean) => void;
}

export function DiscordForm({ webhookUrl, setWebhookUrl, notifyLeads, setNotifyLeads, notifyMeetings, setNotifyMeetings, notifyMessages, setNotifyMessages, notifyErrors, setNotifyErrors, notifyReminders, setNotifyReminders }: DiscordFormProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <NotificationToggles toggles={[
                { label: 'New Leads', desc: 'Notify when a new lead enters the system.', value: notifyLeads, onChange: setNotifyLeads },
                { label: 'Meeting Booked', desc: 'Notify when a user schedules a meeting.', value: notifyMeetings, onChange: setNotifyMeetings },
                { label: 'New Messages', desc: 'Notify for incoming messages from leads.', value: notifyMessages, onChange: setNotifyMessages },
                { label: 'Appointment Reminders', desc: 'Send reminders 1 hour before scheduled meetings.', value: notifyReminders, onChange: setNotifyReminders },
                { label: 'System Errors', desc: 'Notify on critical system failures.', value: notifyErrors, onChange: setNotifyErrors, danger: true },
            ]} />
        </div>
    );
}
