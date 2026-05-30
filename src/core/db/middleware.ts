import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAvatarToken } from '@/core/auth/avatar-token'

export async function updateSession(request: NextRequest, response: NextResponse) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
            if (process.env.NODE_ENV !== 'production') console.error('[middleware] Supabase environment variables missing or invalid');
            return response;
        }



        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                            cookiesToSet.forEach(({ name, value, options }) =>
                                response.cookies.set(name, value, options)
                            )
                        } catch (e) {
                            // Cookie setting might fail in some contexts, but shouldn't crash
                            if (process.env.NODE_ENV !== 'production') console.error('[updateSession] Cookie set error:', e);
                        }
                    },
                },
            }
        )

        // Protected routes logic
        const path = request.nextUrl.pathname;

        // Check if path is protected (admin or super-admin)
        const isAdminPath = path.match(/^\/([a-z]{2}\/)?admin(\/.*)?$/);
        const isSuperAdminPath = path.match(/^\/([a-z]{2}\/)?super-admin(\/.*)?$/) || path.match(/^\/([a-z]{2}\/)?admin\/superadmin(\/.*)?$/);
        const isSuperAdminLoginPage = path.match(/^\/([a-z]{2}\/)?super-admin\/login(\/.*)?$/);
        const isOnboardingPath = path.match(/^\/([a-z]{2}\/)?onboarding(\/.*)?$/);
        const isAvatarRendererPath = path.match(/^\/([a-z]{2}\/)?avatar-renderer(\/.*)?$/);

        // Avatar renderer is normally auth-protected so a real user can preview
        // their avatar. The Recall.ai bot however cannot carry a Supabase
        // cookie, so we accept a signed `?token=` query that proves the bot
        // belongs to a meeting in our system.
        let avatarTokenValid = false;
        if (isAvatarRendererPath) {
            const token = request.nextUrl.searchParams.get('token');
            if (token && await verifyAvatarToken(token)) {
                avatarTokenValid = true;
            }
        }

        const isProtected = (isAdminPath || isSuperAdminPath || isOnboardingPath || (isAvatarRendererPath && !avatarTokenValid)) && !isSuperAdminLoginPage;

        // OPTIMIZATION: Check for session cookies before making a remote call
        const hasSessionCookies = request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-'));

        // If it's a public route and no session cookies are present, skip Supabase Auth check to save network requests
        if (!isProtected && !hasSessionCookies) {
            return response;
        }

        // This will refresh session if expired - required for Server Components
        // OPTIMIZED: Using getSession() in middleware is faster than getUser() 
        // as it avoids a remote API call to the Auth server on every request.
        // Server Components will still use the secure getUser() call.
        const { data, error: authError } = await supabase.auth.getSession()
        const user = data?.session?.user;

        if (authError) {
            if (process.env.NODE_ENV !== 'production') console.warn('[middleware] Auth error fetching user:', authError.message);
        }



        if (isProtected) {
            if (!user) {
                const url = request.nextUrl.clone()
                const localeMatch = path.match(/^\/([a-z]{2})\//);
                const locale = localeMatch ? localeMatch[1] : 'en';
                
                // If it's a super-admin path, redirect to super-admin login
                if (isSuperAdminPath) {
                    url.pathname = `/${locale}/super-admin/login`;
                } else {
                    url.pathname = `/${locale}/login`;
                }
                
                return NextResponse.redirect(url)
            }

            if (isSuperAdminPath) {
                const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
                const isSpecialAdmin = user.email === adminEmail;
                
                if (isSpecialAdmin) {
                    // Authorized super admin, proceed
                } else {
                    // Unauthorized access attempt, redirect to regular admin dashboard
                    const url = request.nextUrl.clone()
                    const localeMatch = path.match(/^\/([a-z]{2})\//);
                    const locale = localeMatch ? localeMatch[1] : 'en';
                    url.pathname = `/${locale}/admin`;
                    return NextResponse.redirect(url)
                }
            }
        }

        return response
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('[updateSession] Fatal error in middleware:', error);
        return response;
    }
}
