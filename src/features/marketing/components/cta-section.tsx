import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

function withLocale(locale: string, href: string) {
    return href.startsWith("/") ? `/${locale}${href}` : href;
}

export async function CTASection({ locale }: { locale: string }) {
    const t = await getTranslations("Landing.CTA");

    return (
        <section className="bg-white dark:bg-zinc-950 py-24 text-zinc-900 dark:text-white lg:py-32">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f0f1a] px-8 py-12 shadow-[0_30px_100px_-55px_rgba(168,85,247,0.3)] md:px-12 md:py-16">
                    {/* Premium Ambient Backgrounds with Pulsing 'Glow' */}
                    <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[120%] bg-purple-600/25 blur-[140px] rounded-full pointer-events-none animate-pulse" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[120%] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.1),transparent_70%)] pointer-events-none" />
                    
                    <div className="relative z-10 mx-auto max-w-3xl text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <SparklesIcon className="h-3.5 w-3.5 text-purple-400" />
                            {t("badge")}
                        </div>

                        <h2 className="mt-8 text-balance text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                            {t("title_start")} <span className="text-white/65">{t("title_end")}</span>
                        </h2>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                            {t("description1")} <span className="text-white">{t("description2")}</span>
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Link href={withLocale(locale, "/login")}>
                                <Button className="h-14 w-full rounded-2xl px-7 text-base font-semibold text-white shadow-[0_0_24px_rgba(142,68,173,0.4)] hover:shadow-[0_0_32px_rgba(142,68,173,0.6)] sm:w-auto">
                                    {t("getStarted")}
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href={withLocale(locale, "/contact")}>
                                <Button
                                    variant="outline"
                                    className="h-14 w-full rounded-2xl border-white/14 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/8 hover:text-white sm:w-auto"
                                >
                                    {t("requestDemo")}
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-8 text-sm text-zinc-500">
                            {t("trustBadge")}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
