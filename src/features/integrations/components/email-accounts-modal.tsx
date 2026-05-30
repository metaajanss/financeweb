'use client';

import { X, Plus, Star, RefreshCw, Trash2, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface EmailAccount {
    id?: string;
    provider: string;
    status?: string | null;
    config?: any;
    is_primary?: boolean;
    label?: string;
}

interface EmailAccountsModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: EmailAccount[];
    isPending: boolean;
    onAddGmail: () => void;
    onAddSmtp: () => void;
    onSync: (acc: EmailAccount) => void;
    onSetPrimary: (acc: EmailAccount) => void;
    onDisconnect: (acc: EmailAccount) => void;
}

export function EmailAccountsModal({
    isOpen,
    onClose,
    accounts,
    isPending,
    onAddGmail,
    onAddSmtp,
    onSync,
    onSetPrimary,
    onDisconnect
}: EmailAccountsModalProps) {
    if (!isOpen) return null;

    const primaryCount = accounts.filter(a => a.is_primary).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="relative w-full max-w-2xl mx-4 bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Email Hesapları</h2>
                            <p className="text-sm text-muted-foreground">{accounts.length} bağlı hesap bulunuyor</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onAddGmail}
                            disabled={isPending}
                            className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#EA4335]/10 flex items-center justify-center text-[#EA4335] group-hover:scale-110 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.39l-9 6.22-9-6.22V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.4.15-.75.45-1.05.3-.3.65-.45 1.05-.45H3l9 6.22 9-6.22h1.5c.4 0 .75.15 1.05.45.3.3.45.65.45 1.05z" /></svg>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Gmail Ekle</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">OAuth 2.0</p>
                            </div>
                            <Plus size={16} className="ml-auto text-muted-foreground group-hover:text-primary" />
                        </button>

                        <button
                            onClick={onAddSmtp}
                            disabled={isPending}
                            className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Mail size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">SMTP Ekle</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Custom Server</p>
                            </div>
                            <Plus size={16} className="ml-auto text-muted-foreground group-hover:text-primary" />
                        </button>
                    </div>

                    {/* Account List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Bağlı Hesaplar</h3>
                        {accounts.length > 0 ? (
                            <div className="space-y-3">
                                {accounts.map((acc) => (
                                    <div 
                                        key={acc.id} 
                                        className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative">
                                                <div className={`w-12 h-12 rounded-xl border border-border/50 flex items-center justify-center shadow-sm ${acc.provider === 'gmail' ? 'bg-[#EA4335]/5 text-[#EA4335]' : 'bg-primary/5 text-primary'}`}>
                                                    {acc.provider === 'gmail' ? (
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.39l-9 6.22-9-6.22V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.4.15-.75.45-1.05.3-.3.65-.45 1.05-.45H3l9 6.22 9-6.22h1.5c.4 0 .75.15 1.05.45.3.3.45.65.45 1.05z" /></svg>
                                                    ) : (
                                                        <Mail size={20} />
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground truncate">
                                                        {acc.label || acc.config?.email || acc.provider}
                                                    </span>
                                                    {acc.is_primary && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-500 shrink-0">
                                                            <Star size={9} fill="currentColor" /> Birincil
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate opacity-70">
                                                    {acc.config?.email || 'Connected Account'} • {acc.provider.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => onSync(acc)}
                                                disabled={isPending}
                                                title="Senkronize et"
                                                className="p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                            >
                                                <RefreshCw size={18} className={isPending ? 'animate-spin' : ''} />
                                            </button>
                                            {(!acc.is_primary || primaryCount > 1) && (
                                                <button
                                                    onClick={() => onSetPrimary(acc)}
                                                    disabled={isPending}
                                                    title="Birincil yap"
                                                    className="p-2.5 rounded-xl hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-all"
                                                >
                                                    <Star size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDisconnect(acc)}
                                                disabled={isPending}
                                                title="Kaldır"
                                                className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3 rounded-3xl border border-dashed border-border bg-muted/5">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-50">
                                    <Mail size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">Hesap Bulunamadı</p>
                                    <p className="text-xs text-muted-foreground">Henüz bir e-posta hesabı bağlamadınız.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border/50 bg-muted/20 flex justify-end">
                    <Button variant="outline" onClick={onClose} className="rounded-xl px-8">Kapat</Button>
                </div>
            </div>
        </div>
    );
}
