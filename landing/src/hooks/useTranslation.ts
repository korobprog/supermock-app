import { useTranslation as useI18nTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lng);
    }
  };

  // Load language from localStorage on client side
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }

  return {
    t,
    changeLanguage,
    currentLanguage: i18n.language,
    availableLanguages: ['en', 'ru', 'es', 'fr', 'de', 'zh']
  };
};
