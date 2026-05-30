"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  Activity,
  Workflow,
  Settings,
  Info,
  LifeBuoy,
  Puzzle,
  MapPin,
} from "lucide-react"

import { NavMain, type NavItemConfig } from "@/shared/components/layout/nav-main"
import { NavUser } from "@/shared/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"

import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { hasAccess, FEATURE_MIN_PLAN, type SubscriptionPlan } from "@/config/plans"
import { useTranslations } from "next-intl"
import type { User } from "@supabase/supabase-js"
import type { AccountRow } from "@/core/tenancy/account-context"

function locked(plan: SubscriptionPlan, feature: keyof typeof FEATURE_MIN_PLAN): boolean {
  return !hasAccess(plan, FEATURE_MIN_PLAN[feature])
}

export type SidebarAccount = AccountRow;

export function AppSidebar({
  user,
  account,
  plan = 'free',
  unreadCount: _unreadCount = 0,
  convUnreadCount = 0,
  ticketUnreadCount = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User | null;
  account: SidebarAccount | null;
  plan?: SubscriptionPlan;
  unreadCount?: number;
  convUnreadCount?: number;
  ticketUnreadCount?: number;
}) {
  const t = useTranslations('Navigation');

  const aiCfg = account?.ai_config as { feature_toggles?: Record<string, boolean> } | null | undefined;
  const featureToggles = aiCfg?.feature_toggles || {};
  const _isB2BEnabled = (featureToggles.b2b_database_enabled ?? featureToggles.b2b_database) !== false;

  const navMain = [
    { title: t('dashboard'), url: "/admin", icon: LayoutDashboard, id: "tour-overview" },
    { title: t('pipeline'), url: "/admin/pipeline", icon: Workflow, locked: locked(plan, 'pipeline'), id: "tour-pipeline" },
    { title: t('conversations'), url: "/admin/conversations", icon: MessageSquare, badge: convUnreadCount > 0 ? convUnreadCount.toString() : undefined, id: "tour-conversations" },
    { title: t('leads'), url: "/admin/leads", icon: Users, id: "tour-leads" },
    { title: t('calendar'), url: "/admin/calendar", icon: Calendar, locked: locked(plan, 'calendar'), id: "tour-calendar" },
    { title: t('aiTraining'), url: "/admin/ai-training", icon: Sparkles, locked: locked(plan, 'ai-training') },
    { title: t('activityLog'), url: "/admin/activity-log", icon: Activity, locked: locked(plan, 'activity-log') },
    // isB2BEnabled && { title: t('b2bDatabase'), url: "/admin/b2b-database", icon: Building2, locked: locked(plan, 'b2b-database') },
    { title: t('mapsScraper'), url: "/admin/maps-scraper", icon: MapPin },
    { title: t('sequences'), url: "/admin/settings/sequences", icon: Sparkles, id: "tour-sequences" },
    {
      title: t('widgetManagement'),
      icon: Puzzle,
      items: [
        { title: t('whatsappWidget'), url: '/admin/leads/widget', locked: locked(plan, 'leads/widget') },
        { title: t('webChatbot'), url: '/admin/chatbot', locked: locked(plan, 'chatbot') },
      ]
    }
  ].filter(Boolean) as NavItemConfig[];

  const navOperations = [
    {
      title: t('generalSettings'),
      icon: Settings,
      items: [
        { title: t('businessProfile'), url: '/admin/settings' },
        { title: t('systemIntegrations'), url: '/admin/settings/integrations', locked: locked(plan, 'settings/integrations') },
        { title: t('privacyGdpr'), url: '/admin/settings/privacy' },
        { title: t('billingSubscription'), url: '/admin/settings/billing' },
      ]
    },
    { title: t('teamRouting'), url: "/admin/settings/team", icon: Users, locked: locked(plan, 'settings/team'), id: "tour-team" },
    { title: t('setupWizard'), url: "/onboarding", icon: Info, id: "tour-wizard" },
  ]

  const navSupport = [
    { title: t('myTickets'), url: "/admin/support/tickets", icon: MessageSquare, badge: ticketUnreadCount && ticketUnreadCount > 0 ? ticketUnreadCount.toString() : undefined },
    { title: t('helpCenter'), url: "/admin/help", icon: LifeBuoy },
  ]

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/60 bg-card/80 backdrop-blur-xl">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col items-center gap-1 p-2 w-full">
              <Link href="/admin" className="flex flex-col items-center gap-1.5 leading-none group-data-[collapsible=icon]:hidden transition-opacity">
                <Image src="/jmplogo.png" alt="Jumpix" width={110} height={32} className="w-auto object-contain dark:invert" priority unoptimized />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black dark:text-zinc-100 ml-0.5 leading-none">AI EXCELLENCE</span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar">
        <NavMain items={navMain} />
        <NavMain items={navOperations} groupLabel={t('operations')} />
        <NavMain items={navSupport} groupLabel={t('support')} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
