import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from '../locales/en/common.json';
import ru from '../locales/ru/common.json';
import es from '../locales/es/common.json';
import fr from '../locales/fr/common.json';
import de from '../locales/de/common.json';
import zh from '../locales/zh/common.json';

console.log('i18n config - loaded translations:', { en, ru, es, fr, de, zh });

const resources = {
  en: {
    translation: en
  },
  ru: {
    translation: ru
  },
  es: {
    translation: es
  },
  fr: {
    translation: fr
  },
  de: {
    translation: de
  },
  zh: {
    translation: zh
  }
};

console.log('i18n config - resources object:', resources);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
    react: {
      useSuspense: false, // Disable suspense to prevent hydration issues
    },
  })
  .then(() => {
    console.log('i18n initialized successfully');
    console.log('Current language:', i18n.language);
    console.log('Available languages:', i18n.languages);
    console.log('Resources loaded:', Object.keys(resources));
    console.log('i18n is initialized:', i18n.isInitialized);
    
    // Test translation
    const testTranslation = i18n.t('hero.title');
    console.log('Test translation for hero.title:', testTranslation);
  })
  .catch((error) => {
    console.error('i18n initialization failed:', error);
  });

export default i18n;
