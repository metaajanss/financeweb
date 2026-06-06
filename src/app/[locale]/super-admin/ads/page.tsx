'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminAdsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [adsConfig, setAdsConfig] = useState({
        adsCode: '',
        topAdCode: '',
        midAdCode: '',
        bottomAdCode: '',
        adsTxt: ''
    });

    useEffect(() => {
        fetch('/api/ads')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setAdsConfig({
                        adsCode: data.adsCode || '',
                        topAdCode: data.topAdCode || '',
                        midAdCode: data.midAdCode || '',
                        bottomAdCode: data.bottomAdCode || '',
                        adsTxt: data.adsTxt || ''
                    });
                }
            })
            .catch(() => toast.error('Reklam ayarları yüklenemedi'))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/ads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adsConfig)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Reklam ayarları başarıyla kaydedildi');
            } else {
                toast.error('Kaydetme işlemi başarısız: ' + (data.error || 'Bilinmeyen hata'));
            }
        } catch {
            toast.error('Sunucuyla iletişim kurulurken bir hata oluştu');
        } finally {
            setSaving(false);
        }
    }

    const handleChange = (key: keyof typeof adsConfig, value: string) => {
        setAdsConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Settings size={14} className="animate-spin-slow" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Platform Settings</span>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-none">
                        Reklam <span className="text-primary">Yönetimi</span>
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Tüm hesaplayıcılarda gösterilecek reklam alanlarını ve ads.txt içeriğini yapılandırın.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
                {/* Genel Reklam Kodu */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                    <div className="flex items-start gap-3 justify-between">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Genel Reklam Kodu</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                HTML Head bölümüne enjekte edilecek kod (AdSense Auto Ads kodu, Google Analytics veya diğer script etiketleri).
                            </p>
                        </div>
                    </div>
                    <textarea
                        value={adsConfig.adsCode}
                        onChange={e => handleChange('adsCode', e.target.value)}
                        placeholder="<!-- Örn: <script async src='https://pagead2.googlesyndication.com/.../js/adsbygoogle.js' ...></script> -->"
                        className="w-full h-32 p-3 font-mono text-xs bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>

                {/* Özel Reklam Alanları */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Özel Reklam Yerleşimleri (Ad Slots)</h3>
                    
                    <div className="grid gap-6">
                        {/* Top Ad */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Üst Reklam Kodu (Top Ad Slot - 728×90)</label>
                            <textarea
                                value={adsConfig.topAdCode}
                                onChange={e => handleChange('topAdCode', e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-24 p-3 font-mono text-xs bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        {/* Mid Ad */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Orta Reklam Kodu (Mid Ad Slot - Duyarlı/Responsive)</label>
                            <textarea
                                value={adsConfig.midAdCode}
                                onChange={e => handleChange('midAdCode', e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-24 p-3 font-mono text-xs bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        {/* Bottom Ad */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Alt Reklam Kodu (Bottom Ad Slot - Duyarlı/Responsive)</label>
                            <textarea
                                value={adsConfig.bottomAdCode}
                                onChange={e => handleChange('bottomAdCode', e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-24 p-3 font-mono text-xs bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* ads.txt İçeriği */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">ads.txt İçeriği</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Sitenin ana dizininde (/ads.txt) gösterilecek olan yetkilendirilmiş dijital satıcı listesi.
                        </p>
                    </div>
                    <textarea
                        value={adsConfig.adsTxt}
                        onChange={e => handleChange('adsTxt', e.target.value)}
                        placeholder="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"
                        className="w-full h-32 p-3 font-mono text-xs bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>

                {/* Kaydet Butonu */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-primary/90 transition-all shadow-[0_15px_35px_rgba(var(--primary-rgb),0.35)] disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Değişiklikleri Kaydet
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
