import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next-i18next').UserConfig} */
const nextI18NextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru', 'es', 'fr', 'de', 'zh'],
    localeDetection: false,
  },
  defaultNS: 'common',
  localePath: path.resolve(__dirname, './src/locales'),
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};

export default nextI18NextConfig;
