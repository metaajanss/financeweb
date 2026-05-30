"use client";

import React from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { 
    ArrowRightIcon
} from "lucide-react";

import { BrandIcons } from "@/shared/components/brand-icons";
import Image from "next/image";

const integrations = [
    { name: "HubSpot", color: "#FF7A59", icon: BrandIcons.Hubspot, delay: 0 },
    { name: "Salesforce", color: "#00A1E0", icon: BrandIcons.Salesforce, delay: 0.1 },
    { name: "Slack", color: "#4A154B", icon: BrandIcons.Slack, delay: 0.2 },
    { name: "Gmail", color: "#EA4335", icon: BrandIcons.Gmail, delay: 0.3 },
    { name: "WhatsApp", color: "#25D366", icon: BrandIcons.WhatsApp, delay: 0.4 },
    { name: "Stripe", color: "#635BFF", icon: BrandIcons.Stripe, delay: 0.5 },
    { name: "Zapier", color: "#FF4F00", icon: BrandIcons.Zapier, delay: 0.6 },
    { name: "Google Sheets", color: "#34A853", icon: BrandIcons.GoogleSheets, delay: 0.7 },
    { name: "Pipedrive", color: "#222222", icon: BrandIcons.Pipedrive, delay: 0.8 },
    { name: "Zoho", color: "#F44336", icon: BrandIcons.Zoho, delay: 0.9 },
];

export function IntegrationsShowcase() {
    const t = useTranslations("Landing.IntegrationsShowcase");

    return (
        <section id="integrations" className="py-24 lg:py-40 bg-zinc-50 dark:bg-background relative overflow-hidden z-0 border-y border-zinc-200 dark:border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]">
            {/* Ambient background effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-900/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-900/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 lg:mb-32">
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
                        className="text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl mb-8 text-balance text-foreground leading-[1.1]"
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

                {/* Orbit Visualizer */}
                <div className="relative h-[600px] md:h-[800px] flex items-center justify-center pointer-events-none [perspective:1200px]">
                    {/* Concentric Circles with 3D Rotation */}
                    <div className="absolute inset-0 flex items-center justify-center [transform:rotateX(60deg)]">
                        {[300, 500, 700].map((size, idx) => (
                            <m.div
                                key={size}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + idx * 0.1, duration: 1 }}
                                className="absolute rounded-full border border-zinc-900/[0.03] dark:border-white/5"
                                style={{ width: size, height: size }}
                            >
                                <div className="absolute inset-0 rounded-full border-t-2 border-zinc-900/10 dark:border-white/10 opacity-20 animate-[spin_20s_linear_infinite]" style={{ animationDirection: idx % 2 === 0 ? 'normal' : 'reverse' }} />
                            </m.div>
                        ))}
                    </div>

                    {/* Central Logo - Jumpix Core */}
                    <m.div
                        initial={{ scale: 0, opacity: 0, rotate: -45 }}
                        whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, type: "spring" }}
                        className="relative z-30 group"
                    >
                        <div className="w-28 h-28 md:w-40 md:h-40 bg-white dark:bg-zinc-900 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_100px_-20px_rgba(255,255,255,0.1)] flex items-center justify-center border border-black/5 dark:border-white/10 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-transparent dark:from-zinc-100/5 dark:to-transparent opacity-50" />
                            <div className="relative z-10 w-16 h-16 md:w-22 md:h-22 bg-zinc-900 dark:bg-white rounded-[2rem] flex items-center justify-center text-white dark:text-black font-black text-4xl md:text-5xl shadow-2xl transition-transform duration-700 group-hover:rotate-[360deg] group-hover:scale-90">
                                J
                            </div>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="absolute inset-0 border border-zinc-900/10 dark:border-white/10 rounded-full animate-ping" style={{ animationDelay: `${i * 1.5}s`, animationDuration: '4s' }} />
                            ))}
                        </div>
                    </m.div>

                    {/* Orbiting Icons */}
                    <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                        {integrations.map((item, i) => {
                            const angle = (i * (360 / integrations.length)) * (Math.PI / 180);
                            const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 160 + (i % 2) * 60 : 250 + (i % 2) * 100;
                            
                            return (
                                <m.div
                                    key={item.name}
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ 
                                        opacity: 1, 
                                        scale: 1,
                                        x: Math.cos(angle) * radius,
                                        y: Math.sin(angle) * radius
                                    }}
                                    viewport={{ once: true }}
                                    transition={{ 
                                        delay: item.delay + 0.5, 
                                        type: "spring", 
                                        stiffness: 80,
                                        damping: 15
                                    }}
                                    className="absolute group pointer-events-auto"
                                >
                                    <m.div
                                        animate={{ 
                                            y: [0, -15, 0],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{ 
                                            duration: 6 + (i % 3), 
                                            repeat: Infinity, 
                                            ease: "easeInOut",
                                            delay: i * 0.5
                                        }}
                                        className="relative"
                                    >
                                        <div 
                                            className="w-16 h-16 md:w-24 md:h-24 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-2xl md:rounded-[2rem] shadow-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] dark:group-hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.1)] group-hover:border-zinc-900/20 dark:group-hover:border-white/20"
                                            style={{ boxShadow: `0 10px 40px -10px ${item.color}30` }}
                                        >
                                            {typeof item.icon === 'string' ? (
                                                <Image src={item.icon} alt={item.name} width={40} height={40} className="w-7 h-7 md:w-10 md:h-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 object-contain" />
                                            ) : (
                                                <item.icon className="w-7 h-7 md:w-10 md:h-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
                                            )}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 whitespace-nowrap shadow-xl">
                                                {item.name}
                                            </div>
                                        </div>
                                    </m.div>
                                </m.div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-2 text-center relative z-20">
                    <m.button
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1 }}
                        className="group inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-[0_0_24px_rgba(168,85,247,0.4)] hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:brightness-110 hover:scale-[1.03] active:scale-95 transition-all"
                    >
                        {t("cta")}
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </m.button>
                </div>
            </div>
        </section>
    );
}
