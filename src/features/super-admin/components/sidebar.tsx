"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Activity,
  Database,
  BarChart3,
  FileText,
  AlertCircle,
  MessageSquare,
  Palette,
  Languages,
  SearchCheck,
  Share2,
  Megaphone,
} from "lucide-react"

import { NavMain } from "@/shared/components/layout/nav-main"
import { NavUser } from "@/shared/components/layout/nav-user"
import { User } from "@supabase/supabase-js"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"

import { Link } from "@/i18n/navigation"
import Image from "next/image"

export function SuperAdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User | null;
}) {

  const navMain = [
    { title: "Executive Overview", url: "/super-admin", icon: LayoutDashboard },
    { title: "Tenant Management", url: "/super-admin/tenants", icon: Database },
    { title: "Support Tickets", url: "/super-admin/tickets", icon: MessageSquare },
    { title: "Analytics Hub", url: "/super-admin/analytics", icon: BarChart3 },
    { title: "System Health", url: "/super-admin/error-logs", icon: AlertCircle },
    { title: "Content / Blog", url: "/super-admin/blog", icon: FileText },
    { title: "SEO Optimization", url: "/super-admin/seo", icon: SearchCheck },
    { title: "Social Media", url: "/super-admin/social-media", icon: Share2 },
    { title: "Reklam Yönetimi", url: "/super-admin/ads", icon: Megaphone },
  ]

  const navOperations = [
    { title: "Platform Settings", url: "/super-admin/settings", icon: Settings },
    { title: "Design System", url: "/super-admin/theme", icon: Palette },
    { title: "Translations", url: "/super-admin/translations", icon: Languages },
    { title: "Security Policies", url: "/super-admin/security", icon: ShieldCheck },
    { title: "Global Activity", url: "/super-admin/activity", icon: Activity },
  ]

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/60 bg-sidebar/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent transition-all duration-300 p-0">
              <Link href="/super-admin" className="flex flex-col items-start gap-1 p-2">
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:opacity-0 transition-opacity">
                  <Image src="/jmplogo.png" alt="Jumpix" width={100} height={24} className="w-auto object-contain dark:invert" unoptimized />
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-black dark:text-zinc-100 ml-0.5">SUPER ADMIN</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar">
        <NavMain items={navMain} />
        <NavMain items={navOperations} groupLabel="Operations" />
      </SidebarContent>
      <SidebarFooter>
         <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
