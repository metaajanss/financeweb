'use client';

interface GenericCrmFormProps {
    provider: string;
    apiKey: string; setApiKey: (v: string) => void;
    salesforceInstanceUrl: string; setSalesforceInstanceUrl: (v: string) => void;
    copperUserEmail: string; setCopperUserEmail: (v: string) => void;
}

const apiKeyLabel = (provider: string) => {
    if (provider === 'pipedrive') return 'API Token';
    if (provider === 'close' || provider === 'copper') return 'API Key';
    if (provider === 'google_ads') return 'Webhook Key (Google Key)';
    if (provider === 'slack') return 'Bot User OAuth Token';
    return 'Access Token';
};

export function GenericCrmForm({ provider, apiKey, setApiKey, salesforceInstanceUrl, setSalesforceInstanceUrl, copperUserEmail, setCopperUserEmail }: GenericCrmFormProps) {
    return (
        <div className="space-y-4">
            {provider === 'salesforce' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Instance URL</label>
                    <input type="text" value={salesforceInstanceUrl} onChange={(e) => setSalesforceInstanceUrl(e.target.value)} placeholder="https://your-domain.my.salesforce.com" className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            )}
            {provider === 'copper' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">User Email</label>
                    <input type="email" value={copperUserEmail} onChange={(e) => setCopperUserEmail(e.target.value)} placeholder="admin@yourcompany.com" className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            )}
            {!['gmail', 'google_calendar', 'google_sheets'].includes(provider) && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">{apiKeyLabel(provider)}</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••••••" className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            )}
            {provider === 'hubspot' && (
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted leading-tight uppercase tracking-wider font-bold">Pro Tip: Use a Private App Access Token for the best experience.</p>
                </div>
            )}
        </div>
    );
}
