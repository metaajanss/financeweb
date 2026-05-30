'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from "@/shared/components/ui/sonner";

export function AuthProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
    const router = useRouter();

    useEffect(() => {
        // Handle Supabase invite redirects that land on the homepage with a fragment
        const handleAuthFragment = () => {
            const hash = window.location.hash;
            if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
                // We preserve the hash because Supabase client needs it to extract the token
                router.push(`/${locale}/reset-password?invite=true${hash}`);
            }
        };

        handleAuthFragment();
        
        // Also listen for hash changes
        window.addEventListener('hashchange', handleAuthFragment);
        return () => window.removeEventListener('hashchange', handleAuthFragment);
    }, [router, locale]);

    return (
        <>
            {children}
            <Toaster position="top-right" richColors closeButton />
        </>
    );
}
