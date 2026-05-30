"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Lock, type LucideIcon } from "lucide-react"
import { usePathname, Link } from "@/i18n/navigation"
import { cn } from "@/shared/utils"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
  SidebarGroupLabel,
} from "@/shared/components/ui/sidebar"

export type NavItemConfig = {
  title: string
  url?: string
  icon?: LucideIcon
  badge?: string
  id?: string
  locked?: boolean
  items?: {
    title: string
    url: string
    locked?: boolean
  }[]
}

export function NavMain({ items, groupLabel }: { items: NavItemConfig[], groupLabel?: string }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {groupLabel && (
        <SidebarGroupLabel>
          <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.2em]">{groupLabel}</span>
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, index) => (
            <CollapsibleMenuItem key={item.id || item.url || item.title || index} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function CollapsibleMenuItem({ item, pathname }: { item: NavItemConfig, pathname: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const isComingSoon = item.badge === "COMING SOON"
  const isLocked = item.locked === true

  const isActive = item.url ? pathname === item.url : item.items?.some(subItem => pathname.startsWith(subItem.url))

  useEffect(() => {
    if (isActive) setIsOpen(true)
  }, [isActive])

  const content = (
    <SidebarMenuButton
      tooltip={isLocked ? `Upgrade required` : item.title}
      isActive={isActive}
      className={cn(
        isComingSoon || isLocked ? "cursor-not-allowed opacity-50" : "",
        isActive && "bg-primary/10 font-bold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-2/3 before:btn-primary-gradient before:rounded-r-full"
      )}
    >
      {item.icon && <item.icon className={cn(isActive && "text-primary")} />}
      <span className={cn("font-semibold", isActive && "text-primary")}>{item.title}</span>
      {isLocked && (
        <Lock className="ml-auto h-3 w-3 text-muted-foreground shrink-0" />
      )}
      {item.badge && !item.items && !isLocked && (
        <SidebarMenuBadge className={isComingSoon ? "btn-primary-gradient text-white text-[8px] scale-90 font-bold px-1.5 py-0.5 border-none shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "btn-primary-gradient text-white text-[10px]"}>
          {item.badge}
        </SidebarMenuBadge>
      )}
      {item.items && !isLocked && (
        <ChevronDown className={`ml-auto transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isActive ? "text-primary" : ""}`} />
      )}
    </SidebarMenuButton>
  )

  return (
    <SidebarMenuItem id={item.id} className={isComingSoon || isLocked ? "pointer-events-none" : ""}>
      {item.items ? (
        <div onClick={() => !isLocked && setIsOpen(!isOpen)} className="cursor-pointer w-full">
          {content}
        </div>
      ) : (
        <Link href={item.url || "#"} className="w-full h-full block">
          {content}
        </Link>
      )}

      {item.items && isOpen && !isLocked && (
        <SidebarMenuSub className="mt-1">
          {item.items.map((subItem) => (
            <SidebarMenuSubItem key={subItem.title}>
              <SidebarMenuSubButton asChild isActive={pathname === subItem.url} className={subItem.locked ? "opacity-50 pointer-events-none" : ""}>
                <Link href={subItem.url}>
                  <span className="font-semibold">{subItem.title}</span>
                  {subItem.locked && <Lock className="ml-auto h-3 w-3 text-muted-foreground shrink-0" />}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}
