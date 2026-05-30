import { getRequestConfig } from 'next-intl/server';
import { ACTIVE_LOCALES, DEFAULT_LOCALE } from '@/config/locales';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;


    // Ensure that a valid locale is used
    if (!locale || !ACTIVE_LOCALES.includes(locale as any)) {
        console.warn(`[i18n] Invalid locale "${locale}", falling back to "${DEFAULT_LOCALE}"`);
        locale = DEFAULT_LOCALE;
    }

    try {
        const messages = (await import(`../../messages/${locale}.json`)).default;
        return {
            locale,
            messages
        };
    } catch (error) {
        console.error(`[i18n] Failed to load messages for "${locale}":`, error);
        
        // Graceful fallback to en.json if the requested language JSON file is missing
        if (locale !== 'en') {
            console.warn(`[i18n] Attempting fallback to "en" messages...`);
            try {
                const enMessages = (await import(`../../messages/en.json`)).default;
                return {
                    locale, 
                    messages: enMessages
                };
            } catch (fallbackError) {
                console.error(`[i18n] Fatal: Could not even load en.json fallback`, fallbackError);
            }
        }
        
        throw error;
    }
});
