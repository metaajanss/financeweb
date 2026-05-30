"use client";

import { usePathname } from "@/i18n/navigation";

import { Footer } from "@/features/marketing/components/footer";
import { Header } from "@/features/marketing/components/header";

const chromeHiddenPaths = new Set(["/login", "/forgot-password", "/reset-password"]);

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname ? chromeHiddenPaths.has(pathname) : false;

  return (
    <>
      {!hideChrome ? <Header /> : null}
      <main className="flex-1">{children}</main>
      {!hideChrome ? <Footer /> : null}
    </>
  );
}
