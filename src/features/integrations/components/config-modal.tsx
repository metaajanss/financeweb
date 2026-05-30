'use client';

import { X, CheckCircle, AlertCircle, Loader2, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useIntegrationModal } from './forms/useIntegrationModal';
import { WhatsAppForm } from './forms/WhatsAppForm';
import { TwilioForm } from './forms/TwilioForm';
import { SlackForm } from './forms/SlackForm';
import { DiscordForm } from './forms/DiscordForm';
import { GoogleSheetsForm } from './forms/GoogleSheetsForm';
import { GenericCrmForm } from './forms/GenericCrmForm';
import { WebhookInfo } from './forms/WebhookInfo';

interface IntegrationConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration: {
        id?: string;
        name: string;
        provider: string;
        isConnected: boolean;
        config?: any;
    } | null;
    onStatusChange: () => void;
    accountId: string | null;
}

const GOOGLE_PROVIDERS = ['gmail', 'google_calendar', 'google_sheets'];

function ProviderIcon({ integration }: { integration: NonNullable<IntegrationConfigModalProps['integration']> }) {
    if (integration.provider === 'google_ads') {
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#34A853" d="M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998z" />
                <path fill="#4285F4" d="M23.4641 16.9287L15.4632 3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 1.4647-5.4644z" />
                <path fill="#FBBC04" d="M7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z" />
            </svg>
        );
    }
    if (integration.name === 'Google Meet') {
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 11V17C0 18.6569 1.34315 20 3 20H9L0 11Z" fill="#00832D" />
                <path d="M0 7V11L9 20H15C16.6569 20 18 18.6569 18 17V11L9 2L0 7Z" fill="#00AC47" />
                <path d="M18 7V3C18 1.34315 16.6569 0 15 0H9L18 9V7Z" fill="#FFBA00" />
                <path d="M0 7V3C0 1.34315 1.34315 0 3 0H9V7L0 7Z" fill="#EA4335" />
                <path d="M18 7L24 2V12L18 9V7Z" fill="#EA4335" />
                <path d="M24 12L18 9V17L24 22V12Z" fill="#4285F4" />
                <path d="M18 17V11L9 20V23C9 23.5523 9.44772 24 10 24H15C16.6569 24 18 22.6569 18 21V17Z" fill="#0066DA" />
            </svg>
        );
    }
    return <>{integration.name[0]}</>;
}

function ProviderBody({ integration, modal, accountId }: {
    integration: NonNullable<IntegrationConfigModalProps['integration']>;
    modal: ReturnType<typeof useIntegrationModal>;
    accountId: string | null;
}) {
    const p = integration.provider;

    if (p === 'gmail' && !integration.isConnected) {
        return <div className="py-4 text-center"><p className="text-sm text-muted mb-4">You will be redirected to Google to authorize Gmail access.</p></div>;
    }
    if (p === 'gmail' && integration.isConnected) {
        return (
            <div className="py-2">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">Manual Email Sync</p>
                            <p className="text-[10px] text-muted-foreground">Force a scan of your inbox for new leads and messages.</p>
                        </div>
                        <Button size="sm" variant="secondary" className="h-8 shadow-sm" onClick={modal.handleGmailSync} disabled={modal.syncing}>
                            {modal.syncing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Zap size={14} className="mr-2" />}Sync Now
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    if ((p === 'google_calendar' || (p === 'google_sheets' && !integration.isConnected)) && !integration.isConnected) {
        const label = p === 'google_calendar' ? 'Calendar' : 'Sheets & Drive';
        return <div className="py-4 text-center"><p className="text-sm text-muted mb-4">You will be redirected to Google to authorize {label} access.</p></div>;
    }
    if (p === 'whatsapp') {
        return <WhatsAppForm phoneId={modal.whatsappPhoneId} setPhoneId={modal.setWhatsappPhoneId} token={modal.whatsappToken} setToken={modal.setWhatsappToken} />;
    }
    if (p === 'twilio') {
        return (
            <TwilioForm 
                step={modal.twilioStep} 
                setStep={modal.setTwilioStep} 
                from={modal.twilioFrom} 
                setFrom={modal.setTwilioFrom} 
                otp={modal.twilioOtp} 
                setOtp={modal.setTwilioOtp}
                profileName={modal.whatsappProfileName}
                setProfileName={modal.setWhatsappProfileName}
                onResend={modal.handleTwilioResend}
                disabled={modal.loading}
            />
        );
    }
    if (p === 'slack') {
        return <SlackForm apiKey={modal.apiKey} setApiKey={modal.setApiKey} channelId={modal.slackChannelId} setChannelId={modal.setSlackChannelId} notifyLeads={modal.slackNotifyLeads} setNotifyLeads={modal.setSlackNotifyLeads} notifyMeetings={modal.slackNotifyMeetings} setNotifyMeetings={modal.setSlackNotifyMeetings} notifyMessages={modal.slackNotifyMessages} setNotifyMessages={modal.setSlackNotifyMessages} notifyErrors={modal.slackNotifyErrors} setNotifyErrors={modal.setSlackNotifyErrors} notifyReminders={modal.slackNotifyReminders} setNotifyReminders={modal.setSlackNotifyReminders} />;
    }
    if (p === 'discord') {
        return <DiscordForm webhookUrl={modal.discordWebhookUrl} setWebhookUrl={modal.setDiscordWebhookUrl} notifyLeads={modal.discordNotifyLeads} setNotifyLeads={modal.setDiscordNotifyLeads} notifyMeetings={modal.discordNotifyMeetings} setNotifyMeetings={modal.setDiscordNotifyMeetings} notifyMessages={modal.discordNotifyMessages} setNotifyMessages={modal.setDiscordNotifyMessages} notifyErrors={modal.discordNotifyErrors} setNotifyErrors={modal.setDiscordNotifyErrors} notifyReminders={modal.discordNotifyReminders} setNotifyReminders={modal.setDiscordNotifyReminders} />;
    }
    if (p === 'google_sheets' && integration.isConnected && integration.id) {
        return <GoogleSheetsForm integrationId={integration.id} spreadsheets={modal.spreadsheets} setSpreadsheets={modal.setSpreadsheets} sheets={modal.sheets} setSheets={modal.setSheets} selectedSpreadsheetId={modal.selectedSpreadsheetId} setSelectedSpreadsheetId={modal.setSelectedSpreadsheetId} selectedSheetName={modal.selectedSheetName} setSelectedSheetName={modal.setSelectedSheetName} fieldMapping={modal.fieldMapping} setFieldMapping={modal.setFieldMapping} autoExport={modal.sheetsAutoExport} setAutoExport={modal.setSheetsAutoExport} autoImport={modal.sheetsAutoImport} setAutoImport={modal.setSheetsAutoImport} fetchingSpreadsheets={modal.fetchingSpreadsheets} setFetchingSpreadsheets={modal.setFetchingSpreadsheets} sheetsError={modal.sheetsError} setSheetsError={modal.setSheetsError} syncing={modal.syncing} onSync={modal.handleSync} />;
    }

    return (
        <div className="space-y-4">
            <GenericCrmForm provider={p} apiKey={modal.apiKey} setApiKey={modal.setApiKey} salesforceInstanceUrl={modal.salesforceInstanceUrl} setSalesforceInstanceUrl={modal.setSalesforceInstanceUrl} copperUserEmail={modal.copperUserEmail} setCopperUserEmail={modal.setCopperUserEmail} />
            <WebhookInfo provider={p} accountId={accountId} />
        </div>
    );
}

export function IntegrationConfigModal({ isOpen, onClose, integration, onStatusChange, accountId }: IntegrationConfigModalProps) {
    const modal = useIntegrationModal({ isOpen, integration, onClose, onStatusChange });

    if (!isOpen || !integration) return null;

    const isGoogleConnect = GOOGLE_PROVIDERS.includes(integration.provider) && !integration.isConnected;
    const isGoogleReconnect = GOOGLE_PROVIDERS.includes(integration.provider) && integration.isConnected;

    const connectLabel = isGoogleConnect
        ? <span className="flex items-center gap-2">Connect with Google <ExternalLink size={14} /></span>
        : isGoogleReconnect
            ? <span className="flex items-center gap-2">Reconnect with Google <ExternalLink size={14} /></span>
            : integration.isConnected ? 'Update' : 'Connect';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary overflow-hidden">
                            <ProviderIcon integration={integration} />
                        </div>
                        <h2 className="text-xl font-bold">{integration.name} Configuration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6">
                    {modal.success ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold">Successfully {integration.isConnected ? 'Updated' : 'Connected'}!</h3>
                            <p className="text-muted">Redirecting you back to settings...</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                                <div className="flex gap-3">
                                    <AlertCircle className="text-primary shrink-0" size={20} />
                                    <p className="text-sm text-foreground/80 leading-relaxed">
                                        {integration.isConnected
                                            ? (GOOGLE_PROVIDERS.includes(integration.provider)
                                                ? `You are currently connected to ${integration.name}. Click "Reconnect" to switch accounts or refresh the connection.`
                                                : `You are currently connected to ${integration.name}. You can update your credentials or refresh the connection below.`)
                                            : `Enter your ${integration.name} credentials to start syncing leads and automating responses.`}
                                    </p>
                                </div>
                                {integration.isConnected && (integration.config?.email || integration.config?.user_email) && (
                                    <div className="flex items-center gap-2 pl-8 pt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Connected as: <span className="text-foreground">{integration.config.email || integration.config.user_email}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <ProviderBody integration={integration} modal={modal} accountId={accountId} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                {integration.isConnected ? (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            const { disconnectIntegration } = await import('@/features/settings');
                                            await disconnectIntegration(integration.provider);
                                            onStatusChange();
                                            onClose();
                                        }}
                                        disabled={modal.loading}
                                        className="flex-1 border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                                )}
                                <Button onClick={modal.handleAction} disabled={modal.loading} className="flex-1">
                                    {modal.loading ? <Loader2 className="animate-spin mr-2" size={18} /> : connectLabel}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
