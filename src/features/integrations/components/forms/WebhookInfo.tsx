'use client';

import { ExternalLink } from 'lucide-react';

const WEBHOOK_PROVIDERS = ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'close', 'copper', 'google_ads', 'instagram', 'tiktok'];

interface WebhookInfoProps {
    provider: string;
    accountId: string | null;
}

function getWebhookLabel(provider: string) {
    if (provider === 'google_ads') return 'Webhook URL (For Lead Forms)';
    if (provider === 'instagram') return 'Instagram Webhook URL';
    if (provider === 'tiktok') return 'TikTok Webhook URL';
    return 'Webhook Configuration (Required for Sync Back)';
}

function getWebhookDescription(provider: string) {
    if (provider === 'google_ads') return 'Copy this URL to your Google Ads Lead Form webhook settings.';
    if (provider === 'instagram') return 'Copy this URL to your Facebook Developer Portal (Instagram Graph API) Webhooks section.';
    if (provider === 'tiktok') return 'Copy this URL to your TikTok Business API / Events API configuration.';
    return "Copy this URL to your CRM's webhook settings to enable bidirectional sync.";
}

function getWebhookPath(provider: string) {
    if (provider === 'google_ads') return 'google-ads';
    if (provider === 'instagram') return 'instagram';
    if (provider === 'tiktok') return 'tiktok';
    return `crm/${provider}`;
}

export function WebhookInfo({ provider, accountId }: WebhookInfoProps) {
    if (!WEBHOOK_PROVIDERS.includes(provider)) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/webhooks/${getWebhookPath(provider)}?aid=${accountId || 'loading...'}`;

    return (
        <div className="space-y-2 pt-4 border-t border-border mt-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary">{getWebhookLabel(provider)}</label>
            <p className="text-[11px] text-muted leading-tight mb-2">{getWebhookDescription(provider)}</p>
            <div className="relative group">
                <input readOnly value={url} className="w-full p-2.5 pr-10 text-[10px] bg-background/50 border border-dashed border-border rounded-lg font-mono text-muted-foreground outline-none cursor-text select-all" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={14} />
                </div>
            </div>
            {provider === 'instagram' && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Verify Token</p>
                    <code className="text-xs bg-background p-1 rounded border border-border">product_t_instagram</code>
                </div>
            )}
            {provider === 'whatsapp' && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Webhook Verify Token</p>
                    <code className="text-xs bg-background p-1 rounded border border-border">payofflab_verify_token_2024</code>
                    <p className="text-[9px] text-muted mt-2 leading-tight">Copy this to Meta Developer Portal Webhook settings.</p>
                </div>
            )}
        </div>
    );
}
