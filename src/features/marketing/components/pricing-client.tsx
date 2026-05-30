"use client";

import React from "react";
import Link from "next/link";
import { CheckIcon, Minus, Check } from "lucide-react";
import { m } from "framer-motion";

import { Button } from "@/shared/components/ui/button";
import { type PricingContent, type FeatureComparison, type ComparisonCategory, type ComparisonContent } from "@/shared/types/pricing";


interface PricingClientProps {
    pricing: PricingContent;
    eyebrow: string;
    locale: string;
    showComparison?: boolean;
}

function withLocale(locale: string, href: string) {
    return href.startsWith("/") ? `/${locale}${href}` : href;
}

// ... existing PricingTable and FeatureValue components ...

function PricingTable({ comparison }: { comparison: ComparisonContent }) {
    const _planCount = comparison.columnNames.length - 1; // Exclude feature name column

    return (
        <div className="mt-32 hidden lg:block overflow-x-auto custom-scrollbar">
            <div className="mb-12 text-center">
                <h3 className="text-3xl font-black tracking-tight">{comparison.title}</h3>
            </div>
            
            <div className="relative min-w-[800px] overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/50 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/50">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="border-b border-zinc-200/60 dark:border-white/10">
                            <th className="p-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">{comparison.columnNames[0]}</th>
                            {comparison.columnNames.slice(1).map((colName) => (
                                <th key={colName} className="p-6 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">{colName}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {comparison.categories.map((category: ComparisonCategory) => (
                            <React.Fragment key={category.name}>
                                <tr className="bg-zinc-100/50 dark:bg-white/5">
                                    <td colSpan={comparison.columnNames.length} className="p-4 text-xs font-black uppercase tracking-[0.2em] text-primary/80">
                                        {category.name}
                                    </td>
                                </tr>
                                {category.features.map((feature: FeatureComparison) => (
                                    <tr 
                                        key={feature.name} 
                                        className={`border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors`}
                                    >
                                        <td className="p-6 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {feature.name}
                                        </td>
                                        {comparison.columnNames.slice(1).map((colName, index) => {
                                            // The property key to get from feature could be lowercase colName or something similar
                                            // Since we use dynamic keys now, we need to match it.
                                            // Let's assume the keys are starter, growth, pro, business in order.
                                            const keys = ['free', 'starter', 'growth', 'pro', 'business', 'enterprise']; // fallback list
                                            const key = keys[index] || colName.toLowerCase();
                                            return (
                                                <td key={colName} className="p-6 text-center">
                                                    <div className="flex justify-center">
                                                        <FeatureValue value={feature[key]} />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FeatureValue({ value, isFeatured }: { value: string | boolean; isFeatured?: boolean }) {
    if (typeof value === "boolean") {
        return value ? (
            <div className={`mx-auto rounded-full p-1 w-fit ${isFeatured ? "btn-primary-gradient text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                <Check className="h-4 w-4" />
            </div>
        ) : (
            <div className="mx-auto w-fit text-zinc-300 dark:text-zinc-700">
                <Minus className="h-4 w-4" />
            </div>
        );
    }
    return <span className={`text-sm font-semibold ${isFeatured ? "text-primary dark:text-primary-foreground" : "text-zinc-600 dark:text-zinc-400"}`}>{value || "-"}</span>;
}

export function PricingClient({ pricing, eyebrow, locale, showComparison = false }: PricingClientProps) {

    return (
        <section id="pricing" className="relative overflow-hidden bg-white dark:bg-zinc-950 py-24 lg:py-32">
            {/* Background elements */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(142,68,173,0.05),transparent)]" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

            <div className="container mx-auto max-w-7xl px-4">
                <div className="mx-auto max-w-4xl text-center">
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
                        <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                            {pricing.title}
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-muted-foreground">
                            {pricing.subtitle}
                        </p>
                    </m.div>
                </div>

                {/* Plans Grid */}
                <div className={`mt-16 grid gap-4 lg:gap-3 ${
                    pricing.plans.length === 5 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" :
                    pricing.plans.length === 4 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3"
                }`}>
                    {pricing.plans.map((plan, index) => (
                        <m.article
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`relative flex h-full flex-col rounded-[2rem] border p-6 lg:p-5 transition-all hover:shadow-2xl ${
                                plan.featured
                                    ? "ring-2 ring-white !border-white !border-2 bg-zinc-950 text-white z-20 shadow-[0_0_80px_-12px_rgba(255,255,255,0.2)]"
                                    : "border-zinc-200/60 bg-white/50 backdrop-blur-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950/50 dark:text-white"
                            }`}
                        >
                            {plan.featured && (
                                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden -z-10 bg-zinc-950">
                                    <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-primary/40 blur-[100px] rounded-full" />
                                    <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-600/30 blur-[100px] rounded-full" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_60%)]" />
                                </div>
                            )}

                            {plan.featured ? (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full btn-primary-gradient px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white shadow-lg z-30">
                                    {pricing.recommended}
                                </div>
                            ) : null}

                            <div className="mb-5 relative z-10">
                                <p className={`text-sm font-bold uppercase tracking-widest ${
                                    plan.featured ? "text-primary-foreground/70" : "text-primary"
                                }`}>
                                    {plan.name}
                                </p>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl lg:text-3xl xl:text-4xl font-black tracking-tighter">
                                        {plan.isCustom ? plan.price : `$${plan.price}`}
                                    </span>
                                    {!plan.isCustom && (
                                        <span className={`text-lg transition-opacity ${
                                            plan.featured ? "text-white/60 dark:text-zinc-500" : "text-muted-foreground"
                                        }`}>
                                            {plan.period}
                                        </span>
                                    )}
                                </div>
                                <p className={`mt-4 text-sm leading-6 ${
                                    plan.featured ? "text-white/70 dark:text-zinc-600" : "text-muted-foreground"
                                }`}>
                                    {plan.description}
                                </p>
                            </div>

                            <div className="flex-1 space-y-2.5 relative z-10">
                                {plan.features.map((feature: string) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <div className={`mt-1 rounded-full p-0.5 ${
                                            plan.featured ? "bg-primary/20 text-primary-foreground" : "bg-primary/10 text-primary"
                                        }`}>
                                            <CheckIcon className="h-4 w-4" />
                                        </div>
                                        <span className={`text-sm ${
                                            plan.featured ? "text-white/90 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"
                                        }`}>
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 relative z-10">
                                <Link href={withLocale(locale, plan.ctaHref)}>
                                    <Button
                                        className={`h-12 w-full rounded-xl text-base font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ${
                                            plan.featured
                                                ? "!bg-white !text-zinc-950 hover:!bg-zinc-100 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] !border-white !border-2"
                                                : "btn-primary-gradient text-white shadow-md hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                        }`}
                                    >
                                        {plan.ctaLabel}
                                    </Button>
                                </Link>
                            </div>
                        </m.article>
                    ))}
                </div>

                <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground italic">
                    {pricing.footnote}
                </p>

                {showComparison && pricing.Comparison && (
                    <PricingTable comparison={pricing.Comparison} />
                )}

            </div>
        </section>
    );
}
