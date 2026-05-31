"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useLocale } from "next-intl";

import { getBrandCopy, getFooterGroups } from "@/content/marketing";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/shared/components/ui/brand-logo";

export function Footer() {
  const locale = useLocale();
  const brand = getBrandCopy(locale);
  const groups = getFooterGroups(locale);

  return (
    <footer className="border-t border-black/5 bg-background py-10 dark:border-white/10">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1.55fr] lg:items-start">
          <div className="space-y-4">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <BrandLogo className="h-[48px] w-[172px] transition-all hover:scale-105" />
            </Link>

            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {brand.tagline}
            </p>

            <a
              href="mailto:hello@payofflab.app"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              hello@payofflab.app
            </a>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <a href="https://www.producthunt.com/products/payofflab-app?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-payofflab-app" target="_blank" rel="noopener noreferrer">
                <Image 
                  alt="Payoff Lab App - Instant Responses. Qualified Leads. Booked Meetings. | Product Hunt" 
                  width={250} 
                  height={54} 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1119987&theme=dark&t=1776982168600" 
                  className="h-[38px] w-auto transition-transform hover:scale-[1.02]"
                />
              </a>

              <a href="https://findly.tools" target="_blank" rel="noopener noreferrer">
                <Image 
                  src="/badges/findly-tools-badge-light.svg" 
                  alt="Featured on Findly.tools" 
                  width={175} 
                  height={55} 
                  className="h-[34px] w-auto transition-transform hover:scale-[1.02] dark:invert"
                  unoptimized
                />
              </a>

              <a href="https://startupfa.me/s/payofflab?utm_source=www.payofflab.app" target="_blank" rel="noopener noreferrer">
                <Image 
                  src="/badges/featured-badge-small.webp" 
                  alt="Payoff Lab App - Featured on Startup Fame" 
                  width={224} 
                  height={36} 
                  className="h-[26px] w-auto transition-transform hover:scale-[1.02]"
                  unoptimized
                />
              </a>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground">
                  {group.title}
                </h3>
                <div className="mt-3 space-y-2.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-black/5 pt-4 text-sm text-muted-foreground dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <p>{brand.rights}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/status" className="transition-colors hover:text-foreground">
              {brand.statusLabel}
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              {brand.supportLabel}
            </Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-foreground">
              {brand.termsLabel}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
