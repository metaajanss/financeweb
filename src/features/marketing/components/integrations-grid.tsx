"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils";
import { getMarketingNav } from "@/content/marketing";

interface IntegrationsGridProps {
  locale: string;
}

export function IntegrationsGrid({ locale }: IntegrationsGridProps) {
  const navGroups = getMarketingNav(locale);
  // Entegrasyonlar grubu genellikle 3. sırada (index 2)
  const integrationGroup = navGroups.find(
    (group) => group.label === (locale === "tr" ? "Entegrasyonlar" : "Integrations")
  );

  if (!integrationGroup) return null;

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {integrationGroup.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-start gap-6 rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-sm transition-all duration-500",
                "hover:-translate-y-2 hover:border-indigo-500/20 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)]",
                "dark:border-white/10 dark:bg-zinc-950/70 dark:hover:border-indigo-400/30"
              )}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <div className="flex w-full items-start justify-between gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500 dark:group-hover:text-white">
                  <item.icon className="size-6.5" />
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-zinc-50 opacity-0 transition-all duration-500 group-hover:opacity-100 dark:bg-white/5">
                  <ArrowRight className="size-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-tight text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {item.label}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground group-hover:text-muted-foreground/80">
                  {item.description}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                <span>{locale === "tr" ? "Entegrasyonu Keşfet" : "Explore Integration"}</span>
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
