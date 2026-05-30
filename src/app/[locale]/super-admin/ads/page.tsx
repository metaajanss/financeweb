'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Loader2, Code, FileText, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';

export default function AdsAdminPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [adsCode, setAdsCode] = useState('');
    const [topAdCode, setTopAdCode] = useState('');
    const [midAdCode, setMidAdCode] = useState('');
    const [bottomAdCode, setBottomAdCode] = useState('');
    const [adsTxt, setAdsTxt] = useState('');

    useEffect(() => {
        fetch('/api/ads')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setAdsCode(data.adsCode || '');
                    setTopAdCode(data.topAdCode || '');
                    setMidAdCode(data.midAdCode || '');
                    setBottomAdCode(data.bottomAdCode || '');
                    setAdsTxt(data.adsTxt || '');
                }
            })
            .catch(console.error);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adsCode, topAdCode, midAdCode, bottomAdCode, adsTxt })
            });
            if (res.ok) {
                toast.success('Ad settings saved successfully.');
            } else {
                toast.error('Could not save.');
            }
        } catch (error) {
            toast.error('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Megaphone size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Platform Monetization</span>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-none">
                        Ad <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Manage your Google Adsense codes, ad slots (Top, Mid, Bottom) and ads.txt content here.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-primary/90 transition-all shadow-[0_15px_35px_rgba(var(--primary-rgb),0.35)] disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid gap-8">
                {/* Google Adsense Code */}
                <div className="p-6 rounded-3xl border border-border bg-card/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <Code size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">General Adsense Code (Auto Ads)</h2>
                            <p className="text-sm text-slate-500">
                                Paste your general ad code to be added between &lt;head&gt; tags here.
                            </p>
                        </div>
                    </div>
                    <textarea
                        value={adsCode}
                        onChange={(e) => setAdsCode(e.target.value)}
                        placeholder="Ex: <script async src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXX' crossorigin='anonymous'></script>"
                        className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-white/5 rounded-2xl text-sm font-mono outline-none focus:border-primary/50 transition-all resize-none"
                    />
                </div>

                {/* Specific Ad Slots */}
                <div className="p-6 rounded-3xl border border-border bg-card/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <LayoutTemplate size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Specific Ad Slots (Manual &lt;ins&gt; Codes)</h2>
                            <p className="text-sm text-slate-500">
                                You can add specific codes to 3 different ad zones on the home page.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="font-bold mb-2 text-sm">Top Ad</h3>
                            <textarea
                                value={topAdCode}
                                onChange={(e) => setTopAdCode(e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-40 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-white/5 rounded-2xl text-sm font-mono outline-none focus:border-blue-500/50 transition-all resize-none"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold mb-2 text-sm">Mid Ad</h3>
                            <textarea
                                value={midAdCode}
                                onChange={(e) => setMidAdCode(e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-40 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-white/5 rounded-2xl text-sm font-mono outline-none focus:border-blue-500/50 transition-all resize-none"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold mb-2 text-sm">Bottom Ad</h3>
                            <textarea
                                value={bottomAdCode}
                                onChange={(e) => setBottomAdCode(e.target.value)}
                                placeholder="<ins class='adsbygoogle' ...></ins>"
                                className="w-full h-40 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-white/5 rounded-2xl text-sm font-mono outline-none focus:border-blue-500/50 transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Ads.txt Content */}
                <div className="p-6 rounded-3xl border border-border bg-card/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">ads.txt Content</h2>
                            <p className="text-sm text-slate-500">
                                Enter the content of your ads.txt file required for advertisers to verify your site.
                            </p>
                        </div>
                    </div>
                    <textarea
                        value={adsTxt}
                        onChange={(e) => setAdsTxt(e.target.value)}
                        placeholder="Ex: google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0"
                        className="w-full h-48 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-white/5 rounded-2xl text-sm font-mono outline-none focus:border-emerald-500/50 transition-all resize-none"
                    />
                </div>
            </div>
        </div>
    );
}
