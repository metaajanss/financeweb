'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText, Search, ExternalLink, Trash2,
    Loader2, CheckCircle2, Clock, Bot, Plus,
    X, Play, Pause, Zap, AlertCircle,
} from 'lucide-react';
import { getPosts, deletePost } from '@/features/blog';
import {
    getTopicsAction,
    createTopicAction,
    updateTopicAction,
    deleteTopicAction,
    triggerGenerationAction,
    getGenerationQueueAction,
    type TopicInput,
} from '@/features/blog';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ACTIVE_LOCALES } from '@/config/locales';

type Tab = 'posts' | 'agent';

const TONE_LABELS = {
    informative: 'Bilgilendirici',
    persuasive:  'İkna Edici',
    casual:      'Samimi',
} as const;

const SCHEDULE_LABELS = {
    manual:  'Manuel',
    daily:   'Her Gün',
    weekly:  'Haftalık',
} as const;

const STATUS_BADGE: Record<string, { label: string; icon: React.ReactElement; className: string }> = {
    completed:  { label: 'Tamamlandı', icon: <CheckCircle2 size={12} />,                          className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    pending:    { label: 'Bekliyor',   icon: <Clock size={12} />,                                  className: 'bg-amber-400/10 text-amber-500 border-amber-400/20' },
    processing: { label: 'Üretiliyor', icon: <Loader2 size={12} className="animate-spin" />,       className: 'bg-blue-400/10 text-blue-500 border-blue-400/20' },
    failed:     { label: 'Hata',       icon: <AlertCircle size={12} />,                            className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export default function BlogAdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>('posts');

    // ── Posts tab ─────────────────────────────────────────────────────────────
    const [posts, setPosts]           = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [search, setSearch]         = useState('');

    // ── Agent tab ─────────────────────────────────────────────────────────────
    const [topics, setTopics]         = useState<any[]>([]);
    const [queue, setQueue]           = useState<any[]>([]);
    const [loadingAgent, setLoadingAgent] = useState(false);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // Topic form
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [keywordInput, setKeywordInput]   = useState('');
    const [topicForm, setTopicForm] = useState<TopicInput>({
        keywords:        [],
        tone:            'informative',
        length_words:    1200,
        posts_per_run:   1,
        auto_publish:    false,
        schedule_type:   'manual',
        generation_mode: 'combined',
    });

    useEffect(() => { fetchPosts(); }, []);
    useEffect(() => { if (activeTab === 'agent') fetchAgentData(); }, [activeTab]);

    async function fetchPosts() {
        setLoadingPosts(true);
        try { setPosts(await getPosts(true)); }
        catch { toast.error('Yazılar yüklenemedi'); }
        finally { setLoadingPosts(false); }
    }

    async function fetchAgentData() {
        setLoadingAgent(true);
        try {
            const [t, q] = await Promise.all([getTopicsAction(), getGenerationQueueAction()]);
            setTopics(t);
            setQueue(q);
        } catch { toast.error('Ajan verileri yüklenemedi'); }
        finally { setLoadingAgent(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return;
        try { await deletePost(id); toast.success('Yazı silindi'); fetchPosts(); }
        catch { toast.error('Silme işlemi başarısız'); }
    }

    // ── Keyword helpers ───────────────────────────────────────────────────────

    function parseAndAddKeywords(raw: string) {
        const incoming = raw.split(/[\n,،;|]+/).map(k => k.trim()).filter(k => k.length > 0);
        if (!incoming.length) return 0;
        setTopicForm(f => {
            const next = [...f.keywords];
            for (const kw of incoming) if (!next.includes(kw)) next.push(kw);
            return { ...f, keywords: next };
        });
        setKeywordInput('');
        return incoming.length;
    }

    function addKeyword() { parseAndAddKeywords(keywordInput); }

    function handleKeywordPaste(e: React.ClipboardEvent<HTMLInputElement>) {
        const text = e.clipboardData.getData('text');
        if (/[\n,،;|]/.test(text)) {
            e.preventDefault();
            const count = parseAndAddKeywords(text);
            if (count > 1) toast.success(`${count} keyword eklendi`);
        }
    }

    function removeKeyword(kw: string) {
        setTopicForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }));
    }

    // ── Topic handlers ────────────────────────────────────────────────────────

    async function handleCreateTopic() {
        if (!topicForm.keywords.length) { toast.error('En az bir keyword ekleyin'); return; }
        try {
            const { topic } = await createTopicAction(topicForm);
            setShowTopicForm(false);
            setTopicForm({ keywords: [], tone: 'informative', length_words: 1200, posts_per_run: 1, auto_publish: false, schedule_type: 'manual', generation_mode: 'combined' });
            fetchAgentData();

            if (topicForm.auto_publish && topic?.id) {
                toast.loading('Yazılar üretiliyor...', { id: 'gen' });
                const res = await triggerGenerationAction(topic.id);
                if (res.success) {
                    toast.success(`Üretildi ve yayınlandı: ${res.count === 1 ? `"${res.titles[0]}"` : `${res.count} yazı`}`, { id: 'gen' });
                    fetchAgentData(); fetchPosts();
                } else {
                    toast.error(`Üretim hatası: ${res.errors?.[0] ?? 'Bilinmeyen hata'}`, { id: 'gen' });
                }
            } else {
                toast.success('Konu oluşturuldu');
            }
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleToggleTopic(id: string, currentStatus: string) {
        try {
            await updateTopicAction(id, { status: currentStatus === 'active' ? 'paused' : 'active' });
            fetchAgentData();
        } catch (e: any) { toast.error(e.message); }
    }

    async function handleDeleteTopic(id: string) {
        if (!confirm('Bu konuyu silmek istediğinize emin misiniz?')) return;
        try { await deleteTopicAction(id); toast.success('Konu silindi'); fetchAgentData(); }
        catch (e: any) { toast.error(e.message); }
    }

    async function handleGenerate(topicId: string) {
        setGeneratingId(topicId);
        try {
            const res = await triggerGenerationAction(topicId);
            if (res.success) {
                toast.success(`Üretildi: ${res.count === 1 ? `"${res.titles[0]}"` : `${res.count} yazı`}`);
                fetchAgentData(); fetchPosts();
            } else {
                toast.error(`Üretim hatası: ${res.errors?.[0] ?? 'Bilinmeyen hata'}`);
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setGeneratingId(null); }
    }

    const filteredPosts = posts.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.slug?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <FileText size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Platform Content Engine</span>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-none">
                        Blog <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        AI destekli blog içeriği üretin ve yönetin.
                    </p>
                </div>

                {activeTab === 'agent' && (
                    <button
                        onClick={() => setShowTopicForm(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-primary/90 transition-all shadow-[0_15px_35px_rgba(var(--primary-rgb),0.35)]"
                    >
                        <Plus size={18} />
                        Yeni Konu Ekle
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl border border-border w-fit">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'posts' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-slate-500 hover:text-foreground'}`}
                >
                    <FileText size={14} />
                    Yazılar
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">{posts.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('agent')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'agent' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-slate-500 hover:text-foreground'}`}
                >
                    <Bot size={14} />
                    Blog Ajanı
                    {topics.filter(t => t.status === 'active').length > 0 && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            {topics.filter(t => t.status === 'active').length} aktif
                        </span>
                    )}
                </button>
            </div>

            {/* ── POSTS TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'posts' && (
                <>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-border">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Yazı ara..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500">Toplam: <span className="text-foreground">{posts.length}</span></span>
                            <span className="text-xs font-bold text-slate-500">Dil: <span className="text-foreground">{ACTIVE_LOCALES.length}</span></span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="p-4">İçerik</th>
                                    <th className="p-4">Yayın</th>
                                    <th className="p-4">Lokalizasyon</th>
                                    <th className="p-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loadingPosts ? (
                                    <tr><td colSpan={4} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-primary" size={40} />
                                            <p className="text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">Yükleniyor...</p>
                                        </div>
                                    </td></tr>
                                ) : filteredPosts.length === 0 ? (
                                    <tr><td colSpan={4} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-500">
                                            <FileText size={48} className="opacity-20" />
                                            <p className="text-sm font-bold">Henüz yazı yok. Blog Ajanı sekmesinden içerik üretin.</p>
                                        </div>
                                    </td></tr>
                                ) : filteredPosts.map(post => (
                                    <tr key={post.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground group-hover:text-primary transition-colors text-base">{post.title}</span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">/{post.slug}</span>
                                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                                                    <span className="bg-primary/5 px-2 py-0.5 rounded border border-primary/10 text-primary font-bold">
                                                        {post.profiles?.full_name || 'System'}
                                                    </span>
                                                    <span className="opacity-30">•</span>
                                                    <span>{post.created_at ? format(new Date(post.created_at), 'd MMM yyyy', { locale: tr }) : '—'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {post.published ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit">
                                                    <CheckCircle2 size={12} /> Yayında
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-500 font-black text-[10px] uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 w-fit">
                                                    <Clock size={12} /> Taslak
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-1.5">
                                                    <div title="Kaynak: English" className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[9px] font-black text-primary shadow-sm">EN</div>
                                                    {post.post_translations?.map((t: any) => (
                                                        <div title={`Çeviri: ${t.language.toUpperCase()}`} key={t.language} className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-[9px] font-black text-emerald-500 uppercase shadow-sm">
                                                            {t.language}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                                    {(post.post_translations?.length ?? 0) + 1} / {ACTIVE_LOCALES.length}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/blog/${post.slug}`} target="_blank">
                                                    <button className="p-2.5 rounded-xl bg-secondary hover:text-primary transition-all border border-border hover:shadow-md">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 hover:shadow-md"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ── AGENT TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'agent' && (
                <div className="space-y-8">
                    {/* Cron Info Banner */}
                    <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200 text-xs md:text-sm flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <div className="space-y-1">
                            <p className="font-black uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">Vercel Free Cron Zamanlaması</p>
                            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                                Sistem Vercel Free Cron ile çalıştığı için otomatik üretimler <strong>günde 1 kez (gece yarısı UTC / TSİ 03:00)</strong> tetiklenir. 
                                "Her Gün" seçilen aktif konular bu saatte otomatik üretilir. "Haftalık" seçilen konular ise haftada bir kez aynı saatte çalışır.
                            </p>
                        </div>
                    </div>

                    {loadingAgent ? (
                        <div className="flex flex-col items-center gap-4 py-24">
                            <Loader2 className="animate-spin text-primary" size={40} />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ajan Yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {topics.length === 0 ? (
                                <div className="flex flex-col items-center gap-6 py-24 text-slate-500">
                                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <Bot size={36} className="text-primary" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-black text-foreground text-lg">Blog Ajanı Hazır</p>
                                        <p className="text-sm">Keyword ekleyerek otomatik içerik üretimine başlayın.</p>
                                    </div>
                                    <button onClick={() => setShowTopicForm(true)} className="flex items-center gap-2 px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all">
                                        <Plus size={16} /> İlk Konuyu Ekle
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {topics.map(topic => (
                                        <div key={topic.id} className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {topic.keywords.map((kw: string) => (
                                                            <span key={kw} className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-black rounded-lg border border-primary/20">{kw}</span>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                                                        <span className="font-bold">{TONE_LABELS[topic.tone as keyof typeof TONE_LABELS] ?? topic.tone}</span>
                                                        <span className="opacity-30">•</span>
                                                        <span className="font-bold">{topic.length_words.toLocaleString()} kelime</span>
                                                        <span className="opacity-30">•</span>
                                                        <span className={`font-black uppercase tracking-wide ${topic.schedule_type !== 'manual' ? 'text-primary' : ''}`}>
                                                            {SCHEDULE_LABELS[topic.schedule_type as keyof typeof SCHEDULE_LABELS] ?? topic.schedule_type}
                                                        </span>
                                                        <span className="opacity-30">•</span>
                                                        {topic.generation_mode === 'per_keyword' ? (
                                                            <span className="flex items-center gap-1 font-black text-violet-500 uppercase tracking-wide">
                                                                Sıralı
                                                                <span className="text-slate-400 font-normal normal-case tracking-normal">
                                                                    ({(topic.last_keyword_index ?? 0) % topic.keywords.length + 1}/{topic.keywords.length} sırada)
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-blue-500 uppercase tracking-wide">Birleşik</span>
                                                        )}
                                                        <span className="opacity-30">•</span>
                                                        <span className="font-black text-foreground">
                                                            {topic.posts_per_run ?? 1}
                                                            <span className="font-normal text-slate-400"> yazı/çalışma</span>
                                                        </span>
                                                        <span className="opacity-30">•</span>
                                                        <span className={topic.auto_publish ? 'text-emerald-500 font-black' : 'font-bold'}>
                                                            {topic.auto_publish ? 'Otomatik Yayın' : 'Taslak'}
                                                        </span>
                                                        {topic.last_run_at && (
                                                            <>
                                                                <span className="opacity-30">•</span>
                                                                <span>Son: {format(new Date(topic.last_run_at), 'd MMM HH:mm', { locale: tr })}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleGenerate(topic.id)}
                                                        disabled={generatingId === topic.id}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-[11px] font-black transition-all border border-primary/20 disabled:opacity-50"
                                                    >
                                                        {generatingId === topic.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                                        {generatingId === topic.id ? 'Üretiliyor...' : 'Üret'}
                                                    </button>
                                                    <button onClick={() => handleToggleTopic(topic.id, topic.status)} className="p-2 rounded-xl bg-secondary hover:text-foreground transition-all border border-border">
                                                        {topic.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>
                                                    <button onClick={() => handleDeleteTopic(topic.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 ${topic.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                                    {topic.status === 'active' ? 'Aktif' : 'Durduruldu'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {queue.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary shrink-0">Üretim Geçmişi</h3>
                                        <div className="h-[2px] w-full bg-gradient-to-r from-primary/30 to-transparent rounded-full" />
                                    </div>
                                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-muted/50 border-b border-border">
                                                <tr>
                                                    <th className="p-4">Başlık / Keywords</th>
                                                    <th className="p-4">Durum</th>
                                                    <th className="p-4">Tetikleyen</th>
                                                    <th className="p-4">Tarih</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {queue.map(item => (
                                                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="p-4">
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-sm text-foreground">
                                                                    {item.generated_title ?? <span className="text-slate-500 italic">Üretiliyor...</span>}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.blog_generation_topics?.keywords?.map((kw: string) => (
                                                                        <span key={kw} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[10px] rounded border border-primary/10">{kw}</span>
                                                                    ))}
                                                                </div>
                                                                {item.error_message && <p className="text-[11px] text-red-500 font-mono">{item.error_message}</p>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {(() => {
                                                                const s = STATUS_BADGE[item.status];
                                                                return s ? (
                                                                    <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${s.className}`}>
                                                                        {s.icon} {s.label}
                                                                    </div>
                                                                ) : <span className="text-[11px] text-slate-400">{item.status}</span>;
                                                            })()}
                                                        </td>
                                                        <td className="p-4 text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                                                            {item.triggered_by === 'manual' ? 'Manuel' : 'Zamanl.'}
                                                        </td>
                                                        <td className="p-4 text-[11px] text-slate-500">
                                                            {format(new Date(item.created_at), 'd MMM HH:mm', { locale: tr })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── NEW TOPIC MODAL ────────────────────────────────────────────── */}
            {showTopicForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[2.5rem] border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-gradient-to-br from-primary via-[#9B59B6] to-[#8E44AD] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white/20 border border-white/30 text-white"><Bot size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Yeni Konu</h3>
                                        <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mt-0.5">Blog Ajan Konfigürasyonu</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTopicForm(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                            {/* Keywords */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Keywords</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tek keyword veya yapıştır: seo, içerik, strateji..."
                                        value={keywordInput}
                                        onChange={e => setKeywordInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                        onPaste={handleKeywordPaste}
                                        className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-white/5 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                                    />
                                    <button onClick={addKeyword} className="px-4 py-3 bg-primary text-white rounded-xl text-[11px] font-black hover:bg-primary/90 transition-all">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">Virgül, yeni satır veya noktalı virgülle toplu yapıştır.</p>
                                {topicForm.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {topicForm.keywords.map(kw => (
                                            <span key={kw} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-black rounded-lg border border-primary/20">
                                                {kw}
                                                <button onClick={() => removeKeyword(kw)} className="hover:text-red-500 transition-colors"><X size={11} /></button>
                                            </span>
                                        ))}
                                        {topicForm.keywords.length > 1 && (
                                            <button onClick={() => setTopicForm(f => ({ ...f, keywords: [] }))} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-black text-red-400 hover:text-red-600 transition-colors">
                                                <X size={11} /> Tümünü temizle
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tone & Length */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Ton</label>
                                    <select value={topicForm.tone} onChange={e => setTopicForm(f => ({ ...f, tone: e.target.value as any }))} className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:border-primary/50 transition-all">
                                        <option value="informative">Bilgilendirici</option>
                                        <option value="persuasive">İkna Edici</option>
                                        <option value="casual">Samimi</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Kelime Sayısı</label>
                                    <input type="number" min={500} max={4000} step={100} value={topicForm.length_words} onChange={e => setTopicForm(f => ({ ...f, length_words: Number(e.target.value) }))} className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:border-primary/50 transition-all" />
                                </div>
                            </div>

                            {/* Posts per run */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Çalışma Başına Yazı Sayısı</label>
                                    <span className="text-2xl font-black text-primary tabular-nums w-8 text-center">{topicForm.posts_per_run}</span>
                                </div>
                                <input type="range" min={1} max={10} step={1} value={topicForm.posts_per_run} onChange={e => setTopicForm(f => ({ ...f, posts_per_run: Number(e.target.value) }))} className="w-full accent-primary h-2 rounded-full cursor-pointer" />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold select-none">
                                    {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
                                </div>
                                <div className="p-3 rounded-xl bg-muted/60 border border-border text-[11px] text-slate-500 leading-relaxed">
                                    {topicForm.generation_mode === 'combined' && topicForm.posts_per_run === 1 && <span>Her çalışmada tüm keyword'leri kapsayan <strong>1 yazı</strong> üretilir.</span>}
                                    {topicForm.generation_mode === 'combined' && topicForm.posts_per_run > 1  && <span>Her çalışmada aynı keyword'ler için <strong>{topicForm.posts_per_run} farklı açıdan</strong> yazı üretilir.</span>}
                                    {topicForm.generation_mode === 'per_keyword' && topicForm.posts_per_run === 1 && <span>Her çalışmada sıradaki keyword için <strong>1 yazı</strong> üretilir.</span>}
                                    {topicForm.generation_mode === 'per_keyword' && topicForm.posts_per_run > 1  && <span>Her çalışmada <strong>{topicForm.posts_per_run} keyword</strong> sırayla işlenir.</span>}
                                    {topicForm.schedule_type !== 'manual' && <span className="block mt-1 text-primary font-bold">→ {topicForm.schedule_type === 'daily' ? 'Günlük' : 'Haftalık'} çalışmada {topicForm.posts_per_run} yazı üretilir.</span>}
                                </div>
                            </div>

                            {/* Generation Mode */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Üretim Modu</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setTopicForm(f => ({ ...f, generation_mode: 'combined' }))} className={`p-4 rounded-2xl border-2 text-left transition-all ${topicForm.generation_mode === 'combined' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${topicForm.generation_mode === 'combined' ? 'border-blue-500' : 'border-zinc-300'}`}>
                                                {topicForm.generation_mode === 'combined' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">Birleşik</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">Tüm keyword'ler <strong>tek yazıda</strong> birleşir.</p>
                                        <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                            ["seo", "içerik"] → 1 kapsamlı yazı
                                        </div>
                                    </button>
                                    <button type="button" onClick={() => setTopicForm(f => ({ ...f, generation_mode: 'per_keyword' }))} className={`p-4 rounded-2xl border-2 text-left transition-all ${topicForm.generation_mode === 'per_keyword' ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${topicForm.generation_mode === 'per_keyword' ? 'border-violet-500' : 'border-zinc-300'}`}>
                                                {topicForm.generation_mode === 'per_keyword' && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">Sıralı</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">Her çalışmada <strong>sıradaki keyword</strong> işlenir.</p>
                                        <div className="mt-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-600 dark:text-violet-400 font-bold">
                                            Gün 1 → "seo" | Gün 2 → "içerik"
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Schedule & Publish */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Zamanlama</label>
                                    <select value={topicForm.schedule_type} onChange={e => setTopicForm(f => ({ ...f, schedule_type: e.target.value as any }))} className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:border-primary/50 transition-all">
                                        <option value="manual">Manuel</option>
                                        <option value="daily">Her Gün</option>
                                        <option value="weekly">Haftalık</option>
                                    </select>
                                    {topicForm.schedule_type !== 'manual' && (
                                        <p className="text-[10px] text-blue-500 font-bold leading-normal mt-1">
                                            * Otomatik üretimler her gece yarısı UTC (TSİ 03:00) tetiklenir.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Yayın Modu</label>
                                    <button onClick={() => setTopicForm(f => ({ ...f, auto_publish: !f.auto_publish }))} className={`w-full p-3 rounded-xl text-sm font-black border-2 transition-all ${topicForm.auto_publish ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-white/5 text-slate-500'}`}>
                                        {topicForm.auto_publish ? '✓ Otomatik Yayın' : 'Taslak Olarak Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-white/5 flex gap-3">
                            <button onClick={() => setShowTopicForm(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-all">İptal</button>
                            <button onClick={handleCreateTopic} className="flex-1 py-4 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Konuyu Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
