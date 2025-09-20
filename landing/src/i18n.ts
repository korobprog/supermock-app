import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Функция для получения текущей локали из URL или cookies
const getCurrentLocale = (): string => {
  // Сначала проверяем URL
  const pathname = window.location.pathname;
  const localeFromUrl = pathname.split('/')[1];
  
  // Поддерживаемые локали
  const supportedLocales = ['en', 'ru', 'es', 'fr', 'de', 'zh'];
  
  if (supportedLocales.includes(localeFromUrl)) {
    return localeFromUrl;
  }
  
  // Если в URL нет локали, проверяем cookies
  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(cookie => cookie.trim().startsWith('NEXT_LOCALE='));
  
  if (localeCookie) {
    const locale = localeCookie.split('=')[1];
    if (supportedLocales.includes(locale)) {
      return locale;
    }
  }
  
  // Fallback на русский (дефолтная локаль)
  return 'ru';
};

// Функция для загрузки переводов
const loadTranslations = async (locale: string) => {
  try {
    const response = await fetch(`/locales/${locale}/common.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}:`, error);
  }
  
  // Fallback на английский
  try {
    const response = await fetch('/locales/en/common.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to load fallback translations:', error);
  }
  
  return {};
};

// Инициализация i18n
const initI18n = async () => {
  const currentLocale = getCurrentLocale();
  const translations = await loadTranslations(currentLocale);
  
  await i18n
    .use(initReactI18next)
    .init({
      lng: currentLocale,
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      
      resources: {
        [currentLocale]: {
          translation: translations
        }
      },
      
      interpolation: {
        escapeValue: false
      },
      
      react: {
        useSuspense: false
      }
    });
    
  return i18n;
};

// Экспортируем инициализированный экземпляр
export default initI18n();
