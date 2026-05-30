'use client';

import { X, Play, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useTranslations } from 'next-intl';
import { type Sequence } from '@/features/sequences';

interface GmailAccount {
    id: string;
    email: string;
    is_primary: boolean;
    label?: string;
}

interface StartSequenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (sequenceId: string, integrationId?: string) => Promise<void>;
    sequences: Sequence[];
    loading?: boolean;
}

export function StartSequenceModal({ isOpen, onClose, onStart, sequences, loading = false }: StartSequenceModalProps) {
    const t = useTranslations('Leads.modals.selectSequence');
    const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
    const [selectedGmailId, setSelectedGmailId] = useState<string>('');
    const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchGmails = async () => {
            try {
                const { getIntegrations } = await import('@/features/settings');
                const integrations = await getIntegrations();
                const gmails = (integrations as any[])
                    .filter(i => i.provider === 'gmail' && i.status === 'connected')
                    .map(i => ({ id: i.id, email: i.config?.email || i.id, is_primary: !!i.is_primary, label: i.label }));
                setGmailAccounts(gmails);
            } catch (_) {}
        };
        fetchGmails();
    }, [isOpen]);

    const handleStart = async () => {
        if (!selectedSequenceId) return;
        await onStart(selectedSequenceId, selectedGmailId || undefined);
        onClose();
        setSelectedSequenceId('');
        setSelectedGmailId('');
    };

    if (!isOpen) return null;

    const activeSequences = sequences.filter(s => s.is_active);
    const showGmailSelector = gmailAccounts.length > 1;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm mx-4 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />

                <div className="flex items-center justify-between p-5 border-b border-border/60">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Play size={18} fill="currentColor" />
                        </div>
                        {t('title')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {t('description')}
                    </p>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Select Sequence
                        </label>
                        <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                            <SelectTrigger className="w-full p-4 h-12 rounded-xl bg-background border-border/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                                <SelectValue placeholder={t('placeholder')} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border text-foreground rounded-xl shadow-2xl z-[160]">
                                {activeSequences.length > 0 ? (
                                    activeSequences.map((seq) => (
                                        <SelectItem key={seq.id} value={seq.id} className="cursor-pointer focus:bg-primary/5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{seq.name}</span>
                                                {seq.trigger_type === 'instant' && (
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter">
                                                        Instant
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground italic">
                                        No active sequences found.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Gmail account selector — only shown when multiple accounts are connected */}
                    {showGmailSelector && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                Gönderen Gmail Hesabı
                            </label>
                            <Select value={selectedGmailId} onValueChange={setSelectedGmailId}>
                                <SelectTrigger className="w-full p-4 h-12 rounded-xl bg-background border-border/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                                    <SelectValue placeholder="Birincil hesap (varsayılan)" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border text-foreground rounded-xl shadow-2xl z-[160]">
                                    <SelectItem value="" className="cursor-pointer focus:bg-primary/5 py-3">
                                        Birincil hesap (varsayılan)
                                    </SelectItem>
                                    {gmailAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id} className="cursor-pointer focus:bg-primary/5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span>{acc.label || acc.email}</span>
                                                {acc.is_primary && <span className="text-amber-500 text-xs">★</span>}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                        >
                            {t('cancelButton')}
                        </Button>
                        <Button
                            onClick={handleStart}
                            disabled={loading || !selectedSequenceId}
                            className="flex-[1.5] gap-2 rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:shadow-primary/40 transition-all font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                            {t('startButton')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
