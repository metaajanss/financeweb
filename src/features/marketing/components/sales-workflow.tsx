"use client";
import React, { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
    SearchIcon,
    RefreshCwIcon,
    MessageSquareIcon,
    MailIcon,
    UserIcon,
    DatabaseIcon,
    PhoneIcon,
    CheckCircle2Icon,
    BarChartIcon,
    CalendarIcon,
    TargetIcon,
    WorkflowIcon
} from "lucide-react";
import { cn } from "@/shared/utils";
import { useTranslations } from "next-intl";
import { BrandIcons } from "@/shared/components/brand-icons";

export function SalesWorkflow() {
    const t = useTranslations("Landing.SalesWorkflow");
    const [activeIdx, setActiveIdx] = useState(1);
    const [isHovered, setIsHovered] = useState(false);

    const tabs = [
        {
            id: "intake",
            title: t("tabs.intake.title"),
            subtitle: t("tabs.intake.subtitle"),
            icon: <DatabaseIcon className="w-6 h-6" />,
            color: "bg-[#f4f4f5]",
            activeBg: "bg-[#fafafa] dark:bg-zinc-950/30",
            description: t("tabs.intake.description"),
            steps: [
                { label: t("tabs.intake.steps.step1"), icon: <TargetIcon className="w-4 h-4" /> },
                { label: t("tabs.intake.steps.step2"), icon: <RefreshCwIcon className="w-4 h-4" /> },
                { label: t("tabs.intake.steps.step3"), icon: <SearchIcon className="w-4 h-4" /> },
                { label: t("tabs.intake.steps.step4"), icon: <DatabaseIcon className="w-4 h-4" /> }
            ]
        },
        {
            id: "qualify",
            title: t("tabs.qualify.title"),
            subtitle: t("tabs.qualify.subtitle"),
            icon: <BarChartIcon className="w-6 h-6" />,
            color: "bg-[#f4f4f5]",
            activeBg: "bg-[#fafafa] dark:bg-zinc-950/30",
            description: t("tabs.qualify.description"),
            steps: [
                { label: t("tabs.qualify.steps.step1"), icon: <UserIcon className="w-4 h-4" /> },
                { label: t("tabs.qualify.steps.step2"), icon: <TargetIcon className="w-4 h-4" /> },
                { label: t("tabs.qualify.steps.step3"), icon: <BarChartIcon className="w-4 h-4" /> },
                { label: t("tabs.qualify.steps.step4"), icon: <WorkflowIcon className="w-4 h-4" /> }
            ]
        },
        {
            id: "followup",
            title: t("tabs.followup.title"),
            subtitle: t("tabs.followup.subtitle"),
            icon: <MailIcon className="w-6 h-6" />,
            color: "bg-[#f4f4f5]",
            activeBg: "bg-[#fafafa] dark:bg-zinc-950/30",
            description: t("tabs.followup.description"),
            steps: [
                { label: t("tabs.followup.steps.step1"), icon: <RefreshCwIcon className="w-4 h-4" /> },
                { label: t("tabs.followup.steps.step2"), icon: <MailIcon className="w-4 h-4" /> },
                { label: t("tabs.followup.steps.step3"), icon: <MessageSquareIcon className="w-4 h-4" /> },
                { label: t("tabs.followup.steps.step4"), icon: <UserIcon className="w-4 h-4" /> }
            ]
        },
        {
            id: "convert",
            title: t("tabs.convert.title"),
            subtitle: t("tabs.convert.subtitle"),
            icon: <CalendarIcon className="w-6 h-6" />,
            color: "bg-[#f4f4f5]",
            activeBg: "bg-[#fafafa] dark:bg-zinc-950/30",
            description: t("tabs.convert.description"),
            steps: [
                { label: t("tabs.convert.steps.step1"), icon: <CalendarIcon className="w-4 h-4" /> },
                { label: t("tabs.convert.steps.step2"), icon: <RefreshCwIcon className="w-4 h-4" /> },
                { label: t("tabs.convert.steps.step3"), icon: <BarChartIcon className="w-4 h-4" /> },
                { label: t("tabs.convert.steps.step4"), icon: <CheckCircle2Icon className="w-4 h-4" /> }
            ]
        }
    ];

    const tabsCount = 4;
    useEffect(() => {
        if (isHovered) return;
        const autoPlayTimer = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % tabsCount);
        }, 4000);
        return () => clearInterval(autoPlayTimer);
    }, [isHovered, tabsCount]);

    const activeTab = tabs[activeIdx];

    return (
        <section id="workflow" className="py-24 lg:py-32 bg-zinc-50 dark:bg-background relative overflow-hidden font-sans bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.05),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]">
            {/* Subtle ambient glows for visual interest */}
            <div className="absolute top-0 right-0 w-[40%] h-[500px] bg-purple-500/5 dark:bg-white/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[500px] bg-indigo-500/5 dark:bg-white/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="w-full">
                <div className="mb-12">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium mb-4">
                        <span className="text-xl leading-none">+</span>
                        <span className="text-[15px] tracking-wide">{t("badge")}</span>
                    </div>
                    <h2 className="text-[40px] md:text-[44px] font-semibold text-zinc-900 dark:text-white leading-[1.1] tracking-tight">
                        {t("title_start")} <br />
                        <span className="text-zinc-600 dark:text-zinc-400">{t("title_end")}</span>
                    </h2>
                </div>

                <div
                    className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[28px] overflow-hidden shadow-sm"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-100 dark:border-zinc-800/50">
                        {tabs.map((tab, idx) => {
                            const isActive = idx === activeIdx;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveIdx(idx)}
                                    className={cn(
                                        "relative flex flex-col items-start p-6 outline-none transition-all duration-300 border-r border-zinc-100 dark:border-zinc-800/50 last:border-r-0 min-h-[100px] overflow-hidden",
                                        isActive ? "bg-white dark:bg-zinc-950" : "bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/20"
                                    )}
                                >
                                    {isActive && !isHovered && (
                                        <>
                                            <m.div
                                                key={`top-bar-${idx}`}
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 4, ease: "linear" }}
                                                className="absolute top-0 left-0 h-[3px] bg-zinc-900 dark:bg-white z-20"
                                            />
                                            <m.div
                                                key={`bg-fill-${idx}`}
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 4, ease: "linear" }}
                                                className="absolute inset-0 origin-left bg-zinc-50 dark:bg-zinc-950/20 z-0"
                                            />
                                        </>
                                    )}
                                    {isActive && isHovered && (
                                        <>
                                            <div className="absolute top-0 left-0 w-full h-[3px] bg-zinc-900 dark:bg-white z-20" />
                                            <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950/20 z-0" />
                                        </>
                                    )}

                                    {isActive && (
                                        <m.div
                                            layoutId="active-tab-indicator"
                                            className={cn("absolute top-0 bottom-0 left-0 w-1 z-20", tab.color)}
                                        />
                                    )}
                                    <div className="flex items-center gap-2 mb-1.5 opacity-90 relative z-10">
                                        <div className={cn("transition-colors", isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400")}>
                                            {React.cloneElement(tab.icon as React.ReactElement<any>, { className: "w-[18px] h-[18px]" })}
                                        </div>
                                        <span className={cn(
                                            "font-medium tracking-tight text-[17px]",
                                            isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                        )}>
                                            {tab.title}
                                        </span>
                                    </div>
                                    <span className="text-[14px] text-zinc-400 dark:text-zinc-500 font-normal leading-snug">
                                        {tab.subtitle}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-8 md:p-10">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                            <AnimatePresence mode="wait">
                                <m.div
                                    key={`header-${activeTab.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col gap-3 max-w-2xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl">
                                            {activeTab.icon}
                                        </div>
                                        <h3 className="text-[28px] font-semibold text-zinc-900 dark:text-white tracking-tight">
                                            {activeTab.title}
                                        </h3>
                                    </div>
                                    <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-medium">
                                        {activeTab.description}
                                    </p>
                                </m.div>
                            </AnimatePresence>

                            <button className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-semibold text-[14px] text-zinc-900 dark:text-zinc-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all active:scale-[0.98] self-start border-b-[3px] border-b-zinc-200 dark:border-b-zinc-800 active:border-b-0 active:translate-y-[2px]">
                                <BrandIcons.Google className="w-5 h-5" />
                                {t("googleButton")}
                            </button>
                        </div>

                        <div className="grid md:grid-cols-12 gap-6 relative">
                            <div className="md:col-span-4 bg-[#f8fafc] dark:bg-zinc-950/20 rounded-[24px] p-6 lg:p-8 flex items-center justify-center">
                                <div className="flex flex-col gap-6 relative w-full max-w-[280px]">
                                    <div className="absolute left-[39px] top-8 bottom-8 w-[2px] bg-zinc-200/50 dark:bg-zinc-900/50 border-r-2 border-dashed border-[#52525b]/30 -z-10" />
                                    <AnimatePresence mode="wait">
                                        <m.div
                                            key={`steps-${activeTab.id}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col gap-5 w-full"
                                        >
                                            {activeTab.steps.map((step, sIdx) => (
                                                <m.div
                                                    key={sIdx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: sIdx * 0.1, duration: 0.3 }}
                                                    className="bg-white dark:bg-zinc-900 rounded-[14px] p-4 flex items-center gap-4 shadow-sm border border-black/5 dark:border-white/5"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700 shadow-sm shrink-0">
                                                        {step.icon}
                                                    </div>
                                                    <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">{step.label}</span>
                                                </m.div>
                                            ))}
                                        </m.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="md:col-span-8 bg-[#f8fafc] dark:bg-zinc-950/20 rounded-[24px] p-6 lg:p-10 flex flex-col items-center justify-center overflow-hidden relative">
                                <AnimatePresence mode="wait">
                                    <m.div
                                        key={`mockup-${activeTab.id}`}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.4 }}
                                        className="w-full max-w-2xl"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-[#3f3f46] dark:text-[#52525b] font-semibold text-[15px] mb-6">
                                            {activeTab.title} {t("progress")} <RefreshCwIcon className="w-4 h-4 animate-spin-slow" />
                                        </div>

                                        <div className="w-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[20px] border border-white dark:border-white/10 shadow-xl overflow-hidden">
                                            <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-4 gap-2">
                                                <div className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10" />
                                                <div className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10" />
                                                <div className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10" />
                                            </div>
                                            <div className="p-4 flex flex-col gap-3">
                                                {activeTab.id === "intake" && (t.raw('dummyData.intake') as any[]).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-4 bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-white/50 dark:border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 flex items-center justify-center font-bold text-[10px] text-zinc-500">
                                                            {item.name[0]}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-md w-1/3 mb-2" />
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{item.source}</span>
                                                                <span className="text-[10px] text-zinc-400">{item.time}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{item.status}</div>
                                                    </div>
                                                ))}

                                                {activeTab.id === "qualify" && (t.raw('dummyData.qualify') as any[]).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-4 bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-white/50 dark:border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-md w-1/4 mb-2" />
                                                            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full w-full overflow-hidden">
                                                                <m.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${item.score}%` }}
                                                                    className={cn("h-full", item.score > 70 ? "bg-emerald-500" : "bg-amber-500")}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{item.score}</div>
                                                    </div>
                                                ))}

                                                {activeTab.id === "followup" && (t.raw('dummyData.followup') as any[]).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-4 bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-white/50 dark:border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 flex items-center justify-center text-zinc-400">
                                                            {item.step.includes("WhatsApp") ? <PhoneIcon className="w-3 h-3" /> : <MailIcon className="w-3 h-3" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-md w-1/3 mb-2" />
                                                            <div className="text-[10px] text-zinc-500 italic">{item.step}</div>
                                                        </div>
                                                        <div className="text-[10px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                                            {item.seq}
                                                        </div>
                                                    </div>
                                                ))}

                                                {activeTab.id === "convert" && (t.raw('dummyData.convert') as any[]).map((item, i) => {
                                                    const icons = [<CheckCircle2Icon key="check" className="w-3 h-3" />, <CalendarIcon key="cal1" className="w-3 h-3" />, <DatabaseIcon key="db" className="w-3 h-3" />, <RefreshCwIcon key="refresh" className="w-3 h-3" />, <CalendarIcon key="cal2" className="w-3 h-3" />];
                                                    return (
                                                    <div key={i} className="flex items-center gap-4 bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-white/50 dark:border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                            {icons[i % icons.length]}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-md w-1/4 mb-2" />
                                                            <div className="text-[10px] font-semibold text-zinc-400">{item.deal}</div>
                                                        </div>
                                                        <div className="text-[10px] uppercase tracking-taller text-zinc-400 font-bold">{item.status}</div>
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                    </m.div>
                                </AnimatePresence>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    </section>
    );
}
