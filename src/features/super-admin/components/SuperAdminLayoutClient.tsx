'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { SuperAdminSidebar } from '@/features/super-admin/components/sidebar';
import { usePathname } from '@/i18n/navigation';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';

export function SuperAdminLayoutClient({ 
    children,
    user
}: { 
    children: React.ReactNode,
    user: any
}) {
    const pathname = usePathname();

    useEffect(() => {
        // Always force light mode
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }, []);

    const isLoginPage = pathname === '/super-admin/login' || pathname?.endsWith('/super-admin/login');

    return (
        <div className="font-sans">

            {isLoginPage ? (
                <div className="bg-background min-h-screen">
                    {children}
                </div>
            ) : (
                <SidebarProvider>
                    <SuperAdminSidebar user={user} />
                    <SidebarInset className="overflow-hidden min-w-0">
                        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background/80 backdrop-blur-md z-40 sticky top-0 border-border">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="-ml-1" />
                                <div className="h-4 w-px bg-border mx-2" />
                                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                    SUPER ADMIN
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button className="p-2 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground relative">
                                    <Bell size={20} />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
                                </button>
                            </div>
                        </header>
                        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background">
                            <div className="max-w-7xl mx-auto w-full">
                                {children}
                            </div>
                        </main>
                    </SidebarInset>
                </SidebarProvider>
            )}
        </div>
    );
}
