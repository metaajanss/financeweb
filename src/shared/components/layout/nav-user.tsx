"use client"

import {
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react"
import { User } from "@supabase/supabase-js"

import {
  Avatar,
  AvatarFallback,
} from "@/shared/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/components/ui/sidebar"
import { signOut } from "@/features/auth"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

export function NavUser({
  user,
}: {
  user: User | null;
}) {
  const { isMobile } = useSidebar()
  const router = useRouter();
  const pathname = usePathname();
  const isSuperAdmin = pathname.includes('/super-admin');

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initial = fullName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-primary/10">
                <AvatarFallback className="rounded-lg text-primary font-bold">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{fullName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email === 'admin@admin.com' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-popover/95 backdrop-blur-xl border-border/50 shadow-2xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg bg-primary/10">
                  <AvatarFallback className="rounded-lg font-bold text-primary">{initial}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isSuperAdmin && (
              <DropdownMenuGroup>
                <Link href="/admin/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <UserCircleIcon className="mr-2" size={16} />
                      Profilim
                    </DropdownMenuItem>
                </Link>
                <Link href="/admin/settings/billing">
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCardIcon className="mr-2" size={16} />
                      Abonelik & Fatura
                    </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
            )}
            {isSuperAdmin && (
               <DropdownMenuGroup>
                <Link href="/super-admin/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <ShieldCheck className="mr-2" size={16} />
                      Platform Ayarları
                    </DropdownMenuItem>
                </Link>
                <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <LayoutDashboard className="mr-2" size={16} />
                      Kullanıcı Paneline Geç
                    </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
              <LogOutIcon className="mr-2" size={16} />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
