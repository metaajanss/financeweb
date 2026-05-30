'use client';

import { useEffect } from 'react';

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Detect timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Get existing cookie
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {} as Record<string, string>);

        // Update cookie if missing or different
        if (cookies['x-timezone'] !== timezone) {
            // Set cookie for 365 days
            const expires = new Date();
            expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000));
            document.cookie = `x-timezone=${timezone};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

            // Optional: Refresh page or notify app to re-fetch data with new timezone
            // For now, just setting the cookie is enough for subsequent SSR/Server Action calls
        }
    }, []);

    return <>{children}</>;
}
