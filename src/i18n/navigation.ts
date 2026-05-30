import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { ACTIVE_LOCALES, DEFAULT_LOCALE } from '@/config/locales';

export const routing = defineRouting({
    locales: ACTIVE_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: 'as-needed'
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing);
