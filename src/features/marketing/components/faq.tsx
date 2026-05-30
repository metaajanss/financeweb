"use client";

import Link from "next/link";
import { useMessages } from "next-intl";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/shared/components/ui/accordion";

type FAQQuestion = {
    q: string;
    a: string;
};

type FAQContent = {
    title: string;
    subtitle: string;
    description: string;
    supportLabel: string;
    supportHref: string;
    questions: FAQQuestion[];
};

function withLocale(locale: string, href: string) {
    return href.startsWith("/") ? `/${locale}${href}` : href;
}

export function FAQ({ locale }: { locale: string }) {
    const messages = useMessages();
    const faq = (messages as { Landing: { FAQ: FAQContent } }).Landing.FAQ;

    return (
        <section id="faq" className="bg-zinc-50 py-24 dark:bg-zinc-950/30 lg:py-32 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]">
            <div className="container mx-auto max-w-5xl px-4">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                        {faq.subtitle}
                    </p>
                    <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                        {faq.title}
                    </h2>
                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        {faq.description}
                    </p>
                    <Link
                        href={withLocale(locale, faq.supportHref)}
                        className="mt-6 inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                        {faq.supportLabel}
                    </Link>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Accordion 
                        type="single" 
                        collapsible 
                        defaultValue="faq-0" 
                        className="flex flex-col gap-4"
                    >
                        {faq.questions.slice(0, 3).map((item, index) => (
                            <AccordionItem
                                key={item.q}
                                value={`faq-${index}`}
                                className="rounded-2xl border border-black/10 bg-white px-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-primary/20 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-zinc-950/80"
                            >
                                <AccordionTrigger className="gap-6 px-4 py-6 text-left text-lg font-bold tracking-tight text-zinc-900 hover:no-underline dark:text-white md:text-xl">
                                    <span className="flex-1 leading-tight">{item.q}</span>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-6 text-base leading-relaxed text-muted-foreground">
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <Accordion 
                        type="single" 
                        collapsible 
                        className="flex flex-col gap-4"
                    >
                        {faq.questions.slice(3, 6).map((item, index) => (
                            <AccordionItem
                                key={item.q}
                                value={`faq-${index + 3}`}
                                className="rounded-2xl border border-black/10 bg-white px-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-primary/20 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-zinc-950/80"
                            >
                                <AccordionTrigger className="gap-6 px-4 py-6 text-left text-lg font-bold tracking-tight text-zinc-900 hover:no-underline dark:text-white md:text-xl">
                                    <span className="flex-1 leading-tight">{item.q}</span>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-6 text-base leading-relaxed text-muted-foreground">
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
