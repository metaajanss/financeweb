"use client";
import React, { useState } from "react";
import { cn } from "@/shared/utils";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";
import {
    MailIcon,
    DatabaseIcon,
    CheckCircle2Icon,
    Settings2Icon,
    WorkflowIcon
} from "lucide-react";

const WorkflowNode = ({ children, icon: Icon, title, active = false }: any) => (
    <m.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
            "p-5 rounded-2xl border-2 flex flex-col items-center gap-2 min-w-[140px] relative transition-all duration-500",
            active 
                ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xl scale-110 z-20" 
                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 opacity-60 grayscale scale-95"
        )}
    >
        <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors",
            active ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
        )}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs font-bold uppercase tracking-tighter text-center">{title}</div>
        {children}
    </m.div>
);

const Connector = ({ active = false }: { active?: boolean }) => (
    <div className="flex flex-col items-center flex-shrink-0 -my-1">
        <div className={cn("w-[2px] h-12 transition-colors duration-500", active ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:border-zinc-800")} />
        <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", active ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:border-zinc-800")} />
    </div>
);

export function FeaturesSecondary() {
    const t = useTranslations("Landing.FeaturesSecondary");

    const tabs = [
        {
            id: "intake",
            label: t("tabs.intake.label"),
            title: t("tabs.intake.title"),
            description: t("tabs.intake.description"),
        },
        {
            id: "logic",
            label: t("tabs.logic.label"),
            title: t("tabs.logic.title"),
            description: t("tabs.logic.description"),
        },
        {
            id: "outreach",
            label: t("tabs.outreach.label"),
            title: t("tabs.outreach.title"),
            description: t("tabs.outreach.description"),
        },
        {
            id: "sync",
            label: t("tabs.sync.label"),
            title: t("tabs.sync.title"),
            description: t("tabs.sync.description"),
        }
    ];

    const [activeTab, setActiveTab] = useState(tabs[0].id);

    return (
        <section id="secondary-features" className="py-24 lg:py-32 bg-white dark:bg-zinc-950 relative overflow-hidden z-0 border-y border-zinc-200 dark:border-white/5">
            <div className="container mx-auto px-4 max-w-7xl relative z-10">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 lg:mb-24">
                    <div className="max-w-2xl">
                        <div className="text-zinc-600 dark:text-white/60 text-sm font-bold tracking-widest uppercase mb-4">{t("badge")}</div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
                            {t("title_line1")} <br className="hidden sm:block" />
                            {t("title_line2")}
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Navigation Left */}
                    <nav className="lg:col-span-4 flex flex-col gap-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "p-8 rounded-3xl text-left transition-all duration-500 border-2 group relative overflow-hidden",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] translate-x-2"
                                        : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 grayscale opacity-50 hover:opacity-100"
                                )}
                            >
                                <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3 text-zinc-500">{tab.label}</div>
                                <h3 className="text-xl font-black mb-3">{tab.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                    {tab.description}
                                </p>
                            </button>
                        ))}
                    </nav>

                    {/* Visualization Right */}
                    <div className="lg:col-span-8 bg-white dark:bg-zinc-900/50 rounded-[40px] border border-zinc-200 dark:border-zinc-800 h-[700px] flex items-center justify-center overflow-hidden relative shadow-2xl">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
                        
                        <AnimatePresence mode="wait">
                            <m.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="relative z-10 flex flex-col items-center gap-0"
                            >
                                {/* THE TREE */}
                                <WorkflowNode title={t('visualization.leadIntake')} icon={WorkflowIcon} active={activeTab === 'intake' || activeTab === 'logic' || activeTab === 'outreach' || activeTab === 'sync'} />
                                <Connector active={activeTab === 'logic' || activeTab === 'outreach' || activeTab === 'sync'} />
                                
                                <WorkflowNode title={t('visualization.aiReasoning')} icon={Settings2Icon} active={activeTab === 'logic' || activeTab === 'outreach' || activeTab === 'sync'}>
                                    <div className="absolute -right-32 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <div className="w-12 h-[2px] bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-[10px] font-bold">{t('visualization.rejected')}</div>
                                    </div>
                                </WorkflowNode>
                                <Connector active={activeTab === 'outreach' || activeTab === 'sync'} />

                                <WorkflowNode title={t('visualization.emailSequencer')} icon={MailIcon} active={activeTab === 'outreach' || activeTab === 'sync'} />
                                <Connector active={activeTab === 'sync'} />

                                <div className="flex gap-12 pt-0">
                                    <div className="flex flex-col items-center gap-0">
                                        <div className="w-[80px] h-[2px] bg-zinc-900 dark:bg-white absolute left-0 bottom-[120px] ml-[25%] hidden lg:block" style={{ width: '40px', transform: 'rotate(-45deg)', opacity: activeTab === 'sync' ? 1 : 0.2 }} />
                                        <WorkflowNode title={t('visualization.crmSync')} icon={DatabaseIcon} active={activeTab === 'sync'} />
                                    </div>
                                    <div className="flex flex-col items-center gap-0">
                                        <div className="w-[80px] h-[2px] bg-zinc-900 dark:bg-white absolute right-0 bottom-[120px] mr-[25%] hidden lg:block" style={{ width: '40px', transform: 'rotate(45deg)', opacity: activeTab === 'sync' ? 1 : 0.2 }} />
                                        <WorkflowNode title={t('visualization.meeting')} icon={CheckCircle2Icon} active={activeTab === 'sync'} />
                                    </div>
                                </div>
                            </m.div>
                        </AnimatePresence>

                        {/* Decoration tags */}
                        <div className="absolute top-10 left-10 flex gap-2">
                            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full">{t('visualization.activeFlow')}</div>
                            <div className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full">{t('visualization.aiEnabled')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
