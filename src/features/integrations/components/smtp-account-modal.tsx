'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

interface SmtpAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: () => void;
}

export function SmtpAccountModal({ isOpen, onClose, onStatusChange }: SmtpAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const [label, setLabel] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('465');
    const [smtpSecure, setSmtpSecure] = useState(true);
    
    const [imapHost, setImapHost] = useState('');
    const [imapPort, setImapPort] = useState('993');
    const [imapSecure, setImapSecure] = useState(true);

    if (!isOpen) return null;

    const getConfig = () => ({
        email,
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort, 10),
        smtp_secure: smtpSecure,
        smtp_user: email,
        smtp_password: password,
        imap_host: imapHost,
        imap_port: parseInt(imapPort, 10),
        imap_secure: imapSecure,
        imap_user: email,
        imap_password: password,
    });

    const handleTest = async () => {
        if (!email || !password || !smtpHost || !smtpPort || !imapHost || !imapPort) {
            toast.error('Lütfen tüm alanları doldurun.');
            return;
        }

        setIsTesting(true);
        try {
            const { testSmtpConnectionAction } = await import('@/features/settings');
            const result = await testSmtpConnectionAction(getConfig());
            
            if (!result.error) {
                toast.success('Bağlantı testi başarılı!');
            } else {
                toast.error(result.error || 'Bağlantı testi başarısız oldu.');
            }
        } catch {
            toast.error('Bağlantı testi sırasında bir hata oluştu.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleConnect = async () => {
        if (!email || !password || !smtpHost || !smtpPort || !imapHost || !imapPort) {
            toast.error('Lütfen tüm alanları doldurun.');
            return;
        }

        setLoading(true);
        try {
            const { connectSmtpAccountAction } = await import('@/features/settings');
            const result = await connectSmtpAccountAction({
                ...getConfig(),
                label: label || email
            });
            
            if (result.error) {
                toast.error(result.error);
            } else {
                setSuccess(true);
                onStatusChange();
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 2000);
            }
        } catch {
            toast.error('Bağlantı sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-2xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <Mail size={20} />
                        </div>
                        <h2 className="text-xl font-bold">SMTP / IMAP Hesabı Ekle</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {success ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold">Başarıyla Bağlandı!</h3>
                            <p className="text-muted-foreground">E-posta hesabı başarıyla eklendi.</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                                <div className="flex gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                    <div className="text-sm text-foreground/80 leading-relaxed">
                                        <p className="font-semibold text-amber-500 mb-1">Güvenlik Uyarısı</p>
                                        <p>E-posta şifreniz (veya uygulama şifreniz) veritabanımızda saklanacaktır. Güvenliğiniz için lütfen e-posta sağlayıcınızdan oluşturacağınız <strong>Uygulama Şifresini (App Password)</strong> kullanın.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Etiket (İsteğe bağlı)</label>
                                        <input
                                            type="text"
                                            value={label}
                                            onChange={e => setLabel(e.target.value)}
                                            placeholder="Örn: Satış Maili"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">E-posta Adresi *</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="ornek@sirketiniz.com"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Şifre / Uygulama Şifresi *</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                                    {/* SMTP Config */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">↑</div>
                                            SMTP (Gönderim)
                                        </h3>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground uppercase">Sunucu Adresi *</label>
                                            <input
                                                type="text"
                                                value={smtpHost}
                                                onChange={e => setSmtpHost(e.target.value)}
                                                placeholder="smtp.ornek.com"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs text-muted-foreground uppercase">Port *</label>
                                                <input
                                                    type="text"
                                                    value={smtpPort}
                                                    onChange={e => setSmtpPort(e.target.value)}
                                                    placeholder="465"
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-muted-foreground uppercase">SSL/TLS</label>
                                                <div className="flex items-center h-[38px]">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={smtpSecure} 
                                                            onChange={e => setSmtpSecure(e.target.checked)}
                                                            className="rounded text-primary" 
                                                        />
                                                        <span className="text-sm">Aktif</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* IMAP Config */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">↓</div>
                                            IMAP (Alım)
                                        </h3>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground uppercase">Sunucu Adresi *</label>
                                            <input
                                                type="text"
                                                value={imapHost}
                                                onChange={e => setImapHost(e.target.value)}
                                                placeholder="imap.ornek.com"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs text-muted-foreground uppercase">Port *</label>
                                                <input
                                                    type="text"
                                                    value={imapPort}
                                                    onChange={e => setImapPort(e.target.value)}
                                                    placeholder="993"
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-muted-foreground uppercase">SSL/TLS</label>
                                                <div className="flex items-center h-[38px]">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={imapSecure} 
                                                            onChange={e => setImapSecure(e.target.checked)}
                                                            className="rounded text-primary" 
                                                        />
                                                        <span className="text-sm">Aktif</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {!success && (
                    <div className="p-6 border-t border-border shrink-0 flex gap-3 justify-end bg-muted/20">
                        <Button variant="outline" onClick={onClose} disabled={loading || isTesting}>İptal</Button>
                        <Button variant="secondary" onClick={handleTest} disabled={loading || isTesting}>
                            {isTesting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                            Bağlantıyı Test Et
                        </Button>
                        <Button onClick={handleConnect} disabled={loading || isTesting}>
                            {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                            Kaydet ve Bağlan
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
