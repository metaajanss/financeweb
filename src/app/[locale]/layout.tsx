import { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import { AuthProvider } from "@/shared/components/providers/auth-provider";
import { ToastProvider } from "@/shared/components/ui/toast";
import { FramerLazyProvider } from "@/shared/components/providers/framer-lazy-provider";
import NextTopLoader from 'nextjs-toploader';
import { ACTIVE_LOCALES } from '@/config/locales';



const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: 'swap',
});

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SEO' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t('defaultTitle'),
      template: t('titleTemplate'),
    },
    description: t('defaultDescription'),
    openGraph: {
      title: t('defaultTitle'),
      description: t('defaultDescription'),
      url: `${baseUrl}/${locale}`,
      siteName: 'PayoffLab',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export function generateStaticParams() {
  return ACTIVE_LOCALES.map((locale) => ({ locale }));
}


export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!ACTIVE_LOCALES.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <head>
        {/* Preconnect for GTM — fonts are bundled by next/font, no preconnect needed */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        {/* Detect timezone and set cookie in head to avoid hydration flicker/overhead */}
        <script
          id="timezone-detection"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  var cookies = document.cookie.split(';').reduce(function(acc, cookie) {
                    var parts = cookie.trim().split('=');
                    acc[parts[0]] = parts[1];
                    return acc;
                  }, {});
                  if (cookies['x-timezone'] !== timezone) {
                    var expires = new Date();
                    expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000));
                    document.cookie = 'x-timezone=' + timezone + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
                  }
                } catch (e) {
                  console.error('Timezone detection failed:', e);
                }
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "PayoffLab",
               "url": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
               "logo": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/jmplogo.png`,
               "sameAs": [
                 "https://twitter.com/jumpix",
                 "https://linkedin.com/company/jumpix"
               ]
             })
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-white text-black`}>
        <NextTopLoader showSpinner={false} color="#ef4444" height={3} />
        <AuthProvider locale={locale}>
          <FramerLazyProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </FramerLazyProvider>
        </AuthProvider>


        {/* Third-Party Scripts (Moved out of head for performance & build health) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1M8CQLLNQ0"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1M8CQLLNQ0', { send_page_view: false });
          `}
        </Script>

        {/* PayoffLab Support Chatbot - uses local file in dev, production URL in prod */}
        <Script 
          src={process.env.NODE_ENV === 'development' ? '/scripts/chatbot.js' : 'https://jumpix.app/scripts/chatbot.js?v=1.0.1'}
          data-id="8c7a52d6-a708-4dfe-bcf7-94f04762ea25" 
          strategy="lazyOnload"
        />


      </body>
    </html>
  );
}
