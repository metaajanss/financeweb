"use client";

import { m } from "framer-motion";
import {
  Kanban,
  CheckCircle2,
  Mail,
  MessageSquare,
  Sparkles,
  BarChart3,
  MousePointer2,
  Database,
  Users,
  Bot,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

// ----------------------------------------------------------------------
// Hero Mockups
// ----------------------------------------------------------------------

export function HeroMockup({ path: _path }: { path: string }) {
  const t = useTranslations("Landing.Mockups.hero");
  // A generic, highly dynamic Kanban/Pipeline board that looks like Jumpix's main app
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[#0a0a0a] text-zinc-300 shadow-2xl">
      {/* Background Gradients */}
      <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-indigo-600/30 blur-[100px]" />
      <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-blue-600/30 blur-[100px]" />

      <div className="relative flex h-[85%] w-[90%] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-md">
        {/* Mock App Header */}
        <div className="flex h-10 w-full items-center border-b border-white/10 bg-white/5 px-4 backdrop-blur-md">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-[10px] font-medium text-white/60">
            <Database className="h-3 w-3" />
            {t('workspace')}
          </div>
        </div>

        {/* Mock App Body */}
        <div className="flex flex-1 p-4 gap-4">
          {/* Sidebar */}
          <div className="flex w-12 flex-col items-center gap-4 py-2 opacity-50">
            <Kanban className="h-5 w-5 text-indigo-400" />
            <Users className="h-5 w-5" />
            <BarChart3 className="h-5 w-5" />
            <MessageSquare className="h-5 w-5" />
          </div>

          {/* Kanban Board */}
          <div className="flex flex-1 gap-3 overflow-hidden">
            {/* Column 1 */}
            <div className="flex w-1/3 flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t('newLeads')}
              </div>
              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Acme Corp</span>
                  <span className="text-[9px] text-white/40">2m ago</span>
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] text-indigo-300">Google Ads</span>
                </div>
                {/* Floating Cursor interaction */}
                <m.div
                  initial={{ x: 100, y: 100, opacity: 0 }}
                  animate={{ x: 10, y: 10, opacity: 1 }}
                  transition={{ delay: 1, duration: 1.5, type: "spring" }}
                  className="absolute z-10 text-white"
                >
                  <MousePointer2 className="h-4 w-4 fill-white" />
                </m.div>
              </m.div>

              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Globex</span>
                  <span className="text-[9px] text-white/40">15m ago</span>
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-300">{t('organic')}</span>
                </div>
              </m.div>
            </div>

            {/* Column 2 */}
            <div className="flex w-1/3 flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {t('qualifying')}
              </div>
              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Initech</span>
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: "80%" }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="h-full bg-indigo-500"
                  />
                </div>
                <span className="text-[9px] text-indigo-300 mt-0.5">{t('scoringSignal')}</span>
              </m.div>
            </div>

            {/* Column 3 */}
            <div className="flex w-1/3 flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t('qualified')}
              </div>
              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-400">Wayne Ent.</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-white">
                    <Mail className="h-2.5 w-2.5" /> Sent
                  </span>
                </div>
              </m.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Section Mockups (Alternating Narratives)
// ----------------------------------------------------------------------

export function SectionMockup({
  path,
  index,
}: {
  path: string;
  index: number;
}) {
  // Select a mockup type based on the page path and index to provide variety
  const isAnalytics = path.includes("analytics");
  const isSequences = path.includes("sequences");
  const isEnrichment = path.includes("enrichment");
  const _isSales = path.includes("sales");

  if (isAnalytics || (index === 2 && !isSequences)) {
    return <AnalyticsMockup />;
  }
  
  if (isSequences || index === 1) {
    return <WorkflowMockup />;
  }

  if (isEnrichment || index === 0) {
    return <EnrichmentMockup />;
  }

  return <DataCenterMockup />;
}

// Miniature Mockups for specific contexts

function EnrichmentMockup() {
  const t = useTranslations("Landing.Mockups.enrichment");
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-zinc-950 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      
      <div className="relative flex w-full max-w-sm flex-col gap-4">
        {/* Raw Data */}
        <m.div
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
        >
          <div className="text-xs text-white/40 mb-2 font-mono">{t('incoming')}</div>
          <div className="text-sm text-zinc-300">janedoe@acmecorp.com</div>
        </m.div>

        {/* Enrichment Process */}
        <div className="flex flex-col items-center">
          <m.div
            initial={{ height: 0 }}
            whileInView={{ height: 24 }}
            viewport={{ once: true }}
            className="w-px bg-gradient-to-b from-indigo-500/50 to-purple-500/50"
          />
          <m.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]"
          >
            <Sparkles className="h-4 w-4" />
          </m.div>
          <m.div
            initial={{ height: 0 }}
            whileInView={{ height: 24 }}
            viewport={{ once: true }}
            className="w-px bg-gradient-to-b from-purple-500/50 to-indigo-500/50"
          />
        </div>

        {/* Enriched Data */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 backdrop-blur-sm shadow-2xl relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-16 w-16 bg-indigo-500/20 blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold">
              JC
            </div>
            <div>
              <div className="text-sm font-bold text-white">Jane Doe</div>
              <div className="text-xs text-indigo-300">{t('vpSales')}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-white/50">
            <div className="rounded bg-black/40 px-2 py-1">{t('companySize')}</div>
            <div className="rounded bg-black/40 px-2 py-1">{t('industry')}</div>
          </div>
        </m.div>
      </div>
    </div>
  );
}

function WorkflowMockup() {
  const t = useTranslations("Landing.Mockups.workflow");
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-zinc-950 p-6">
      <div className="absolute -left-20 top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="absolute -right-20 bottom-20 h-40 w-40 rounded-full bg-purple-500/10 blur-[80px]" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-0">
        <m.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 backdrop-blur-sm"
        >
          <UserPlusIcon className="h-4 w-4 text-emerald-400" /> {t('leadCreated')}
        </m.div>

        <BranchLine />

        <m.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex w-full items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-blue-400" />
            <div className="text-sm text-blue-100">{t('aiQual')}</div>
          </div>
          <CheckCircle2 className="h-4 w-4 text-blue-400" />
        </m.div>

        <BranchLine />

        {/* Split branch */}
        <div className="flex w-full px-8 relative">
          <div className="absolute left-1/2 top-0 h-4 w-[50%] -translate-x-1/2 rounded-t-lg border-x border-t border-white/20" />
        </div>

        <div className="w-full flex justify-between px-4 mt-4">
          <m.div
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-3 text-zinc-300">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-zinc-500">Auto Email</span>
          </m.div>

          <m.div
            initial={{ x: 20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-emerald-500">WhatsApp</span>
          </m.div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  const t = useTranslations("Landing.Mockups.analytics");
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-zinc-950 p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative flex w-full flex-col gap-4">
        {/* Main Chart Card */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">{t('funnel')}</h4>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="h-2 w-2 rounded-full bg-purple-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="w-full relative py-1">
              <div className="h-8 w-full rounded-md bg-indigo-500/20" />
              <m.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1 }} className="absolute inset-y-0 left-0 h-10 rounded-md bg-indigo-500/80 flex items-center px-3 text-xs text-white font-bold">1,240 {t('formFills')}</m.div>
            </div>
            <div className="w-[75%] relative py-1">
              <div className="h-8 w-full rounded-md bg-purple-500/20" />
              <m.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1, delay: 0.2 }} className="absolute inset-y-0 left-0 h-10 rounded-md bg-purple-500/80 flex items-center px-3 text-xs text-white font-bold">890 {t('qualified')}</m.div>
            </div>
            <div className="w-[45%] relative py-1">
              <div className="h-8 w-full rounded-md bg-pink-500/20" />
              <m.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1, delay: 0.4 }} className="absolute inset-y-0 left-0 h-10 rounded-md bg-pink-500/80 flex items-center px-3 text-xs text-white font-bold">340 {t('meetings')}</m.div>
            </div>
          </div>
        </m.div>

        {/* Small stats */}
        <div className="grid grid-cols-2 gap-4">
          <m.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-md"
          >
            <div>
              <p className="text-[10px] text-zinc-400">{t('velocity')}</p>
              <p className="text-lg font-bold text-white">4.2 <span className="text-[10px] text-zinc-500 font-normal">{t('days')}</span></p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </m.div>

          <m.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-md"
          >
            <div>
              <p className="text-[10px] text-zinc-400">{t('winRate')}</p>
              <p className="text-lg font-bold text-white">28%</p>
            </div>
            <Zap className="h-5 w-5 text-yellow-400" />
          </m.div>
        </div>
      </div>
    </div>
  );
}

function DataCenterMockup() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-zinc-950 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.2),transparent_70%)]" />

      <div className="relative flex w-full max-w-sm flex-col items-center justify-center">
        {/* Central Hub */}
        <m.div
          animate={{ boxShadow: ["0 0 20px rgba(99,102,241,0.2)", "0 0 40px rgba(99,102,241,0.5)", "0 0 20px rgba(99,102,241,0.2)"] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-xl"
        >
          <Database className="h-10 w-10 text-indigo-400" />
        </m.div>

        {/* Orbiting Elements (simulated via absolute positioning & animation) */}
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
          className="absolute h-48 w-48 rounded-full border border-dashed border-white/10 flex items-center justify-center"
        >
          <div className="absolute -top-4 rounded-full border border-white/10 bg-black p-2 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </div>
          <div className="absolute -bottom-4 rounded-full border border-white/10 bg-black p-2 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div className="absolute -left-4 rounded-full border border-white/10 bg-black p-2 text-white">
            <Mail className="h-4 w-4" />
          </div>
        </m.div>
      </div>
    </div>
  );
}

// Utils
function BranchLine() {
  return (
    <m.div
      initial={{ height: 0 }}
      whileInView={{ height: 20 }}
      viewport={{ once: true }}
      className="w-px bg-white/20"
    />
  );
}

function UserPlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
