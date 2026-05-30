"use client";

import {
  Link2,
  ChevronRight,
} from "lucide-react";

import type { MarketingPage } from "@/content/marketing";
import { getIntegrationPageBySlug } from "@/content/marketing";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils";
import { motion } from "framer-motion";
import React, { useState, useMemo } from "react";
import { BrandIcons } from "@/shared/components/brand-icons";

type IntegrationsHubProps = {
  locale: string;
  page: MarketingPage;
};

type SupportedLocale = "en" | "tr";
type CategoryKey = "demand" | "messaging" | "crm" | "ops";

type ConnectorDefinition = {
  slug: string;
  category: CategoryKey;
  icon: React.ElementType;
  signal: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  detail: Record<SupportedLocale, string>;
};

type CategoryDefinition = {
  key: CategoryKey;
  label: Record<SupportedLocale, string>;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const connectors: ConnectorDefinition[] = [
  {
    slug: "google-ads",
    category: "demand",
    icon: BrandIcons.GoogleAds,
    signal: { en: "Paid demand intake", tr: "Ucretli talep girisi" },
    summary: {
      en: "Bring lead form demand into Jumpix the second a campaign converts.",
      tr: "Kampanya donustugu anda lead form talebini Jumpix icine alin.",
    },
    detail: {
      en: "Best for teams that need ad-to-follow-up speed without manual exports.",
      tr: "Manuel export olmadan reklamdan takibe hiz isteyen ekipler icin ideal.",
    },
  },
  {
    slug: "whatsapp",
    category: "messaging",
    icon: BrandIcons.WhatsApp,
    signal: { en: "Conversation intent", tr: "Konusma niyeti" },
    summary: {
      en: "Catch inbound urgency in chat and move it into an owned workflow.",
      tr: "Sohbetteki acil niyeti yakalayin ve sahipli bir workflow'a tasiyin.",
    },
    detail: {
      en: "Strong when inbound leads expect a human-speed response window.",
      tr: "Inbound leadlerin insan hizinda yanit bekledigi durumlarda gucludur.",
    },
  },
  {
    slug: "twilio",
    category: "messaging",
    icon: BrandIcons.Twilio,
    signal: { en: "WhatsApp & SMS API", tr: "WhatsApp ve SMS API" },
    summary: {
      en: "Scale automated messaging via Twilio's enterprise-grade API infrastructure.",
      tr: "Twilio'nun kurumsal API altyapisi uzerinden mesajlasmayi olceklendirin.",
    },
    detail: {
      en: "Ideal for high-volume automated notifications and outreach.",
      tr: "Yuksek hacimli otomatik bildirimler ve outreach icin ideal.",
    },
  },
  {
    slug: "instagram",
    category: "demand",
    icon: BrandIcons.Instagram,
    signal: { en: "Social DM intent", tr: "Sosyal DM niyeti" },
    summary: {
      en: "Capture leads directly from Instagram DMs and sync into your pipeline.",
      tr: "Instagram DM'lerinden gelen leadleri yakalayip pipeline'a senkronize edin.",
    },
    detail: {
      en: "Best for brands building community and interest on social platforms.",
      tr: "Sosyal platformlarda topluluk ve ilgi olusturan markalar icin en iyisidir.",
    },
  },
  {
    slug: "tiktok",
    category: "demand",
    icon: BrandIcons.TikTok,
    signal: { en: "Fast-track Lead Gen", tr: "Hizli Lead Gen" },
    summary: {
      en: "Pull TikTok Lead Gen Form data instantly into your workflow surfaces.",
      tr: "TikTok Lead Gen Form verilerini aninda workflow yuzeylerinize cekin.",
    },
    detail: {
      en: "Speed up response times for rapid-fire video campaign conversions.",
      tr: "Hizli video kampanya donusumleri icin yanit surelerini kisaltin.",
    },
  },
  {
    slug: "meta",
    category: "demand",
    icon: BrandIcons.Meta,
    signal: { en: "Ads Lead Sync", tr: "Ads Lead Senkronu" },
    summary: {
      en: "Auto-sync Facebook and Instagram Lead Ads directly into your pipeline.",
      tr: "Facebook ve Instagram Lead Ads verilerini dogrudan pipeline'a senkronlayin.",
    },
    detail: {
      en: "Eliminate manual CSV downloads and hit leads while they're hot.",
      tr: "Manuel CSV indirmelerini ortadan kaldirin ve leadler sicakken ulasin.",
    },
  },
  {
    slug: "gmail",
    category: "messaging",
    icon: BrandIcons.Gmail,
    signal: { en: "Structured outbound", tr: "Yapisal outbound" },
    summary: {
      en: "Run follow-up from the inbox your team already trusts and monitors.",
      tr: "Takibi ekibinizin zaten guvendigi ve takip ettigi inbox'tan yonetin.",
    },
    detail: {
      en: "Ideal when qualification is done and timing now matters most.",
      tr: "Kalifikasyon tamamlandiginda ve zamanlama kritik oldugunda ideal.",
    },
  },
  {
    slug: "google-calendar",
    category: "ops",
    icon: BrandIcons.GoogleCalendar,
    signal: { en: "Real-time orchestration", tr: "Anlik orkestrasyon" },
    summary: {
      en: "Automate appointment booking to hit leads while intent is at its peak.",
      tr: "Niyet en yuksekteyken leadlere ulasmak icin randevu alimini otomatiklestirin.",
    },
    detail: {
      en: "Essential for sales cycles that depend on immediate discovery calls.",
      tr: "Anlik kesif gorusmelerine dayali satis donguleri icin esastir.",
    },
  },
  {
    slug: "google-meet",
    category: "messaging",
    icon: BrandIcons.GoogleMeet,
    signal: { en: "Auto-meeting links", tr: "Otomatik toplanti linkleri" },
    summary: {
      en: "Create Google Meet rooms automatically for every booked appointment.",
      tr: "Planlanan her randevu icin otomatik Google Meet odalari olusturun.",
    },
    detail: {
      en: "Seamlessly transition from scheduling to video conversation.",
      tr: "Planlamadan video gorusmesine kesintisiz gecis saglayin.",
    },
  },
  {
    slug: "crm",
    category: "crm",
    icon: Link2,
    signal: { en: "Legacy CRM Sync", tr: "Legacy CRM Senkronu" },
    summary: {
      en: "Keep your existing system of record updated with qualified lead context.",
      tr: "Mevcut kayit sisteminizi kalifiye lead baglamiyla guncel tutun.",
    },
    detail: {
      en: "Basic bi-directional sync for generic CRM endpoints.",
      tr: "Genel CRM endpointleri icin temel cift yonlu senkronizasyon.",
    },
  },
  {
    slug: "hubspot",
    category: "crm",
    icon: BrandIcons.Hubspot,
    signal: { en: "Full Hubspot Sync", tr: "Tam Hubspot Senkronu" },
    summary: {
      en: "Deep integration with HubSpot deals, contacts, and company records.",
      tr: "HubSpot deal, kontakt ve sirket kayitlari ile derin entegrasyon.",
    },
    detail: {
      en: "Ideal for teams that live in HubSpot but need faster front-end capture.",
      tr: "HubSpot kullanan ancak daha hizli front-end capture isteyen ekipler icin.",
    },
  },
  {
    slug: "salesforce",
    category: "crm",
    icon: BrandIcons.Salesforce,
    signal: { en: "Salesforce CRM", tr: "Salesforce CRM" },
    summary: {
      en: "Enterprise-grade data flow into your Salesforce Cloud environments.",
      tr: "Salesforce Cloud ortamlariniza kurumsal duzeyde veri akisi saglayin.",
    },
    detail: {
      en: "Engineered for complex sales organizations with large datasets.",
      tr: "Buyuk veri setlerine sahip karmasik satis organizasyonlari icin tasarlandi.",
    },
  },
  {
    slug: "pipedrive",
    category: "crm",
    icon: BrandIcons.Pipedrive,
    signal: { en: "Pipedrive Native", tr: "Pipedrive Yerlesik" },
    summary: {
      en: "Move leads into Pipedrive stages as they hit intent milestones.",
      tr: "Leadleri niyet kilometre taslarina ulastikca Pipedrive asamasina tasiyin.",
    },
    detail: {
      en: "Simple, effective deal-based sync for small-to-mid sales teams.",
      tr: "Kobi satis ekipleri icin basit, etkili deal tabanli senkronizasyon.",
    },
  },
  {
    slug: "zoho",
    category: "crm",
    icon: BrandIcons.Zoho,
    signal: { en: "Zoho Ecosystem", tr: "Zoho Ekosistemi" },
    summary: {
      en: "Synchronize prospects directly with your Zoho CRM and SalesIQ.",
      tr: "Potansiyel musterileri Zoho CRM ve SalesIQ ile dogrudan senkronize edin.",
    },
    detail: {
      en: "Perfect for teams leveraging the full Zoho productivity suite.",
      tr: "Tum Zoho verimlilik paketini kullanan ekipler icin mukemmeldir.",
    },
  },
  {
    slug: "close",
    category: "crm",
    icon: BrandIcons.Close,
    signal: { en: "Close High Velocity", tr: "Close Yuksek Hiz" },
    summary: {
      en: "Power your Close CRM with real-time lead signals from Jumpix.",
      tr: "Close CRM'inizi Jumpix'ten gelen anlik lead sinyalleriyle besleyin.",
    },
    detail: {
      en: "Optimized for high-volume, inside sales calling and messaging.",
      tr: "Yuksek hacimli saha satisi ve mesajlasma icin optimize edildi.",
    },
  },
  {
    slug: "copper",
    category: "crm",
    icon: BrandIcons.Copper,
    signal: { en: "Copper G-Workspace", tr: "Copper G-Workspace" },
    summary: {
      en: "Connect lead data to the only CRM built natively for Google Workspace.",
      tr: "Lead verisini Google Workspace icin ozel uretilmis tek CRM'e baglayin.",
    },
    detail: {
      en: "For teams that want a CRM that feels exactly like their inbox.",
      tr: "Inbox gibi hissettiren bir CRM isteyen ekipler icin.",
    },
  },
  {
    slug: "slack",
    category: "ops",
    icon: BrandIcons.Slack,
    signal: { en: "Operation Alerts", tr: "Operasyon Bildirimleri" },
    summary: {
      en: "Push new lead alerts and activity milestones into team Slack channels.",
      tr: "Yeni lead bildirimlerini ve aktivite donum noktalarini Slack'e tasiyin.",
    },
    detail: {
      en: "Maintain instant internal visibility across the entire revenue team.",
      tr: "Tum gelir ekibi genelinde anlik dahili gorunurluk saglayin.",
    },
  },
  {
    slug: "discord",
    category: "ops",
    icon: BrandIcons.Discord,
    signal: { en: "Webhook Handoff", tr: "Webhook Handoff" },
    summary: {
      en: "Real-time activity alerts for modern community and dev-led teams.",
      tr: "Modern topluluk ve yazilim odakli ekipler icin anlik aktivite uyarilari.",
    },
    detail: {
      en: "Fast, lightweight notification system for rapid response teams.",
      tr: "Hizli yanıt ekipleri icin hizli ve hafif bildirim sistemi.",
    },
  },
  {
    slug: "google-sheets",
    category: "ops",
    icon: BrandIcons.GoogleSheets,
    signal: { en: "Flexible sync", tr: "Esnek senkron" },
    summary: {
      en: "Maintain a flat file of all leads for custom reporting and rev ops.",
      tr: "Ozel raporlama ve rev ops icin tum leadlerin temiz bir listesini tutun.",
    },
    detail: {
      en: "Ideal for growth teams needing fast data manipulation outside of CRM.",
      tr: "CRM disinda hizli veri manipülasyonu isteyen büyüme ekipleri icin ideal.",
    },
  },
];

const categories: CategoryDefinition[] = [
  {
    key: "demand",
    label: { en: "Inbound & Demand", tr: "Inbound ve Talep" },
    title: { en: "Lead Capture & Demand", tr: "Lead Capture ve Talep" },
    description: {
      en: "Capture high-intent leads from your favorite advertising and social platforms.",
      tr: "Favori reklam ve sosyal platformlarinizdan yuksek niyetli lead yakalayin.",
    },
  },
  {
    key: "messaging",
    label: { en: "Outreach & Messaging", tr: "Outreach ve Mesajlasma" },
    title: { en: "Communication Channels", tr: "Iletisim Kanallari" },
    description: {
      en: "Engage with prospects across multiple channels with integrated messaging tools.",
      tr: "Entegre mesajlasma araclariyla potansiyel musterilerle cok kanalli iletisim kurun.",
    },
  },
  {
    key: "crm",
    label: { en: "CRM & Pipeline", tr: "CRM ve Pipeline" },
    title: { en: "CRM Ecosystem", tr: "CRM Ekosistemi" },
    description: {
      en: "Seamlessly synchronize your leads and deals with industry-leading CRM platforms.",
      tr: "Lead ve deal'larinizi sektor lideri CRM platformlariyla sorunsuz senkronize edin.",
    },
  },
  {
    key: "ops",
    label: { en: "Data & Team Ops", tr: "Veri ve Ekip Ops" },
    title: { en: "Productivity & Reporting", tr: "Verimlilik ve Raporlama" },
    description: {
      en: "Keep your team aligned and your data clean with operational and reporting tools.",
      tr: "Operasyonel ve raporlama araclariyla ekibinizi uyumlu, verilerinizi temiz tutun.",
    },
  },
];

function resolveLocale(locale: string): SupportedLocale {
  return locale === "tr" ? "tr" : "en";
}

export function IntegrationsHub({ locale, page }: IntegrationsHubProps) {
  const currentLocale = resolveLocale(locale);
  const isTurkish = currentLocale === "tr";
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");

  const connectorCards = useMemo(() =>
    connectors
      .map((connector) => {
        const integrationPage = getIntegrationPageBySlug(connector.slug, currentLocale);
        if (!integrationPage) return null;
        return { ...connector, page: integrationPage };
      })
      .filter(
        (connector): connector is ConnectorDefinition & { page: NonNullable<ReturnType<typeof getIntegrationPageBySlug>> } =>
          connector !== null
      ),
    [currentLocale]
  );

  const filteredConnectors = useMemo(() =>
    activeCategory === "all" ? connectorCards : connectorCards.filter(c => c.category === activeCategory),
    [connectorCards, activeCategory]
  );

  return (
    <div className="bg-[#f9fafb] dark:bg-zinc-950 min-h-screen">
      {/* Hero Section - Hunter.io Style */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4 block"
          >
            {isTurkish ? "ENTEGRASYONLAR" : "INTEGRATIONS"}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-8"
          >
            {page.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto"
          >
            {page.description}
          </motion.p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
             {/* Logo Cloud Placeholder Effect */}
             <div className="flex -space-x-4">
                {connectorCards.slice(0, 5).map((c, i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-[#f9fafb] dark:border-zinc-950 bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm z-[10-i]">
                    <c.icon className="w-6 h-6" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-y border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 py-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-8 min-w-max">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "text-sm font-bold uppercase tracking-wider transition-colors",
                activeCategory === "all" ? "text-primary border-b-2 border-primary pb-1" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {isTurkish ? "HEPSİ" : "ALL"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "text-sm font-bold uppercase tracking-wider transition-colors",
                  activeCategory === cat.key ? "text-primary border-b-2 border-primary pb-1" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {cat.label[currentLocale]}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-4 py-20">
        {activeCategory === "all" ? (
          <div className="space-y-24">
            {categories.map((category) => {
              const categoryConnectors = connectorCards.filter(c => c.category === category.key);
              if (categoryConnectors.length === 0) return null;

              return (
                <section key={category.key} id={category.key} className="scroll-mt-32">
                  <div className="max-w-2xl mb-12">
                    <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-4">
                      {category.title[currentLocale]}
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {category.description[currentLocale]}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryConnectors.map((connector) => (
                      <IntegrationCard key={connector.slug} connector={connector} isTurkish={isTurkish} currentLocale={currentLocale} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConnectors.map((connector) => (
              <IntegrationCard key={connector.slug} connector={connector} isTurkish={isTurkish} currentLocale={currentLocale} />
            ))}
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-40 text-center rounded-3xl bg-zinc-900 dark:bg-white p-16 text-white dark:text-black shadow-2xl">
          <h2 className="text-4xl font-black tracking-tight mb-6">
            {isTurkish ? "Özel bir entegrasyon mu lazım?" : "Need a custom integration?"}
          </h2>
          <p className="text-zinc-400 dark:text-zinc-500 text-lg mb-10 max-w-2xl mx-auto">
            {isTurkish 
              ? "Ekibimiz özel iş akışlarınıza uygun entegrasyonlar geliştirebilir. Hemen bizimle iletişime geçin."
              : "Our team can develop custom integrations tailored to your specific workflows. Get in touch with us today."}
          </p>
          <Button asChild size="lg" className="rounded-full px-10 h-14 font-bold btn-primary-gradient">
            <Link href="/contact">
              {isTurkish ? "Ekiple Görüşün" : "Talk to our Ops Team"}
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

function IntegrationCard({ 
  connector, 
  isTurkish, 
  currentLocale 
}: { 
  connector: ConnectorDefinition & { page: MarketingPage }, 
  isTurkish: boolean,
  currentLocale: SupportedLocale
}) {
  return (
    <Link
      href={`/integrations/${connector.slug}`}
      className="group relative flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl transition-all hover:border-primary dark:hover:border-primary hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="flex size-14 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-primary/5 transition-colors border border-zinc-100 dark:border-zinc-700 group-hover:border-primary/20">
          <connector.icon className="size-7" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary mb-1">
            {connector.signal[currentLocale]}
          </p>
          <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
            {connector.page.title}
          </h3>
        </div>
      </div>
      
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-8">
        {connector.summary[currentLocale]}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 group-hover:border-primary/10 transition-colors">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
          {isTurkish ? "DETAYLARI GÖR" : "VIEW DETAILS"}
        </span>
        <ChevronRight className="size-4 text-zinc-300 dark:text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
      
      {/* Subtle Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
