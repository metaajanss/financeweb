'use client';

import { useState, useEffect } from 'react';
import {
    updateIntegrationConfig,
    getCalendarAuth,
    getSheetsAuth,
    getGmailAuth,
    listSpreadsheetsAction,
    getSpreadsheetSheetsAction,
    manualSyncSheets,
    manualSyncGmail,
} from '@/features/settings';
import { initiateTwilioWhatsAppVerification, finalizeTwilioWhatsAppVerification } from '@/features/integrations';
import { useToast } from '@/shared/components/ui/toast';

interface Integration {
    id?: string;
    name: string;
    provider: string;
    isConnected: boolean;
    config?: any;
}

interface UseIntegrationModalProps {
    isOpen: boolean;
    integration: Integration | null;
    onClose: () => void;
    onStatusChange: () => void;
}

export function useIntegrationModal({ isOpen, integration, onClose, onStatusChange }: UseIntegrationModalProps) {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [apiKey, setApiKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
    const [whatsappToken, setWhatsappToken] = useState('');
    const [whatsappProfileName, setWhatsappProfileName] = useState('');

    const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState('');
    const [copperUserEmail, setCopperUserEmail] = useState('');

    const [slackChannelId, setSlackChannelId] = useState('');
    const [slackNotifyLeads, setSlackNotifyLeads] = useState(true);
    const [slackNotifyMeetings, setSlackNotifyMeetings] = useState(true);
    const [slackNotifyMessages, setSlackNotifyMessages] = useState(true);
    const [slackNotifyErrors, setSlackNotifyErrors] = useState(false);
    const [slackNotifyReminders, setSlackNotifyReminders] = useState(true);

    const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
    const [discordNotifyLeads, setDiscordNotifyLeads] = useState(true);
    const [discordNotifyMeetings, setDiscordNotifyMeetings] = useState(true);
    const [discordNotifyMessages, setDiscordNotifyMessages] = useState(true);
    const [discordNotifyErrors, setDiscordNotifyErrors] = useState(false);
    const [discordNotifyReminders, setDiscordNotifyReminders] = useState(true);

    const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
    const [sheets, setSheets] = useState<string[]>([]);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState('');
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [fieldMapping, setFieldMapping] = useState<any>({ first_name: 'A', last_name: 'B', email: 'C', phone: 'D', source: 'E' });
    const [sheetsAutoExport, setSheetsAutoExport] = useState(true);
    const [sheetsAutoImport, setSheetsAutoImport] = useState(false);
    const [fetchingSpreadsheets, setFetchingSpreadsheets] = useState(false);
    const [sheetsError, setSheetsError] = useState<string | null>(null);

    const [twilioFrom, setTwilioFrom] = useState('');
    const [twilioVerificationSid, setTwilioVerificationSid] = useState('');
    const [twilioOtp, setTwilioOtp] = useState('');
    const [twilioStep, setTwilioStep] = useState<'IDLE' | 'OTP' | 'VERIFIED'>('IDLE');

    useEffect(() => {
        if (isOpen && integration?.config) {
            const config = integration.config;
            const p = integration.provider;
            if (p === 'slack') {
                setSlackChannelId(config.channel_id || '');
                setApiKey(config.bot_token || '');
                if (config.notifications) {
                    setSlackNotifyLeads(!!config.notifications.leads);
                    setSlackNotifyMeetings(!!config.notifications.meetings);
                    setSlackNotifyMessages(!!config.notifications.messages);
                    setSlackNotifyErrors(!!config.notifications.errors);
                    setSlackNotifyReminders(!!config.notifications.reminders);
                }
            } else if (p === 'discord') {
                setDiscordWebhookUrl(config.webhook_url || '');
                if (config.notifications) {
                    setDiscordNotifyLeads(!!config.notifications.leads);
                    setDiscordNotifyMeetings(!!config.notifications.meetings);
                    setDiscordNotifyMessages(!!config.notifications.messages);
                    setDiscordNotifyErrors(!!config.notifications.errors);
                    setDiscordNotifyReminders(!!config.notifications.reminders);
                }
            } else if (p === 'whatsapp') {
                setWhatsappPhoneId(config.phone_number_id || '');
                setWhatsappToken(config.access_token || '');
                setWebhookUrl(config.webhook_url || '');
            } else if (p === 'salesforce') {
                setApiKey(config.access_token || '');
                setSalesforceInstanceUrl(config.instance_url || '');
            } else if (p === 'copper') {
                setApiKey(config.api_key || '');
                setCopperUserEmail(config.user_email || '');
            } else if (p === 'pipedrive') {
                setApiKey(config.api_token || '');
            } else if (p === 'close') {
                setApiKey(config.api_key || '');
            } else if (p === 'google_sheets') {
                setSelectedSpreadsheetId(config.spreadsheetId || '');
                setSelectedSheetName(config.sheetName || '');
                if (config.mapping) setFieldMapping(config.mapping);
                setSheetsAutoExport(!!config.autoExport);
                setSheetsAutoImport(!!config.autoImport);
                if (!integration.id) return;
                setFetchingSpreadsheets(true);
                setSheetsError(null);
                listSpreadsheetsAction(integration.id).then(async (result) => {
                    if (result.error) { setSheetsError(result.error); return; }
                    setSpreadsheets((result as any).files || []);
                    if (config.spreadsheetId) {
                        const sheetList = await getSpreadsheetSheetsAction(integration.id!, config.spreadsheetId);
                        if (Array.isArray(sheetList)) setSheets(sheetList.filter((s): s is string => !!s));
                    }
                }).catch(() => {
                    setSheetsError('A server error occurred. Please try again.');
                }).finally(() => setFetchingSpreadsheets(false));
            } else if (p === 'twilio') {
                setTwilioFrom(config.from || '');
                setWhatsappProfileName(config.profile_name || '');
                if (integration.isConnected) setTwilioStep('VERIFIED');
                else if (config.pending && config.sid) { setTwilioVerificationSid(config.sid); setTwilioStep('OTP'); }
                else setTwilioStep('IDLE');
            }
        } else if (isOpen) {
            setApiKey(''); setWhatsappPhoneId(''); setWhatsappToken('');
            setSlackChannelId(''); setSlackNotifyLeads(true); setSlackNotifyMeetings(true);
            setSlackNotifyMessages(true); setSlackNotifyErrors(false);
            setDiscordWebhookUrl(''); setDiscordNotifyLeads(true); setDiscordNotifyMeetings(true);
            setDiscordNotifyMessages(true); setDiscordNotifyErrors(false); setDiscordNotifyReminders(true);
            setSheetsError(null); setFetchingSpreadsheets(false);
            setTwilioFrom(''); setTwilioStep('IDLE'); setTwilioVerificationSid(''); setTwilioOtp('');
        }
    }, [isOpen, integration]);

    const handleAction = async () => {
        if (!integration) return;
        setLoading(true);
        try {
            const p = integration.provider;

            if (p === 'gmail') {
                const result = await getGmailAuth();
                if ('error' in result && result.error) { showToast(result.error, 'error'); setLoading(false); return; }
                if ('url' in result && result.url) { window.location.href = result.url; return; }
            }
            if (p === 'google_calendar') {
                const result = await getCalendarAuth();
                if ('error' in result && result.error) { showToast(result.error, 'error'); setLoading(false); return; }
                if ('url' in result && result.url) { window.location.href = result.url; return; }
            }
            if (p === 'google_sheets' && !integration.isConnected) {
                const result = await getSheetsAuth();
                if ('error' in result && result.error) { showToast(result.error, 'error'); setLoading(false); return; }
                if ('url' in result && result.url) { window.location.href = result.url; return; }
            }

            let config: any = {};

            if (p === 'whatsapp') {
                if (!whatsappPhoneId || !whatsappToken) { showToast('Please fill in all required fields', 'error'); setLoading(false); return; }
                config = { phone_number_id: whatsappPhoneId, access_token: whatsappToken, webhook_url: webhookUrl };
            } else if (p === 'hubspot' || p === 'zoho') {
                if (!apiKey) { showToast('Access Token is required', 'error'); setLoading(false); return; }
                config = { access_token: apiKey };
            } else if (p === 'salesforce') {
                if (!apiKey || !salesforceInstanceUrl) { showToast('Access Token and Instance URL are required', 'error'); setLoading(false); return; }
                config = { access_token: apiKey, instance_url: salesforceInstanceUrl };
            } else if (p === 'pipedrive') {
                if (!apiKey) { showToast('API Token is required', 'error'); setLoading(false); return; }
                config = { api_token: apiKey };
            } else if (p === 'close') {
                if (!apiKey) { showToast('API Key is required', 'error'); setLoading(false); return; }
                config = { api_key: apiKey };
            } else if (p === 'copper') {
                if (!apiKey || !copperUserEmail) { showToast('API Key and User Email are required', 'error'); setLoading(false); return; }
                config = { api_key: apiKey, user_email: copperUserEmail };
            } else if (p === 'slack') {
                if (!apiKey || !slackChannelId) { showToast('Bot Token and Channel ID are required', 'error'); setLoading(false); return; }
                config = { bot_token: apiKey, channel_id: slackChannelId, notifications: { leads: slackNotifyLeads, meetings: slackNotifyMeetings, messages: slackNotifyMessages, errors: slackNotifyErrors, reminders: slackNotifyReminders } };
            } else if (p === 'discord') {
                if (!discordWebhookUrl) { showToast('Webhook URL is required', 'error'); setLoading(false); return; }
                config = { webhook_url: discordWebhookUrl, notifications: { leads: discordNotifyLeads, meetings: discordNotifyMeetings, messages: discordNotifyMessages, errors: discordNotifyErrors, reminders: discordNotifyReminders } };
            } else if (p === 'google_sheets') {
                config = { spreadsheetId: selectedSpreadsheetId, sheetName: selectedSheetName, mapping: fieldMapping, autoExport: sheetsAutoExport, autoImport: sheetsAutoImport };
            } else if (p === 'twilio') {
                if (twilioStep === 'IDLE') {
                    if (!twilioFrom || !whatsappProfileName) { showToast('Phone number and Profile Name are required', 'error'); setLoading(false); return; }
                    const result = await initiateTwilioWhatsAppVerification(twilioFrom, whatsappProfileName);
                    if (result.success) { setTwilioVerificationSid(result.sid || ''); setTwilioStep('OTP'); showToast('Verification code sent to WhatsApp', 'success'); }
                    else showToast(result.error || 'Failed to send verification code', 'error');
                    setLoading(false); return;
                } else if (twilioStep === 'OTP') {
                    if (!twilioOtp) { showToast('Please enter the 6-digit code', 'error'); setLoading(false); return; }
                    const result = await finalizeTwilioWhatsAppVerification(twilioVerificationSid, twilioOtp);
                    if (result.success) { setTwilioStep('VERIFIED'); setSuccess(true); onStatusChange(); setTimeout(() => { setSuccess(false); onClose(); }, 2000); }
                    else showToast(result.error || 'Invalid verification code', 'error');
                    setLoading(false); return;
                }
                onClose(); return;
            } else {
                if (!apiKey) { showToast('API Key is required', 'error'); setLoading(false); return; }
                config = { api_key: apiKey };
            }

            const result = await updateIntegrationConfig(integration.provider, config);
            if (result.error) showToast(result.error, 'error');
            else { setSuccess(true); onStatusChange(); setTimeout(() => { setSuccess(false); onClose(); }, 2000); }
        } catch {
            showToast('An unexpected error occurred', 'error');
            setLoading(false);
        } finally {
            const isRedirecting = ['gmail', 'google_calendar'].includes(integration!.provider) || (integration!.provider === 'google_sheets' && !integration!.isConnected);
            if (!isRedirecting) setLoading(false);
            else setTimeout(() => setLoading(false), 5000);
        }
    };

    const handleSync = async () => {
        if (!integration?.id) return;
        setSyncing(true);
        try {
            const result = await manualSyncSheets(integration.id);
            if ('importedCount' in result) showToast(`Successfully imported ${result.importedCount} new leads!`, 'success');
            else showToast('Sync completed', 'success');
        } catch { showToast('Sync failed', 'error'); }
        finally { setSyncing(false); }
    };

    const handleGmailSync = async () => {
        if (!integration?.id) return;
        setSyncing(true);
        showToast('Syncing your inbox, please wait...', 'info');
        try {
            const result = await manualSyncGmail(integration.id);
            if (result && 'processed' in result) showToast(`Sync complete! Processed ${result.processed} new email messages.`, 'success');
            else showToast('Sync completed but received an unexpected response.', 'warning');
        } catch { showToast('Gmail sync failed. Please try again.', 'error'); }
        finally { setSyncing(false); }
    };

    const handleTwilioResend = async (method: 'sms' | 'voice') => {
        setLoading(true);
        try {
            const result = await initiateTwilioWhatsAppVerification(twilioFrom, whatsappProfileName, method);
            if (result.success) {
                if (!result.sid) {
                    showToast('Verification started but no SID returned', 'error');
                    return;
                }
                setTwilioVerificationSid(result.sid);
                showToast(`New verification code sent via ${method}`, 'success');
            } else {
                showToast(result.error || 'Failed to send verification code', 'error');
            }
        } catch {
            showToast('An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    return {
        loading, success, syncing,
        apiKey, setApiKey,
        whatsappPhoneId, setWhatsappPhoneId,
        whatsappToken, setWhatsappToken,
        salesforceInstanceUrl, setSalesforceInstanceUrl,
        copperUserEmail, setCopperUserEmail,
        slackChannelId, setSlackChannelId,
        slackNotifyLeads, setSlackNotifyLeads,
        slackNotifyMeetings, setSlackNotifyMeetings,
        slackNotifyMessages, setSlackNotifyMessages,
        slackNotifyErrors, setSlackNotifyErrors,
        slackNotifyReminders, setSlackNotifyReminders,
        discordWebhookUrl, setDiscordWebhookUrl,
        discordNotifyLeads, setDiscordNotifyLeads,
        discordNotifyMeetings, setDiscordNotifyMeetings,
        discordNotifyMessages, setDiscordNotifyMessages,
        discordNotifyErrors, setDiscordNotifyErrors,
        discordNotifyReminders, setDiscordNotifyReminders,
        spreadsheets, setSpreadsheets,
        sheets, setSheets,
        selectedSpreadsheetId, setSelectedSpreadsheetId,
        selectedSheetName, setSelectedSheetName,
        fieldMapping, setFieldMapping,
        sheetsAutoExport, setSheetsAutoExport,
        sheetsAutoImport, setSheetsAutoImport,
        fetchingSpreadsheets, setFetchingSpreadsheets,
        sheetsError, setSheetsError,
        twilioFrom, setTwilioFrom,
        twilioOtp, setTwilioOtp,
        twilioStep, setTwilioStep,
        whatsappProfileName, setWhatsappProfileName,
        handleAction, handleSync, handleGmailSync, handleTwilioResend,
    };
}
