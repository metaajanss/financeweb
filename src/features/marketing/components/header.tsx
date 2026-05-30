"use client";

import * as React from "react";
import { Menu, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";

import {
  getHeaderActions,
  getMarketingNav,
} from "@/content/marketing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { BrandLogo } from "@/shared/components/ui/brand-logo";

export function Header() {
  const locale = useLocale();
  const navGroups = React.useMemo(() => getMarketingNav(locale), [locale]);
  const actions = React.useMemo(() => getHeaderActions(locale), [locale]);
  const { pricingLabel, integrationsLabel, learnMore, mobileDescription, integrationsDesc, pricingDesc } = actions;

  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 transition-all duration-300 md:p-6">
      <div 
        className={cn(
          "flex h-14 w-full max-w-7xl items-center justify-between px-4 transition-all duration-500 ease-in-out md:h-16 md:px-8",
          isScrolled 
            ? "rounded-full border border-black/5 bg-background/70 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-black/70" 
            : "rounded-2xl border border-transparent bg-transparent"
        )}
      >
        <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]">
          <BrandLogo className="h-[36px] w-[130px] transition-all hover:scale-[1.03] sm:h-[40px] sm:w-[145px]" />
        </Link>

        <div className="hidden flex-1 justify-center lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {navGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger className={cn(
                    "bg-transparent text-sm font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 data-[state=open]:text-indigo-600",
                    isScrolled ? "text-foreground" : "text-foreground/90"
                  )}>
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[720px] grid-cols-[1fr_1.4fr] gap-4 p-4 animation-in fade-in zoom-in-95 duration-200">
                      <div className="flex flex-col rounded-3xl border border-black/5 bg-zinc-950 p-7 text-white shadow-2xl dark:border-white/10 dark:bg-white dark:text-zinc-950">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                          {group.label}
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-white dark:text-black">
                          {group.featured.title}
                        </div>
                        <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                          {group.featured.description}
                        </p>
                        <div className="mt-auto pt-6">
                            <Link
                                href={group.featured.href}
                                prefetch={false}
                                aria-label={`${learnMore} ${group.featured.title}`}
                                className="inline-flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300 dark:text-indigo-600 dark:hover:text-indigo-500"
                            >
                                {learnMore}
                                <ChevronDown className="ml-1 h-4 w-4 -rotate-90" aria-hidden="true" />
                            </Link>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {group.items.map((item) => (
                          <NavigationMenuLink key={item.href} asChild>
                            <Link
                              href={item.href}
                              prefetch={false}
                              className="group flex flex-col rounded-2xl border border-transparent p-4 transition-all hover:border-black/5 hover:bg-zinc-50 dark:hover:border-white/5 dark:hover:bg-white/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500 dark:group-hover:text-white">
                                  <item.icon className="h-4.5 w-4.5" />
                                </div>
                                <div className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {item.label}
                                </div>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/integrations"
                    prefetch={false}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-sm font-medium transition-colors hover:bg-black/5 hover:text-indigo-600 dark:hover:bg-white/5 dark:hover:text-indigo-400",
                      isScrolled ? "text-foreground" : "text-foreground/90"
                    )}
                  >
                    {integrationsLabel}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/pricing"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-sm font-medium transition-colors hover:bg-black/5 hover:text-indigo-600 dark:hover:bg-white/5 dark:hover:text-indigo-400",
                      isScrolled ? "text-foreground" : "text-foreground/90"
                    )}
                  >
                    {pricingLabel}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={actions.loginHref}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground"
          >
            {actions.loginLabel}
          </Link>
          <Button asChild className="h-10 rounded-full px-6 text-sm font-bold shadow-xl shadow-indigo-500/20">
            <Link href={actions.signupHref}>{actions.signupLabel}</Link>
          </Button>
        </div>

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm border-l border-black/5 p-0 backdrop-blur-2xl dark:border-white/10 dark:bg-black/90">
              <div className="flex h-full flex-col p-6">
                <SheetHeader className="pb-8 text-left">
                  <SheetTitle className="text-2xl font-bold tracking-tight">Jumpix</SheetTitle>
                  <SheetDescription className="text-[15px] leading-relaxed">
                    {mobileDescription}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-8 overflow-y-auto pr-2">
                  {navGroups.map((group) => (
                    <section key={group.label} className="space-y-4">
                      <div>
                        <h3 className="flex items-center text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-500">
                          {group.label}
                        </h3>
                      </div>

                      <div className="grid gap-2">
                        {group.items.map((item) => (
                          <SheetClose key={item.href} asChild>
                            <Link
                              href={item.href}
                              className="flex items-start gap-3.5 rounded-2xl border border-black/5 bg-white/50 p-4 transition-all active:scale-[0.98] dark:border-white/5 dark:bg-zinc-900/50"
                            >
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                <item.icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-[15px] font-bold tracking-tight text-foreground">
                                  {item.label}
                                </div>
                                <p className="mt-1 text-xs leading-normal text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                            </Link>
                          </SheetClose>
                        ))}
                      </div>
                    </section>
                  ))}
                  <section className="space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-500">
                      {integrationsLabel}
                    </h3>
                    <SheetClose asChild>
                      <Link
                        href="/integrations"
                        prefetch={false}
                        className="flex items-start rounded-2xl border border-black/5 bg-white/50 p-4 transition-all active:scale-[0.98] dark:border-white/5 dark:bg-zinc-900/50"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                             <ChevronDown className="h-5 w-5 -rotate-90" />
                        </div>
                        <div className="ml-3.5">
                            <div className="text-[15px] font-bold tracking-tight text-foreground">{integrationsLabel}</div>
                            <p className="mt-1 text-xs leading-normal text-muted-foreground">
                                {integrationsDesc}
                            </p>
                        </div>
                      </Link>
                    </SheetClose>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-500">
                      {pricingLabel}
                    </h3>
                    <SheetClose asChild>
                      <Link
                        href="/pricing"
                        className="flex items-start rounded-2xl border border-black/5 bg-white/50 p-4 transition-all active:scale-[0.98] dark:border-white/5 dark:bg-zinc-900/50"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                             <ChevronDown className="h-5 w-5 -rotate-90" />
                        </div>
                        <div className="ml-3.5">
                            <div className="text-[15px] font-bold tracking-tight text-foreground">{pricingLabel}</div>
                            <p className="mt-1 text-xs leading-normal text-muted-foreground">
                                {pricingDesc}
                            </p>
                        </div>
                      </Link>
                    </SheetClose>
                  </section>
                </div>

                <div className="mt-auto space-y-3 pt-8 border-t border-black/5 dark:border-white/10">
                  <SheetClose asChild>
                    <Link
                      href={actions.loginHref}
                      className="flex h-12 w-full items-center justify-center rounded-full border border-black/10 px-5 text-sm font-bold text-foreground transition-all hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      {actions.loginLabel}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild className="h-12 w-full rounded-full font-bold shadow-xl shadow-indigo-500/20">
                      <Link href={actions.signupHref}>{actions.signupLabel}</Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
