'use client';

interface Toggle { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean; }

export function NotificationToggles({ toggles }: { toggles: Toggle[] }) {
    return (
        <div className="space-y-4 pt-4 border-t border-border">
            <label className="text-xs font-black uppercase tracking-widest text-primary">Notification Preferences</label>
            <div className="grid grid-cols-1 gap-3">
                {toggles.map(({ label, desc, value, onChange, danger }) => (
                    <label key={label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 cursor-pointer hover:bg-surface-hover transition-colors">
                        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                        <div>
                            <p className="text-sm font-bold">{label}</p>
                            <p className={`text-[10px] ${danger ? 'text-rose-500/80' : 'text-muted'}`}>{desc}</p>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}
