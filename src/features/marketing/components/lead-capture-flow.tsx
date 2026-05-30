import { ArrowRight, Clock3, DatabaseZap, Layers2, MessageSquareReply, ShieldCheck } from "lucide-react";

const content = {
  en: {
    eyebrow: "Lead Capture Flow",
    title: "A clearer path from inbound signal to qualified pipeline",
    description:
      "Design the page around the operational journey your team actually runs: capture, clean, qualify, and activate follow-up.",
    steps: [
      {
        title: "Capture",
        detail: "Collect ad forms, webhooks, widget requests, and inbound messages in one shared intake queue.",
        icon: Layers2,
      },
      {
        title: "Normalize",
        detail: "Standardize contact fields and keep campaign context attached before any sales handoff.",
        icon: ShieldCheck,
      },
      {
        title: "Qualify",
        detail: "Route clean records into enrichment and scoring so reps focus on high-intent opportunities first.",
        icon: DatabaseZap,
      },
      {
        title: "Activate",
        detail: "Trigger sequences, sync CRM/Sheets, and alert the team instantly to prevent lead decay.",
        icon: MessageSquareReply,
      },
    ],
    checklistTitle: "What happens in the first 60 seconds?",
    checklist: [
      "Lead source and campaign metadata are attached to the record.",
      "Ownership and next action become visible for sales and ops.",
      "Follow-up automations can start without waiting for manual cleanup.",
    ],
    metricTitle: "Built for execution visibility",
    metrics: [
      { label: "Shared intake", value: "Google Ads + Meta + WhatsApp + webhook" },
      { label: "Downstream sync", value: "CRM + Sheets + Slack + Discord" },
      { label: "Workflow goal", value: "Faster first response with less triage" },
    ],
  },
  tr: {
    eyebrow: "Lead Capture Akisi",
    title: "Inbound sinyalden kalifiye pipeline'a daha net bir yol",
    description:
      "Sayfayi ekibinizin gercekte izledigi operasyon akisina gore tasarlayin: yakala, temizle, kalifiye et ve takibi baslat.",
    steps: [
      {
        title: "Yakala",
        detail: "Reklam formlari, webhook'lar, widget talepleri ve inbound mesajlari tek bir paylasilan intake kuyrugunda toplayin.",
        icon: Layers2,
      },
      {
        title: "Standartlastir",
        detail: "Satis handoff'undan once iletisim alanlarini duzenleyin ve kampanya baglamini kayda bagli tutun.",
        icon: ShieldCheck,
      },
      {
        title: "Kalifiye et",
        detail: "Temiz kayitlari enrichment ve scoring akisina alarak temsilcilerin yuksek niyetli firsatlara odaklanmasini saglayin.",
        icon: DatabaseZap,
      },
      {
        title: "Aktif et",
        detail: "Sequence'leri tetikleyin, CRM/Sheets senkronu yapin ve lead'in sogumasini onlemek icin ekibi aninda bilgilendirin.",
        icon: MessageSquareReply,
      },
    ],
    checklistTitle: "Ilk 60 saniyede neler olur?",
    checklist: [
      "Lead kaynagi ve kampanya metadatasi kayda otomatik baglanir.",
      "Satis ve operasyon icin sahiplik ve sonraki adim net gorunur.",
      "Manuel temizlik beklemeden takip otomasyonlari baslatilabilir.",
    ],
    metricTitle: "Icra gorunurlugu icin tasarlandi",
    metrics: [
      { label: "Paylasilan intake", value: "Google Ads + Meta + WhatsApp + webhook" },
      { label: "Downstream senkron", value: "CRM + Sheets + Slack + Discord" },
      { label: "Akis hedefi", value: "Daha az triyajla daha hizli ilk geri donus" },
    ],
  },
} as const;

type LeadCaptureFlowProps = {
  locale: string;
};

export function LeadCaptureFlow({ locale }: LeadCaptureFlowProps) {
  const copy = locale === "tr" ? content.tr : content.en;

  return (
    <section className="border-b border-black/5 bg-gradient-to-b from-background to-[#f7f4ff] py-20 dark:from-background dark:to-zinc-950/40">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{copy.eyebrow}</p>
          <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.description}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {copy.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="rounded-3xl border border-black/5 bg-background p-6 shadow-sm dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.detail}</p>
                {index < copy.steps.length - 1 ? (
                  <ArrowRight className="mt-5 h-4 w-4 text-primary/70" />
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-3xl border border-black/5 bg-background p-8 shadow-sm dark:border-white/10">
            <div className="flex items-center gap-2 text-primary">
              <Clock3 className="h-5 w-5" />
              <h3 className="text-lg font-black tracking-tight">{copy.checklistTitle}</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {copy.checklist.map((item) => (
                <li key={item} className="rounded-2xl border border-black/5 bg-primary/[0.03] px-4 py-3 text-sm leading-7 text-foreground/90 dark:border-white/10 dark:bg-white/[0.03]">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-black/5 bg-background p-8 shadow-sm dark:border-white/10">
            <h3 className="text-lg font-black tracking-tight text-foreground">{copy.metricTitle}</h3>
            <div className="mt-5 space-y-3">
              {copy.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
