import { redirect } from '@/i18n/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SuperAdminLayoutClient } from '@/features/super-admin/components/SuperAdminLayoutClient';

export default async function SuperAdminLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Safe to ignore in Server Components
                    }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Since middleware handles protecting the route and verifying if user is special admin,
    // we can safely pass the user to the client component.
    return (
        <SuperAdminLayoutClient user={user}>
            {children}
        </SuperAdminLayoutClient>
    );
}
