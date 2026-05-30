"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Target, Users, Zap, LayoutDashboard,
    Settings, Bell, Mail, BarChart3, MoreHorizontal,
    Plus, ArrowRight, MousePointer2,
    ChevronRight, Inbox, List, Share2,
    CreditCard, HelpCircle, Filter,
    Calendar, MessageSquare
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Hotspot {
    id: string;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    title: string;
    description: string;
    actionId: string;
    icon: React.ElementType;
}

export function InteractiveShowcase() {
    const t = useTranslations('Landing.InteractiveShowcase');
    
    const [activeView, setActiveView] = useState<string>('dashboard');
    const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const hotspots: Hotspot[] = useMemo(() => [
        { id: 'hs-search', x: 10, y: 24.5, title: t('hotspots.search.title'), description: t('hotspots.search.description'), actionId: 'search', icon: Search },
        { id: 'hs-flowagent', x: 10, y: 30, title: t('hotspots.flowagent.title'), description: t('hotspots.flowagent.description'), actionId: 'sequences', icon: Zap },
        { id: 'hs-inbox', x: 10, y: 35.5, title: t('hotspots.inbox.title'), description: t('hotspots.inbox.description'), actionId: 'inbox', icon: Inbox },
        { id: 'hs-analytics', x: 10, y: 47, title: t('hotspots.analytics.title'), description: t('hotspots.analytics.description'), actionId: 'analytics', icon: BarChart3 },
    ], [t]);

    const handleHotspotClick = useCallback((hotspot: Hotspot) => {
        setActiveView(hotspot.actionId);
    }, []);

    if (!isMounted) return null;

    return (
        <div id="showcase" className="relative w-full max-w-7xl mx-auto py-24 px-4 flex flex-col items-center justify-center">
            
            {/* Clean White Background for Page Integration */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-white dark:bg-[#030712]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            </div>

            <div className="text-center mb-16 z-10 space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-bold uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                    <MousePointer2 className="w-3 h-3" />
                    {t('badge')}
                </motion.div>
                <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
                    {t('title_start')} <br /> {t('title_end')}
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                    {t('description')}
                </p>
            </div>

            {/* Main Mockup Container - Detailed Admin UI */}
            <div className="relative w-full z-10 bg-white dark:bg-[#030712] rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 p-1 md:p-2 overflow-visible">
                
                <div className="relative w-full aspect-[16/10] md:aspect-[16/9] bg-[#fbfbfc] dark:bg-[#030712] rounded-[1.8rem] border border-slate-200 dark:border-zinc-800 overflow-hidden flex">
                    
                    {/* Sidebar - Richer Navigation */}
                    <aside className="w-16 lg:w-64 border-r border-slate-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-[#030712] z-20">
                        <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-100 dark:border-zinc-800/50">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-lg dark:text-white hidden lg:block tracking-tight text-zinc-900">LeadProduct</span>
                        </div>
                        
                        <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Main Navigation */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2 hidden lg:block">{t('sidebar.mainMenu')}</p>
                                {[
                                    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
                                    { id: 'search', icon: Search, label: t('sidebar.search') },
                                    { id: 'sequences', icon: Zap, label: t('sidebar.sequences') },
                                    { id: 'inbox', icon: Inbox, label: t('sidebar.inbox') },
                                    { id: 'lists', icon: List, label: t('sidebar.lists') },
                                    { id: 'analytics', icon: BarChart3, label: t('sidebar.analytics') },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                                            activeView === item.id 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400' 
                                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        <item.icon size={18} className={activeView === item.id ? 'opacity-100' : 'opacity-70'} />
                                        <span className="hidden lg:block">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Secondary Section */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2 hidden lg:block">{t('sidebar.system')}</p>
                                {[
                                    { id: 'integrations', icon: Share2, label: t('sidebar.integrations') },
                                    { id: 'billing', icon: CreditCard, label: t('sidebar.billing') },
                                    { id: 'settings', icon: Settings, label: t('sidebar.settings') },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all"
                                    >
                                        <item.icon size={18} className="opacity-70" />
                                        <span className="hidden lg:block">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer Profile */}
                        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-[#030712]">
                             <div className="flex items-center gap-3 p-1 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer ring-1 ring-transparent active:ring-zinc-200">
                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-sm flex items-center justify-center text-[10px] font-bold dark:text-white">EO</div>
                                <div className="hidden lg:block overflow-hidden">
                                    <p className="text-xs font-bold dark:text-zinc-100 truncate">Emirhan O.</p>
                                    <p className="text-[10px] text-zinc-500 truncate">emre@lead.io</p>
                                </div>
                                <MoreHorizontal size={14} className="text-zinc-400 ml-auto hidden lg:block" />
                             </div>
                        </div>
                    </aside>

                    {/* Content Section - Detailed Views */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#030712] relative overflow-hidden">
                        
                        {/* Top Bar */}
                        <header className="h-16 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md z-10 transition-colors">
                            <div className="flex items-center gap-3">
                                <button className="lg:hidden p-2 text-zinc-500"><LayoutDashboard size={18} /></button>
                                <div className="flex items-center text-xs font-semibold text-zinc-400 hidden sm:flex">
                                    <span>{t('header.platform')}</span>
                                    <ChevronRight size={14} className="mx-1 opacity-50" />
                                    <span className="text-zinc-900 dark:text-zinc-100 capitalize">{activeView}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="relative w-48 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                                    <input 
                                        type="text" 
                                        placeholder={t('header.shortcut')} 
                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-xs font-medium text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                        readOnly
                                    />
                                </div>
                                <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800 mx-1 hidden md:block"></div>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors relative">
                                        <Bell size={18} />
                                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-[#030712]"></span>
                                    </button>
                                    <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"><HelpCircle size={18} /></button>
                                </div>
                            </div>
                        </header>

                        {/* Main Body */}
                        <main className="flex-1 p-6 lg:p-10 overflow-auto custom-scrollbar bg-[#fbfbfc] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(51,65,85,0.05),transparent),radial-gradient(ellipse_at_bottom_right,rgba(15,23,42,0.02),#030712)]">
                            <AnimatePresence mode="wait">
                                {activeView === 'dashboard' && (
                                    <motion.div 
                                        key="dashboard"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h1 className="text-2xl font-bold dark:text-white tracking-tight">{t('views.dashboard.greeting')}</h1>
                                                <p className="text-sm text-zinc-500 font-medium">{t('views.dashboard.subtitle')}</p>
                                            </div>
                                            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                                                <Plus size={16} /> {t('views.dashboard.newCampaign')}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { label: t('views.dashboard.activeLeads'), val: '12,482', icon: Users, up: true, change: '12%' },
                                                { label: t('views.dashboard.openRate'), val: '64.2%', icon: Mail, up: true, change: '4.1%' },
                                                { label: t('views.dashboard.replyRate'), val: '18.9%', icon: MessageSquare, up: true, change: '2.4%' },
                                                { label: t('views.dashboard.booking'), val: '142', icon: Calendar, up: false, change: '3%' }
                                            ].map((card, i) => (
                                                <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 group-hover:text-indigo-600 transition-colors">
                                                            <card.icon size={18} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${card.up ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 bg-red-50 dark:bg-red-500/10'}`}>
                                                            {card.up ? '↑' : '↓'} {card.change}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{card.label}</p>
                                                    <h4 className="text-2xl font-bold dark:text-white mt-1">{card.val}</h4>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Chart Simulation */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[1.5rem] p-6 flex flex-col h-72">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="font-bold text-sm dark:text-white">{t('views.dashboard.campaignPerformance')}</h3>
                                                    <label htmlFor="showcase-period-select" className="sr-only">{t('views.dashboard.campaignPerformance')}</label>
                                                    <select id="showcase-period-select" className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold py-1 px-2 rounded-lg outline-none cursor-pointer">
                                                        <option>{t('views.dashboard.last7Days')}</option>
                                                        <option>{t('views.dashboard.last30Days')}</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1 flex items-end gap-2 group/chart">
                                                    {[35, 65, 45, 85, 50, 95, 70, 40, 80, 55, 100, 60, 85, 45].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative group/bar hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors cursor-pointer" style={{ height: `${h}%` }}>
                                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity">
                                                                {h}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[1.5rem] p-6 space-y-6">
                                                <h3 className="font-bold text-sm dark:text-white">{t('views.dashboard.trendingChannels')}</h3>
                                                <div className="space-y-5">
                                                    {[
                                                        { label: t('views.dashboard.email'), val: 82, color: 'bg-indigo-500' },
                                                        { label: t('views.dashboard.linkedin'), val: 64, color: 'bg-blue-500' },
                                                        { label: t('views.dashboard.whatsapp'), val: 45, color: 'bg-emerald-500' },
                                                    ].map((item, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">{item.label}</span>
                                                                <span className="text-[10px] font-bold text-zinc-400">%{item.val}</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className={`h-full ${item.color} rounded-full`} transition={{ duration: 1, delay: i * 0.1 }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1">{t('views.dashboard.viewAll')} <ArrowRight size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeView === 'search' && (
                                    <motion.div 
                                        key="search"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center rounded-xl"><Users size={20} /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold dark:text-white">{t('views.search.title')}</h3>
                                                    <p className="text-xs text-zinc-500 font-medium">{t('views.search.subtitle')}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                                    <Filter size={14} /> {t('views.search.filters')}
                                                </button>
                                                <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 transition-all">{t('views.search.query')}</button>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-[#fbfbfc] dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                                                        <tr>
                                                            {t.raw('views.search.cols').map((c: string, j: number) => (
                                                                <th key={j} className="p-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{c}</th>
                                                            ))}
                                                            <th className="p-5"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                                        {[
                                                            { name: 'Oğuzhan Kaya', role: 'CTO', company: 'Nova Tech', location: 'İstanbul, TR', status: t('views.search.statusVerified') },
                                                            { name: 'Dilara Mert', role: 'Head of Growth', company: 'Cloudly Inc', location: 'London, UK', status: t('views.search.statusVerified') },
                                                            { name: 'Sertan Ünal', role: 'Director', company: 'FinansGo', location: 'Dubai, UAE', status: t('views.search.statusPending') },
                                                            { name: 'Ayşe Karaca', role: 'VP Sales', company: 'MarketBox', location: 'Berlin, DE', status: t('views.search.statusVerified') },
                                                            { name: 'Burak Ateş', role: 'Founder', company: 'DeepAI', location: 'Paris, FR', status: t('views.search.statusVerified') },
                                                        ].map((lead, i) => (
                                                            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                                                <td className="p-5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-bold dark:text-zinc-300">{lead.name[0]}</div>
                                                                        <div>
                                                                            <p className="text-sm font-bold dark:text-zinc-100">{lead.name}</p>
                                                                            <p className="text-[10px] text-zinc-500 font-medium">{lead.role}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <p className="text-xs font-bold dark:text-zinc-400">{lead.company}</p>
                                                                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">{t('views.search.industry')}</p>
                                                                </td>
                                                                <td className="p-5 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">{lead.location}</td>
                                                                <td className="p-5">
                                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${lead.status === t('views.search.statusVerified') ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50'}`}>
                                                                        {lead.status}
                                                                    </span>
                                                                </td>
                                                                <td className="p-5 text-right">
                                                                    <button className="p-1 px-3 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors dark:text-zinc-400">{t('views.search.details')}</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-4 bg-[#fbfbfc] dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold text-zinc-500">
                                                <span>{t('views.search.showing')}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm opacity-50">{t('views.search.prev')}</button>
                                                    <button className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm">{t('views.search.next')}</button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeView === 'sequences' && (
                                    <motion.div 
                                        key="sequences"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <h3 className="text-xl font-bold dark:text-white">{t('views.sequences.title')}</h3>
                                                <p className="text-xs text-zinc-500 font-medium mt-1">{t('views.sequences.subtitle')}</p>
                                            </div>
                                            <div className="relative z-10 flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-[11px] font-bold text-emerald-600">{t('views.sequences.statusActive')}</span>
                                                </div>
                                                <button className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95">{t('views.sequences.edit')}</button>
                                            </div>
                                            <div className="absolute top-0 right-1/4 w-32 h-full bg-indigo-500/5 -skew-x-12 group-hover:bg-indigo-500/10 transition-colors"></div>
                                        </div>

                                        <div className="flex flex-col items-center gap-6 py-4 relative">
                                            <div className="absolute top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 z-0"></div>

                                            {/* Sequence Steps */}
                                            {[
                                                { step: 1, type: 'Email', label: t('views.sequences.initialConnection'), day: t('views.sequences.stepDay1'), content: t('views.sequences.emailBody', {company: 'Acme Corp'}) },
                                                { step: 2, type: 'Decision', label: t('views.sequences.wait3Days'), content: '' },
                                                { step: 3, type: 'LinkedIn', label: t('views.sequences.linkedinVisit'), day: t('views.sequences.stepDay4'), content: t('views.sequences.linkedinBody') }
                                            ].map((node, i) => (
                                                <div key={i} className="w-full max-w-lg relative z-10">
                                                    {node.type === 'Decision' ? (
                                                        <div className="flex justify-center my-2">
                                                            <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 backdrop-blur-sm">
                                                                {node.label}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-[1.5rem] shadow-sm flex gap-4 ring-1 ring-transparent hover:ring-indigo-500/30 transition-all cursor-pointer group">
                                                            <div className={`p-4 rounded-xl flex items-center justify-center flex-shrink-0 ${node.type === 'Email' ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600' : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600'}`}>
                                                                {node.type === 'Email' ? <Mail size={20} /> : <Share2 size={20} />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{node.day}</p>
                                                                    <MoreHorizontal size={14} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                                                                </div>
                                                                <h4 className="font-bold text-sm dark:text-zinc-100">{node.label}</h4>
                                                                {node.content && <p className="text-[11px] text-zinc-500 mt-2 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700 italic">"{node.content}"</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <button className="relative z-10 px-6 py-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-[11px] font-bold text-zinc-400 hover:border-indigo-500 hover:text-indigo-500 transition-all uppercase tracking-widest">{t('views.sequences.addStep')}</button>
                                        </div>
                                    </motion.div>
                                )}

                                {activeView === 'analytics' && (
                                    <motion.div 
                                        key="analytics"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.02 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 bg-zinc-900 dark:bg-white p-8 rounded-[2rem] text-white dark:text-zinc-900 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={120} /></div>
                                                <div className="relative z-10">
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">{t('views.analytics.totalRevenue')}</p>
                                                    <h3 className="text-4xl font-black tracking-tighter mt-2">$24,842.00</h3>
                                                    <div className="mt-8 flex gap-3">
                                                        <div className="px-3 py-1 bg-white/10 dark:bg-zinc-900/10 rounded-lg text-[10px] font-bold">{t('views.analytics.multiplier')}</div>
                                                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 rounded-lg text-[10px] font-bold">{t('views.analytics.vsPrevMonth')}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2rem] flex flex-col justify-center text-center">
                                                <div className="mx-auto w-24 h-24 rounded-full border-[6px] border-zinc-100 dark:border-zinc-800 border-t-indigo-500 flex items-center justify-center mb-4">
                                                    <span className="text-2xl font-black dark:text-white">92%</span>
                                                </div>
                                                <p className="text-xs font-bold dark:text-zinc-100 uppercase tracking-widest">{t('views.analytics.inboxRate')}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium mt-1">{t('views.analytics.inboxDesc')}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2rem]">
                                            <div className="flex items-center justify-between mb-8">
                                                <h4 className="font-bold dark:text-white">{t('views.analytics.replyAnalysis')}</h4>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> {t('views.analytics.positive')}</div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400"><div className="w-2 h-2 rounded-full bg-zinc-300"></div> {t('views.analytics.neutral')}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                {t.raw('views.analytics.channels').map((channelLabel: string, i: number) => {
                                                    const bar = [
                                                        { pos: 68, neu: 32 },
                                                        { pos: 45, neu: 55 },
                                                        { pos: 24, neu: 76 }
                                                    ][i];
                                                    return (
                                                        <div key={i} className="space-y-2">
                                                            <div className="flex justify-between text-[11px] font-bold dark:text-zinc-400">
                                                                <span>{channelLabel}</span>
                                                                <span>%{bar.pos} {t('views.analytics.positive')}</span>
                                                            </div>
                                                            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full flex overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${bar.pos}%` }} className="bg-indigo-500 h-full" transition={{ duration: 1, delay: i * 0.1 }} />
                                                                <div className="bg-zinc-300 dark:bg-zinc-700 h-full flex-1" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </main>
                    </div>

                    {/* Hotspots Overlay - Subtle Tour Points */}
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        {hotspots.map((hotspot) => {
                            const isHovered = hoveredHotspot === hotspot.id;
                            const isActive = activeView === hotspot.actionId;

                            return (
                                <div
                                    key={hotspot.id}
                                    className="absolute pointer-events-auto"
                                    style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                                >
                                    <div
                                        className="relative -translate-x-1/2 -translate-y-1/2 group"
                                        onMouseEnter={() => setHoveredHotspot(hotspot.id)}
                                        onMouseLeave={() => setHoveredHotspot(null)}
                                        onClick={() => handleHotspotClick(hotspot)}
                                    >
                                        <div className="cursor-pointer flex items-center justify-center">
                                            {/* Minimalist Subtle Ring */}
                                            <div 
                                                className={`absolute w-8 h-8 rounded-full border transition-all duration-500 ${isHovered || isActive ? 'scale-125 border-indigo-500 opacity-100 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-zinc-400/30 opacity-40 animate-pulse'}`} 
                                            />
                                            {/* Compact Core Dot */}
                                            <div 
                                                className={`w-2.5 h-2.5 rounded-full z-10 transition-all duration-300 ${isHovered || isActive ? 'bg-indigo-600 scale-110 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-zinc-400/60'}`}
                                            />
                                        </div>

                                        {/* Subtle Clean Tooltip */}
                                        <AnimatePresence>
                                            {(isHovered) && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: 5, scale: 0.95 }}
                                                    className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-56 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-zinc-800 z-50 pointer-events-none backdrop-blur-sm ring-1 ring-black/5"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                                                            <hotspot.icon size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <span className="font-bold text-[13px] dark:text-zinc-100 tracking-tight">{hotspot.title}</span>
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
                                                        {hotspot.description}
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                                        {t('tooltip.clickToView')} <ArrowRight size={10} className="ml-0.5" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Manual Navigation Controls Info */}
                <div className="mt-6 flex flex-wrap justify-center gap-3 px-6 pb-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] w-full text-center mb-1">{t('quickAccess')}</p>
                    {hotspots.map((hs) => (
                        <button
                            key={hs.id}
                            onClick={() => setActiveView(hs.actionId)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                                activeView === hs.actionId 
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800' 
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                            }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${activeView === hs.actionId ? 'bg-indigo-600 shadow-[0_0_5px_rgba(79,70,229,0.5)]' : 'bg-zinc-300'}`}></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {hs.title.split(' ').slice(-2).join(' ')}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
