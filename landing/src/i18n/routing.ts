import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ru', 'es', 'fr', 'de', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Use 'as-needed' strategy to omit locale prefix for default locale
  localePrefix: 'as-needed'
});
