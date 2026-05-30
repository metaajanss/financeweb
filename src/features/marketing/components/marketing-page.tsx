import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { MarketingPage } from "@/content/marketing";
import { HeroMockup } from "./marketing-mockups";
import dynamic from "next/dynamic";

const SectionMockup = dynamic(
  () => import("./marketing-mockups").then((mod) => mod.SectionMockup),
  {
    loading: () => (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-zinc-950 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative h-24 w-24 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-xl animate-pulse" />
      </div>
    ),
  }
);

type MarketingPageTemplateProps = {
  page: MarketingPage;
  locale: string;
  children?: React.ReactNode;
};

export function MarketingPageTemplate({
  page,
  locale,
  children,
}: MarketingPageTemplateProps) {
  const isTurkish = locale === "tr";

  return (
    <div className="bg-background">
      {/* 1. Hero Section - More Impactful */}
      <section className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_50%)] pt-24 pb-20 md:pt-32 md:pb-32">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:text-left">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-400">
                {page.eyebrow}
              </div>
              <h1 className="mt-8 text-balance text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-7xl lg:leading-[1.1]">
                {page.title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
                {page.description}
              </p>

              <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                {page.primaryCta ? (
                  <Button asChild size="lg" className="h-14 rounded-full bg-indigo-600 px-8 text-base font-bold text-white hover:bg-indigo-500 shadow-xl shadow-indigo-500/20">
                    <Link href={page.primaryCta.href}>{page.primaryCta.label}</Link>
                  </Button>
                ) : null}
                {page.secondaryCta ? (
                  <Button asChild variant="outline" size="lg" className="h-14 rounded-full border-black/10 px-8 text-base font-bold transition-all hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
                    <Link href={page.secondaryCta.href}>{page.secondaryCta.label}</Link>
                  </Button>
                ) : null}
              </div>
              
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{isTurkish ? "Kredi kartı gerekmez" : "No credit card required"}</span>
              </div>
            </div>

            {/* Hero Visual Placeholder - Represents Product UI */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] w-full rounded-3xl border border-black/5 bg-zinc-50 p-4 shadow-2xl dark:border-white/10 dark:bg-zinc-900/50">
                 <HeroMockup path={page.path} />
                 {/* Decorative elements */}
                 <div className="absolute -right-4 -top-4 size-24 blur-3xl bg-indigo-500/20" />
                 <div className="absolute -left-4 -bottom-4 size-24 blur-3xl bg-purple-500/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Outcomes - Horizontal Value Cards */}
      {page.outcomes.length > 0 ? (
        <section className="relative z-10 -mt-10 pb-20">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid gap-6 md:grid-cols-3">
              {page.outcomes.map((item, idx) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-950/70"
                >
                  <div className="absolute top-0 right-0 p-4 font-mono text-4xl font-black text-black/5 dark:text-white/5">
                    0{idx + 1}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. Alternating Narrative Sections */}
      {page.sections.length > 0 ? (
        <section className="space-y-32 py-24">
          {page.sections.map((section, idx) => (
            <div key={section.title} className="container mx-auto max-w-7xl px-4">
              <div className={cn(
                "flex flex-col gap-12 lg:items-center lg:gap-20",
                idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              )}>
                <div className="flex-1">
                  <div className="inline-flex items-center rounded-xl bg-indigo-500/5 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                    {isTurkish ? "Özellik" : "Feature"} 0{idx + 1}
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    {section.title}
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                  <ul className="mt-10 space-y-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-4 text-[15px] text-foreground/80">
                        <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1">
                  <div className="aspect-video relative w-full rounded-[2.5rem] border border-black/5 bg-zinc-50 p-3 shadow-xl dark:border-white/10 dark:bg-zinc-900/40 overflow-hidden">
                    {section.image ? (
                      <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
                        <Image
                          src={section.image}
                          alt={section.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={idx === 0}
                        />
                      </div>
                    ) : (
                      <SectionMockup path={page.path} index={idx} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {children}

      {/* 4. Related & Social Proof */}
      {page.related.length > 0 ? (
        <section className="border-t border-black/5 bg-[#fafafa] py-32 dark:bg-zinc-950/30">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
                {isTurkish ? "Sıradaki Adım" : "Next Step"}
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
                {isTurkish
                  ? "Workflow'u buradan devam ettirin"
                  : "Continue the workflow"}
              </h2>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {page.related.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-background p-8 shadow-sm transition-all hover:-translate-y-2 hover:border-indigo-500/20 hover:shadow-2xl dark:border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight text-foreground">
                      {item.title}
                    </h3>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-50 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-zinc-900">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 5. FAQ */}
      {page.faqs && page.faqs.length > 0 ? (
        <section className="bg-background py-32">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {isTurkish ? "Sık Sorulan Sorular" : "Common Questions"}
              </h2>
            </div>
            <div className="mt-16 space-y-4">
              {page.faqs.map((item) => (
                <div
                  key={item.question}
                  className="rounded-3xl border border-black/5 bg-zinc-50/50 p-8 dark:border-white/10 dark:bg-zinc-900/30"
                >
                  <h3 className="text-lg font-black tracking-tight text-foreground">
                    {item.question}
                  </h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. High-Contrast Bottom CTA */}
      <section className="container mx-auto max-w-7xl px-4 pb-32">
        <div className="relative overflow-hidden rounded-[3rem] border border-black/5 bg-zinc-950 px-8 py-20 text-center text-white shadow-2xl dark:border-white/10 dark:bg-white dark:text-zinc-950">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-purple-600/20 blur-3xl" />
          
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-4xl font-black tracking-tight sm:text-6xl sm:leading-[1.1]">
              {isTurkish
                ? "Jumpix ile tanışın"
                : "Meet Jumpix"}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400 dark:text-zinc-600">
              {isTurkish
                ? "Talebi toplayın, daha hızlı kalifiye edin, doğru sonraki adımı otomatikleştirin."
                : "Capture demand, qualify it faster, automate the right next step."}
            </p>
            {page.primaryCta ? (
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-full bg-white px-8 text-base font-bold text-zinc-950 hover:bg-zinc-100 shadow-xl shadow-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                >
                  <Link href={page.primaryCta.href}>{page.primaryCta.label}</Link>
                </Button>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isTurkish ? "Anında kurulum" : "Instant setup"}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
