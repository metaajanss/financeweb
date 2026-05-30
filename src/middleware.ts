import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/core/db/middleware';
import { routing } from '@/i18n/navigation';

const intlMiddleware = createMiddleware(routing);

// Parse once at module load — not on every request
const ALLOWED_ADMIN_IPS = new Set(
    (process.env.ALLOWED_ADMIN_IPS || '')
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean)
);

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // --- CRITICAL SECURITY: IP Whitelisting for Super Admin (Must be at the very top) ---
    const isSuperAdminAny = path.includes('/super-admin') || path.includes('/admin/superadmin');

    if (isSuperAdminAny) {
        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp = forwarded ? forwarded.split(',')[0].trim() : (realIp || 'unknown');

        if (ALLOWED_ADMIN_IPS.size > 0 && !ALLOWED_ADMIN_IPS.has(clientIp)) {
            console.warn(`[Security Alert] Super Admin access DENIED for ${clientIp} to ${path}`);
            return new NextResponse(
                `Access Denied: Your IP (${clientIp}) is not whitelisted for Super Admin access.`,
                { status: 403 }
            );
        }
    }
    // --- END: IP Whitelisting ---

    // Next.js server actions POST to the page URL. With localePrefix:'as-needed',
    // the default locale (en) has no prefix so server actions hit /admin/... which
    // has no [locale] segment → 404. Rewrite POST server actions to /en/... so
    // Next.js can resolve the route.
    if (request.method === 'POST') {
        const isLocalePrefix = routing.locales.some(l => path.startsWith(`/${l}/`) || path === `/${l}`)
        if (!isLocalePrefix) {
            const url = request.nextUrl.clone()
            url.pathname = `/${routing.defaultLocale}${path}`
            return NextResponse.rewrite(url)
        }
    }

    const response = intlMiddleware(request);
    return await updateSession(request, response);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|auth|.*\\..*).*)']
};
