"use client";

import { BrainCircuitIcon, FingerprintIcon, MessageSquareIcon, ZapIcon, BarChart3Icon, DatabaseIcon } from "lucide-react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";

export function Features() {
    const t = useTranslations("Landing.Features");

    return (
        <section id="features" className="pt-16 pb-24 lg:pt-24 lg:pb-40 bg-zinc-50 dark:bg-background relative overflow-hidden z-0 border-y border-zinc-200 dark:border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-[40%] h-[500px] bg-purple-500/5 dark:bg-white/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
                    <m.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-1.5 mb-8 text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] leading-none"
                    >
                        {t("badge")}
                    </m.div>
                    <m.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl mb-8 text-balance text-foreground leading-[1.05]"
                    >
                        {t("title")}
                    </m.h2>
                    <m.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-muted-foreground/80 leading-relaxed text-balance max-w-2xl mx-auto font-medium"
                    >
                        {t("description")}
                    </m.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                    {/* Feature 1: Large Bento Item (AI Scoring) */}
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="h-14 w-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <BrainCircuitIcon className="h-7 w-7" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight">{t("items.scoring.title")}</h3>
                                <p className="text-muted-foreground text-lg max-w-md leading-relaxed">{t("items.scoring.description")}</p>
                            </div>

                            {/* Polished Minimal UI Mockup */}
                            <div className="w-full h-40 mt-8 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 relative overflow-hidden p-6 flex items-end gap-3">
                                {[60, 100, 40, 80, 50, 90, 70].map((h, i) => (
                                    <m.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        whileInView={{ height: `${h}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 1, ease: "easeOut" }}
                                        className="flex-1 bg-gradient-to-t from-zinc-900/40 to-zinc-900/10 dark:from-white/20 dark:to-white/5 rounded-t-lg"
                                    />
                                ))}
                            </div>
                        </div>
                    </m.div>

                    {/* Feature 2: Tall Bento Item (Enrichment) */}
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="md:row-span-2 group relative overflow-hidden rounded-[2.5rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-500 hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="absolute bottom-0 left-0 h-full w-full bg-gradient-to-b from-transparent to-zinc-900/[0.02] dark:to-white/[0.02] z-0 pointer-events-none"></div>
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="h-14 w-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                <FingerprintIcon className="h-7 w-7" />
                            </div>
                            <h3 className="text-3xl font-black mb-4 tracking-tight">{t("items.enrichment.title")}</h3>
                            <p className="text-muted-foreground text-lg leading-relaxed mb-12">{t("items.enrichment.description")}</p>

                            <div className="flex-1 rounded-[2rem] bg-zinc-100/50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 relative overflow-hidden p-6">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.02)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.02)_100%)]"></div>
                                {/* Simulated Elegant UI Elements */}
                                <div className="space-y-4 relative z-10">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
                                            <div className="space-y-2 flex-1">
                                                <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
                                                <div className="h-2 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </m.div>

                    {/* Feature 3: Standard Item (Sequences) */}
                    <m.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="group relative overflow-hidden rounded-[2rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-500 hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="relative z-10">
                            <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-6 shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                <MessageSquareIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 tracking-tight">{t("items.autopilot.title")}</h3>
                            <p className="text-muted-foreground leading-relaxed">{t("items.autopilot.description")}</p>
                        </div>
                    </m.div>

                    {/* Feature 4: Standard Item (Widget) */}
                    <m.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="group relative overflow-hidden rounded-[2rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-500 hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="relative z-10">
                            <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-6 shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                <ZapIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 tracking-tight">{t("items.widget.title")}</h3>
                            <p className="text-muted-foreground leading-relaxed">{t("items.widget.description")}</p>
                        </div>
                    </m.div>

                    {/* Feature 5: Large Bento Item (Visibility) */}
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 }}
                        className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl transition-all duration-500 hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="relative z-10 h-full flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1">
                                <div className="h-14 w-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <BarChart3Icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight">{t("items.visibility.title")}</h3>
                                <p className="text-muted-foreground text-lg leading-relaxed">{t("items.visibility.description")}</p>
                            </div>
                            <div className="flex-1 w-full bg-black/[0.02] dark:bg-white/[0.02] rounded-3xl border border-black/5 dark:border-white/5 p-6 h-full flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-24 rounded-2xl bg-white dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 p-4 flex flex-col justify-between">
                                            <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
                                            <div className="h-4 w-16 bg-zinc-900 dark:bg-white rounded-md opacity-20"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </m.div>

                    {/* Feature 6: Standard Item (Stack) */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 }}
                        className="group relative overflow-hidden rounded-[2rem] border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-500 hover:border-zinc-900/20 dark:hover:border-white/20"
                    >
                        <div className="relative z-10">
                            <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-6 shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                <DatabaseIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 tracking-tight">{t("items.stack.title")}</h3>
                            <p className="text-muted-foreground leading-relaxed">{t("items.stack.description")}</p>
                        </div>
                    </m.div>
                </div>
            </div>
        </section>
    );
}

