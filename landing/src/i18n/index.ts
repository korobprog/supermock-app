import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from '../../public/locales/en/common.json';
import ru from '../../public/locales/ru/common.json';
import es from '../../public/locales/es/common.json';
import fr from '../../public/locales/fr/common.json';
import de from '../../public/locales/de/common.json';
import zh from '../../public/locales/zh/common.json';

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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
  });

export default i18n;
