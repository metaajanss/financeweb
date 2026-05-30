import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/core/db/middleware';
import { routing } from '@/i18n/navigation';

const intlMiddleware = createMiddleware(routing);


export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;


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
