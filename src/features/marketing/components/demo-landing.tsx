"use client";

import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/utils";
import { getDemoLandingContent } from "./demo-landing-content";
import {
    ArrowRight,
    BarChart3,
    Check,
    ChevronRight,
    Menu,
    MessagesSquare,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    Workflow,
} from "lucide-react";

type DemoLandingProps = {
    locale: string;
};

const leadRows = [
    { name: "A. Johnson", company: "Northline", score: "92" },
    { name: "M. Rivera", company: "Crest", score: "81" },
    { name: "T. Walker", company: "Orchid", score: "77" },
    { name: "L. Reed", company: "Atlas", score: "68" },
];

const signalRows = [
    { label: "High-intent inbound", tone: "emerald" },
    { label: "Needs routing review", tone: "amber" },
    { label: "Sequence reply detected", tone: "sky" },
];

const moduleIcons = [Search, Target, Workflow, BarChart3];
const visibilityIcons = [ShieldCheck, Sparkles, MessagesSquare];

function toneClasses(tone: string) {
    if (tone === "emerald") {
        return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
    }
    if (tone === "amber") {
        return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    }
    return "bg-sky-500/15 text-sky-700 border-sky-500/20";
}

export function DemoLanding({ locale }: DemoLandingProps) {
    const content = getDemoLandingContent(locale);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f6f3ee] text-zinc-950">
            <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(136,58,234,0.18),transparent_55%)] pointer-events-none" />
            <div className="absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(24,24,27,0.08),transparent_70%)] pointer-events-none" />
            <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f6f3ee]/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link href={`/${locale}/demo`} className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#161616,#7c3aed)] text-sm font-black text-white shadow-[0_20px_60px_-24px_rgba(124,58,237,0.65)]">
                            J
                        </div>
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.26em] text-zinc-500">Jumpix</div>
                            <div className="text-sm font-medium text-zinc-700">Demo landing concept</div>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        {content.header.nav.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                        <Link href={`/${locale}/contact`}>
                            <Button variant="ghost" className="rounded-full px-5 text-sm font-semibold text-zinc-700 hover:bg-black/5">
                                {content.header.secondaryCta}
                            </Button>
                        </Link>
                        <Link href={`/${locale}/contact`}>
                            <Button className="rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(0,0,0,0.8)] hover:bg-zinc-800">
                                {content.header.primaryCta}
                            </Button>
                        </Link>
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full border-black/10 bg-white/80 md:hidden">
                                <Menu />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[90vw] max-w-sm border-l border-black/10 bg-[#f6f3ee]">
                            <SheetHeader>
                                <SheetTitle>Jumpix Demo</SheetTitle>
                                <SheetDescription>Use the sections below to review the concept quickly.</SheetDescription>
                            </SheetHeader>
                            <div className="mt-8 flex flex-col gap-3">
                                {content.header.nav.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-semibold text-zinc-800"
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-col gap-3">
                                <Link href={`/${locale}/contact`}>
                                    <Button variant="outline" className="h-12 w-full rounded-2xl border-black/10 bg-white">
                                        {content.header.secondaryCta}
                                    </Button>
                                </Link>
                                <Link href={`/${locale}/contact`}>
                                    <Button className="h-12 w-full rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800">
                                        {content.header.primaryCta}
                                    </Button>
                                </Link>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main>
                <section className="px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
                    <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div className="max-w-2xl">
                            <Badge variant="outline" className="rounded-full border-black/10 bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-700">
                                {content.hero.eyebrow}
                            </Badge>
                            <h1 className="mt-8 text-5xl font-black leading-[0.94] tracking-[-0.05em] text-zinc-950 sm:text-6xl lg:text-[5.2rem]">
                                {content.hero.title}
                            </h1>
                            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600 sm:text-xl">
                                {content.hero.description}
                            </p>

                            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                                <Link href={`/${locale}/contact`}>
                                    <Button className="h-14 rounded-full bg-zinc-950 px-7 text-base font-semibold text-white hover:bg-zinc-800">
                                        {content.hero.primaryCta}
                                        <ArrowRight className="ml-1" />
                                    </Button>
                                </Link>
                                <Link href={`/${locale}/pricing`}>
                                    <Button variant="outline" className="h-14 rounded-full border-black/10 bg-white/80 px-7 text-base font-semibold text-zinc-900">
                                        {content.hero.secondaryCta}
                                    </Button>
                                </Link>
                            </div>

                            <div className="mt-10 flex flex-wrap gap-3">
                                {content.hero.support.map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-full border border-black/8 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700"
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.25),transparent_70%)] lg:block" />
                            <div className="rounded-[32px] border border-black/10 bg-white/85 p-4 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
                                <div className="rounded-[28px] border border-black/8 bg-[#fbfaf8] p-4 sm:p-5">
                                    <div className="flex items-center justify-between border-b border-black/6 pb-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">Revenue workspace</p>
                                            <p className="mt-2 text-lg font-black text-zinc-950">Jumpix operator view</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="h-3 w-3 rounded-full bg-zinc-300" />
                                            <div className="h-3 w-3 rounded-full bg-zinc-300" />
                                            <div className="h-3 w-3 rounded-full bg-zinc-300" />
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                                        <Card className="rounded-[28px] border-black/6 bg-white shadow-none">
                                            <CardContent className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-zinc-950">{content.hero.queueTitle}</p>
                                                        <p className="mt-1 text-sm leading-6 text-zinc-500">{content.hero.queueSubtitle}</p>
                                                    </div>
                                                    <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">SDR</div>
                                                </div>

                                                <div className="mt-5 space-y-3">
                                                    {leadRows.map((lead) => (
                                                        <div key={lead.name} className="flex items-center justify-between rounded-2xl border border-black/6 bg-[#faf7f2] px-4 py-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">{lead.name}</p>
                                                                <p className="text-xs font-medium text-zinc-500">{lead.company}</p>
                                                            </div>
                                                            <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700">
                                                                {lead.score}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="space-y-4">
                                            <Card className="rounded-[28px] border-black/6 bg-zinc-950 text-white shadow-none">
                                                <CardContent className="p-5">
                                                    <p className="text-sm font-bold text-white">{content.hero.sequenceTitle}</p>
                                                    <p className="mt-1 text-sm leading-6 text-zinc-300">{content.hero.sequenceSubtitle}</p>
                                                    <div className="mt-5 space-y-3">
                                                        {signalRows.map((row) => (
                                                            <div
                                                                key={row.label}
                                                                className={cn(
                                                                    "rounded-2xl border px-3 py-2 text-sm font-semibold",
                                                                    toneClasses(row.tone)
                                                                )}
                                                            >
                                                                {row.label}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="rounded-[28px] border-black/6 bg-white shadow-none">
                                                <CardContent className="grid grid-cols-3 gap-3 p-5">
                                                    {content.hero.panelStats.map((stat) => (
                                                        <div key={stat.label} className="rounded-2xl bg-[#f5f1ea] p-4">
                                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                                                                {stat.label}
                                                            </p>
                                                            <p className="mt-3 text-lg font-black text-zinc-950">{stat.value}</p>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-black/5 bg-white/55 px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">{content.integrations.title}</p>
                        <div className="flex flex-wrap gap-3">
                            {content.integrations.items.map((item) => (
                                <div key={item} className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-zinc-700">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="workflow" className="px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <Badge variant="outline" className="rounded-full border-black/10 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-700">
                                {content.workflow.eyebrow}
                            </Badge>
                            <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl">
                                {content.workflow.title}
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-zinc-600">{content.workflow.description}</p>
                        </div>

                        <div className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="space-y-4">
                                {content.workflow.steps.map((step) => (
                                    <Card key={step.id} className="rounded-[28px] border-black/6 bg-white shadow-none">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white">
                                                    {step.id}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-zinc-950">{step.title}</h3>
                                                    <p className="mt-2 text-sm leading-7 text-zinc-600">{step.description}</p>
                                                    <p className="mt-4 text-sm font-semibold text-zinc-800">{step.detail}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="rounded-[32px] border border-black/8 bg-zinc-950 p-5 text-white shadow-[0_45px_120px_-70px_rgba(0,0,0,1)]">
                                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Operator board</p>
                                            <h3 className="mt-2 text-2xl font-black">{content.workflow.boardTitle}</h3>
                                        </div>
                                        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200">
                                            Live concept
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {content.workflow.boardItems.map((item, index) => (
                                            <div
                                                key={item.label}
                                                className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{item.label}</p>
                                                        <p className="mt-2 text-sm text-zinc-300">{item.status}</p>
                                                    </div>
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 grid grid-cols-3 gap-3">
                                        {["Capture", "Score", "Sequence"].map((item) => (
                                            <div key={item} className="rounded-2xl bg-white px-3 py-3 text-center text-sm font-black text-zinc-950">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="platform" className="border-y border-black/5 bg-white/60 px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <Badge variant="outline" className="rounded-full border-black/10 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-700">
                                {content.platform.eyebrow}
                            </Badge>
                            <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl">
                                {content.platform.title}
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-zinc-600">{content.platform.description}</p>
                        </div>

                        <div className="mt-14 grid gap-6 md:grid-cols-2">
                            {content.platform.modules.map((module, index) => {
                                const Icon = moduleIcons[index] ?? Sparkles;

                                return (
                                    <Card key={module.title} className="rounded-[30px] border-black/6 bg-[#fcfbf8] shadow-none">
                                        <CardContent className="p-7">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-6 text-2xl font-black text-zinc-950">{module.title}</h3>
                                            <p className="mt-3 text-base leading-7 text-zinc-600">{module.description}</p>
                                            <div className="mt-6 space-y-3">
                                                {module.bullets.map((bullet) => (
                                                    <div key={bullet} className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                        {bullet}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="bg-zinc-950 px-4 py-24 text-white sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <Badge className="rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                                {content.visibility.eyebrow}
                            </Badge>
                            <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{content.visibility.title}</h2>
                            <p className="mt-5 text-lg leading-8 text-zinc-300">{content.visibility.description}</p>
                        </div>

                        <div className="mt-14 grid gap-6 lg:grid-cols-3">
                            {content.visibility.cards.map((card, index) => {
                                const Icon = visibilityIcons[index] ?? Sparkles;

                                return (
                                    <Card key={card.title} className="rounded-[30px] border-white/10 bg-white/5 text-white shadow-none">
                                        <CardContent className="p-7">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-6 text-2xl font-black">{card.title}</h3>
                                            <p className="mt-3 text-base leading-7 text-zinc-300">{card.description}</p>
                                            <div className="mt-6 space-y-3">
                                                {card.lines.map((line) => (
                                                    <div key={line} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-semibold text-zinc-200">
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <Badge variant="outline" className="rounded-full border-black/10 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-700">
                                {content.pricing.eyebrow}
                            </Badge>
                            <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl">
                                {content.pricing.title}
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-zinc-600">{content.pricing.description}</p>
                        </div>

                        <div className="mt-14 grid gap-6 lg:grid-cols-3">
                            {content.pricing.plans.map((plan) => (
                                <Card
                                    key={plan.name}
                                    className={cn(
                                        "rounded-[30px] border-black/6 bg-white shadow-none",
                                        plan.featured && "border-violet-500/20 ring-1 ring-violet-500/15"
                                    )}
                                >
                                    <CardContent className="flex h-full flex-col p-7">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-zinc-950">{plan.name}</h3>
                                                <p className="mt-3 text-sm leading-7 text-zinc-600">{plan.description}</p>
                                            </div>
                                            {plan.featured ? (
                                                <div className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
                                                    Best fit
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="mt-8 flex items-end gap-2">
                                            <div className="text-5xl font-black tracking-[-0.05em] text-zinc-950">{plan.price}</div>
                                            {plan.period ? <div className="pb-1 text-sm font-semibold text-zinc-500">{plan.period}</div> : null}
                                        </div>

                                        <div className="mt-8 space-y-3">
                                            {plan.features.map((feature) => (
                                                <div key={feature} className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-white">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8">
                                            <Link href={`/${locale}/contact`}>
                                                <Button
                                                    className={cn(
                                                        "h-12 w-full rounded-2xl px-5 text-base font-semibold",
                                                        plan.featured ? "bg-zinc-950 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                                    )}
                                                >
                                                    {plan.cta}
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="border-t border-black/5 bg-white/60 px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <Badge variant="outline" className="rounded-full border-black/10 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-700">
                                {content.faq.eyebrow}
                            </Badge>
                            <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl">
                                {content.faq.title}
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-zinc-600">{content.faq.description}</p>
                        </div>

                        <Card className="rounded-[30px] border-black/6 bg-white shadow-none">
                            <CardContent className="p-4 sm:p-6">
                                <Accordion type="single" collapsible className="w-full">
                                    {content.faq.items.map((item, index) => (
                                        <AccordionItem key={item.question} value={`item-${index}`} className="border-black/6 px-3">
                                            <AccordionTrigger className="py-5 text-left text-lg font-black text-zinc-950 hover:no-underline">
                                                {item.question}
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6 text-base leading-8 text-zinc-600">
                                                {item.answer}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl rounded-[36px] border border-black/8 bg-zinc-950 px-6 py-12 text-white shadow-[0_50px_120px_-70px_rgba(0,0,0,1)] sm:px-10 lg:px-14 lg:py-16">
                        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div className="max-w-3xl">
                                <Badge className="rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                                    Discussion-ready concept
                                </Badge>
                                <h2 className="mt-6 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{content.closing.title}</h2>
                                <p className="mt-5 text-lg leading-8 text-zinc-300">{content.closing.description}</p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                                <Link href={`/${locale}/contact`}>
                                    <Button className="min-w-[220px] rounded-full bg-white px-6 py-3 text-base font-semibold text-zinc-950 hover:bg-zinc-100">
                                        {content.closing.primaryCta}
                                        <ChevronRight className="ml-1" />
                                    </Button>
                                </Link>
                                <Link href={`/${locale}/contact`}>
                                    <Button variant="outline" className="min-w-[220px] rounded-full border-white/15 bg-transparent px-6 py-3 text-base font-semibold text-white hover:bg-white/5">
                                        {content.closing.secondaryCta}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-black/5 bg-white/50 px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <p className="max-w-2xl text-sm leading-7 text-zinc-600">{content.footer.note}</p>
                    <div className="flex flex-wrap gap-5">
                        {content.footer.links.map((link) => (
                            <Link
                                key={link.href}
                                href={`/${locale}${link.href}`}
                                className="text-sm font-semibold text-zinc-700 transition-colors hover:text-zinc-950"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
