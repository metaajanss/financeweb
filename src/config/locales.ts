export const LOCALES_CONFIG = {
  en: { name: 'English', flag: '🇺🇸', active: true },
  tr: { name: 'Türkçe', flag: '🇹🇷', active: true },
  de: { name: 'Deutsch', flag: '🇩🇪', active: true },
  fr: { name: 'Français', flag: '🇫🇷', active: true },
  es: { name: 'Español', flag: '🇪🇸', active: true },
  it: { name: 'Italiano', flag: '🇮🇹', active: false },
  pt: { name: 'Português', flag: '🇵🇹', active: false },
  nl: { name: 'Nederlands', flag: '🇳🇱', active: false },
  hi: { name: 'Hindi', flag: '🇮🇳', active: true },
  zh: { name: 'Chinese', flag: '🇨🇳', active: true },
  ar: { name: 'Arabic', flag: '🇸🇦', active: true },
  ru: { name: 'Russian', flag: '🇷🇺', active: true },
  id: { name: 'Indonesian', flag: '🇮🇩', active: true },
} as const;

export type SupportedLocale = keyof typeof LOCALES_CONFIG;

// Sadece 'active: true' olan dilleri next-intl'ye bildir
export const ACTIVE_LOCALES = Object.entries(LOCALES_CONFIG)
  .filter(([_, config]) => config.active)
  .map(([code]) => code as SupportedLocale);

export const DEFAULT_LOCALE: SupportedLocale = 'en';
