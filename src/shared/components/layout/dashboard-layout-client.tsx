'use client';

import { useEffect, useRef } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { AppSidebar } from '@/shared/components/layout/app-sidebar';
import type { SubscriptionPlan } from '@/config/plans';

import { JumpixTour } from '@/shared/components/tour/jumpix-tour';
import { ErrorBoundary } from '@/shared/components/error-boundary/error-boundary';
import { usePathname } from '@/i18n/navigation';
import { initializeErrorHandlers } from '@/core/errors/logger';

import { GlobalSearch } from '@/shared/components/layout/global-search';
import { NotificationPopover } from '@/features/notifications/components/notification-popover';
import { BrandLogo } from '@/shared/components/ui/brand-logo';
import { JumpixFloatingWidget } from '@/features/ai-jumpix/components/floating-widget';
import type { User } from '@supabase/supabase-js';
import type { AccountRow } from '@/core/tenancy/account-context';

export type DashboardAccount = AccountRow;

export function DashboardLayoutClient({
    children,
    user,
    account,
    plan,
    ticketUnreadCount
}: {
    children: React.ReactNode;
    user: User | null;
    account: DashboardAccount | null;
    plan: SubscriptionPlan;
    ticketUnreadCount: number;
}) {
    const pathname = usePathname();
    const handlersInitialized = useRef(false);

    useEffect(() => {
        // One-time Handlers & Theme
        // Pathname from @/i18n/navigation does NOT include the locale prefix
        if (!handlersInitialized.current && (pathname === '/admin' || pathname === '/')) { 
             initializeErrorHandlers();
             handlersInitialized.current = true;
        }

        // Always force light mode
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }, [pathname]);

    const isAiJumpixPage = pathname.includes('/admin/ai-jumpix');

    const isFullWidthPage = pathname.includes('/admin/pipeline') || 
                          pathname.includes('/admin/b2b-database') || 
                          pathname.includes('/admin/leads') || 
                          isAiJumpixPage ||
                          pathname.includes('/test-sequences');

    const noPadding = pathname.includes('/test-sequences') || pathname.includes('/admin/pipeline') || isAiJumpixPage;

    return (
        <ErrorBoundary>
            <div className="font-sans h-[100dvh] flex flex-col overflow-hidden">
                <SidebarProvider className="flex-1 min-h-0">
                    <AppSidebar user={user} account={account} plan={plan} ticketUnreadCount={ticketUnreadCount} />
                    <SidebarInset className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
                        {/* Topbar — hidden in fullscreen AI Jumpix */}
                        {!isAiJumpixPage && (
                        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background/50 backdrop-blur-md z-40">
                            <div className="flex items-center gap-4 flex-1">
                                <SidebarTrigger className="-ml-1" />
                                <div className="md:hidden">
                                    <BrandLogo className="h-6 w-auto" />
                                </div>
                                <div className="hidden md:block w-px h-4 bg-border" />
                                <GlobalSearch />
                            </div>

                            <div className="flex items-center gap-2">
                                <NotificationPopover />
                            </div>
                        </header>
                        )}

                        {/* Main Content */}
                        <main className={`flex flex-col min-h-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-foreground/[0.02] via-transparent to-transparent ${noPadding ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto custom-scrollbar p-4 pt-4 lg:p-8 lg:pt-8'}`}>
                            <div className={`${isFullWidthPage ? 'w-full h-full flex flex-col' : 'max-w-7xl mx-auto w-full'}`}>
                                {children}
                            </div>
                        </main>

                    </SidebarInset>
                </SidebarProvider>

                <JumpixFloatingWidget />
                <JumpixTour />
            </div>
        </ErrorBoundary>
    );
}
