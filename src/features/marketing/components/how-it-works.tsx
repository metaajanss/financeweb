"use client";
import React from "react";
import { ArrowRightIcon, PlugIcon, SettingsIcon, RocketIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
    const t = useTranslations("Landing.HowItWorks");

    const steps = [
        {
            number: "01",
            title: t("steps.step1.title"),
            description: t("steps.step1.description"),
            icon: <PlugIcon className="w-6 h-6 text-[#007AFF]" />
        },
        {
            number: "02",
            title: t("steps.step2.title"),
            description: t("steps.step2.description"),
            icon: <SettingsIcon className="w-6 h-6 text-purple-400" />
        },
        {
            number: "03",
            title: t("steps.step3.title"),
            description: t("steps.step3.description"),
            icon: <RocketIcon className="w-6 h-6 text-pink-400" />
        },
    ];

    return (
        <section id="how-it-works" className="py-24 lg:py-40 bg-background relative overflow-hidden z-0 border-b border-zinc-200 dark:border-white/5">
            {/* Soft ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[300px] bg-[#007AFF]/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center mb-20 ">
                    <h2 className="text-5xl font-black tracking-tighter sm:text-6xl text-balance mb-6">
                        {t("title")}
                    </h2>
                    <p className="mt-4 text-xl text-muted-foreground/80 font-medium">{t("subtitle")}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative items-stretch">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[3.5rem] left-[16%] right-[16%] h-[1px] bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/20 to-transparent -z-10" />

                    {steps.map((step, index) => (
                        <div key={index} className="flex flex-col items-center text-center group  h-full" style={{ animationDelay: `${index * 150}ms` }}>

                            {/* Number & Icon Badge */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-[#007AFF]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-white dark:bg-[#050508] border border-zinc-200 dark:border-white/5 flex flex-col items-center justify-center shadow-lg transition-transform duration-500 group-hover:-translate-y-2 group-hover:border-zinc-900/10 dark:group-hover:border-white/15">
                                    <span className="absolute top-1.5 left-2 text-[10px] font-bold text-muted-foreground/40">{step.number}</span>
                                    {step.icon}
                                </div>
                            </div>

                            {/* Content Card */}
                            <div className="p-8 rounded-[2.5rem] w-full border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-[#050508] flex-1 flex flex-col items-center group-hover:bg-white dark:group-hover:bg-[#0A0A0F] transition-all duration-500 shadow-xl group-hover:shadow-2xl">
                                <h3 className="text-2xl font-black mb-4 tracking-tight text-foreground">{step.title}</h3>
                                <p className="text-muted-foreground/80 text-lg leading-relaxed">{step.description}</p>
                            </div>

                            {/* Mobile Arrow */}
                            {index < steps.length - 1 && (
                                <ArrowRightIcon className="md:hidden mt-6 w-5 h-5 text-muted-foreground/20 rotate-90" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
