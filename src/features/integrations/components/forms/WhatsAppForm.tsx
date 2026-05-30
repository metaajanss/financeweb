'use client';

interface WhatsAppFormProps {
    phoneId: string;
    setPhoneId: (v: string) => void;
    token: string;
    setToken: (v: string) => void;
}

export function WhatsAppForm({ phoneId, setPhoneId, token, setToken }: WhatsAppFormProps) {
    return (
        <>
            <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number ID</label>
                <input
                    type="text"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="e.g. 104xxxxxxxxxxxxx"
                    className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Permanent Access Token</label>
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="EAAG..."
                    className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                />
            </div>
        </>
    );
}
