"use client"

import * as React from "react"
import { FileText } from "lucide-react"

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

export function SuperAdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User | null;
}) {

  const navMain = [
    { title: "Content / Blog", url: "/super-admin/blog", icon: FileText },
  ]

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/60 bg-sidebar/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent transition-all duration-300 p-0">
              <Link href="/super-admin" className="flex flex-col items-start gap-1 p-2">
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:opacity-0 transition-opacity">
                  <span className="text-base font-black tracking-tight text-black dark:text-white">Payoff Lab</span>
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-black dark:text-zinc-100 ml-0.5">SUPER ADMIN</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
         <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
