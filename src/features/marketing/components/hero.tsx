import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import {
    ArrowRight,
    BarChart3,
    Search,
    Sparkles,
    Workflow,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils";
import { HeroMockup } from "./marketing-mockups";

type TrustItem = {
    value: string;
    label: string;
};

type SpotlightContent = {
    signalTitle: string;
    signalText: string;
    commandLabel: string;
    liveLabel: string;
    scoreLabel: string;
    scoreText: string;
    ribbonLabel: string;
    readyTitle: string;
    readyText: string;
    dashboardAlt: string;
};

type HeroContent = {
    badgeText: string;
    badgeLink?: string;
    title: string;
    description: string;
    messageLabel: string;
    messageText: string;
    primaryCta: string;
    chips: string[];
    trustItems: TrustItem[];
    spotlight: SpotlightContent;
};



export async function Hero({ locale: _locale }: { locale: string }) {
    const messages = await getMessages();
    const hero = (messages as { Landing: { Hero: HeroContent } }).Landing.Hero;

    const spotlight = hero.spotlight;

    const proofIcons = [Search, BarChart3, Workflow] as const;

    return (
        <section className="relative overflow-hidden border-b border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f5f3ff_45%,#ede9fe_100%)] pt-28 pb-12 md:pt-36 md:pb-16 dark:border-white/10 dark:bg-[linear-gradient(180deg,#05050c_0%,#0f0718_48%,#1a0b2e_100%)]">
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_28%),radial-gradient(circle_at_75%_18%,rgba(168,85,247,0.22),transparent_25%),radial-gradient(circle_at_85%_72%,rgba(99,102,241,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_20%),radial-gradient(circle_at_72%_18%,rgba(168,85,247,0.24),transparent_22%),radial-gradient(circle_at_82%_68%,rgba(99,102,241,0.12),transparent_24%)] pointer-events-none"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[url('/noise.svg')] opacity-[0.035] mix-blend-multiply dark:opacity-[0.08]"
            />
            <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-background to-transparent"
            />

            <div className="container mx-auto max-w-7xl px-4">
                <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(470px,560px)] lg:items-start">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/[0.85] px-4 py-2 text-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f5f3ff] via-white to-[#d8b4fe] text-zinc-900 shadow-sm dark:text-black">
                                <Sparkles className="h-4 w-4" />
                            </span>
                            <span className="font-semibold text-foreground">{hero.badgeText}</span>
                            {hero.badgeLink ? (
                                <span className="hidden rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline dark:bg-white/10">
                                    {hero.badgeLink}
                                </span>
                            ) : null}
                        </div>

                        <h1 className="mt-8 max-w-4xl text-balance text-5xl font-black tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
                            {hero.title}
                        </h1>

                        <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
                            {hero.description}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {hero.chips.map((chip) => (
                                <div
                                    key={chip}
                                    className="rounded-full border border-black/[0.08] bg-white/[0.78] px-4 py-2 text-sm font-semibold text-zinc-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200"
                                >
                                    {chip}
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex flex-col items-start gap-5 lg:flex-row lg:items-center">
                             <Link href="/login" className="w-full sm:w-auto">
                                <Button className="h-14 w-full rounded-2xl px-8 text-base font-semibold text-white shadow-[0_0_24px_rgba(142,68,173,0.4)] hover:shadow-[0_0_32px_rgba(142,68,173,0.6)] sm:w-auto">
                                    {hero.primaryCta}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>

                            <div className="flex w-full items-center gap-3 rounded-[1.6rem] border border-black/[0.08] bg-white/80 px-4 py-4 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 lg:max-w-sm">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#312e81] text-white shadow-lg dark:from-white dark:to-zinc-200 dark:text-black">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                                        {spotlight.signalTitle}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {spotlight.signalText}
                                    </p>
                                </div>
                            </div>
                        </div>


                        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
                            {hero.trustItems.map((item, index) => {
                                const Icon = proofIcons[index % proofIcons.length];
                                const accents = [
                                    { 
                                        color: "indigo",
                                        iconBg: "bg-indigo-50 dark:bg-indigo-500/10", 
                                        iconText: "text-indigo-600 dark:text-indigo-400",
                                        glow: "group-hover:shadow-indigo-500/20"
                                    },
                                    { 
                                        color: "purple",
                                        iconBg: "bg-purple-50 dark:bg-purple-500/10", 
                                        iconText: "text-purple-600 dark:text-purple-400",
                                        glow: "group-hover:shadow-purple-500/20"
                                    },
                                    { 
                                        color: "amber",
                                        iconBg: "bg-amber-50 dark:bg-amber-500/10", 
                                        iconText: "text-amber-600 dark:text-amber-400",
                                        glow: "group-hover:shadow-amber-500/20"
                                    }
                                ];
                                const accent = accents[index % accents.length];

                                return (
                                    <div
                                        key={item.value}
                                        className={cn(
                                            "group relative flex flex-col rounded-[2rem] border border-black/5 bg-white/40 p-6 transition-all duration-500 hover:-translate-y-1.5 hover:bg-white/80 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
                                            "shadow-[0_4px_20px_rgb(0,0,0,0.01)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)]",
                                            accent.glow
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className={cn(
                                                "flex size-12 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110",
                                                accent.iconBg,
                                                accent.iconText
                                            )}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="text-xl font-black italic tracking-tighter text-black/5 dark:text-white/5 select-none">
                                                0{index + 1}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-5">
                                            <h3 className="text-lg font-bold tracking-tight text-foreground">
                                                {item.value}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground/90">
                                                {item.label}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex items-center gap-1.5">
                                            <div className={cn("h-1 w-6 rounded-full transition-all duration-500 group-hover:w-12", accent.iconBg.replace('bg-', 'bg-').split(' ')[0])} />
                                            <div className="h-1 w-1 rounded-full bg-black/5 dark:bg-white/10" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative lg:pl-4">
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-8 -top-10 h-32 bg-[radial-gradient(circle,rgba(255,255,255,0.86),transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(192,132,252,0.32),transparent_72%)] pointer-events-none"
                        />

                        <div className="relative rounded-[2.5rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(247,240,255,0.82))] p-2 shadow-[0_45px_120px_-60px_rgba(64,32,98,0.58)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(20,15,31,0.98),rgba(8,8,14,0.96))] overflow-hidden">
                            <div className="relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-[#030712] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-white/10 aspect-[1.1] w-full">
                                <HeroMockup path="/" />
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                            <a href="https://www.producthunt.com/products/payofflab-app?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-payofflab-app" target="_blank" rel="noopener noreferrer">
                                <Image 
                                    alt="Payoff Lab App - Instant Responses. Qualified Leads. Booked Meetings. | Product Hunt" 
                                    width={250} 
                                    height={54} 
                                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1119987&theme=dark&t=1776982168600" 
                                    className="h-[42px] w-auto transition-transform hover:scale-[1.02]"
                                />
                            </a>

                            <a href="https://findly.tools" target="_blank" rel="noopener noreferrer">
                                <Image 
                                    src="/badges/findly-tools-badge-light.svg" 
                                    alt="Featured on Findly.tools" 
                                    width={175} 
                                    height={55} 
                                    className="h-[38px] w-auto transition-transform hover:scale-[1.02] dark:invert"
                                    unoptimized
                                />
                            </a>

                            <a href="https://startupfa.me/s/payofflab?utm_source=www.payofflab.app" target="_blank" rel="noopener noreferrer">
                                <Image
                                    src="/badges/featured-badge-small.webp"
                                    alt="Payoff Lab App - Featured on Startup Fame"
                                    width={175}
                                    height={28}
                                    className="h-[28px] w-auto transition-transform hover:scale-[1.02]"
                                    priority
                                    unoptimized
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
