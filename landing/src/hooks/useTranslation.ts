import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  const changeLanguage = (lng: string) => {
    console.log('useTranslation: changing language to:', lng);
    console.log('useTranslation: current i18n language before change:', i18n.language);
    console.log('useTranslation: i18n is initialized:', i18n.isInitialized);
    
    i18n.changeLanguage(lng).then(() => {
      console.log('useTranslation: language change completed');
      console.log('useTranslation: new i18n language:', i18n.language);
    }).catch((error) => {
      console.error('useTranslation: language change failed:', error);
    });
    
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lng);
      console.log('useTranslation: language saved to localStorage:', lng);
    }
  };

  // Load language from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language');
      console.log('useTranslation: saved language from localStorage:', savedLanguage);
      console.log('useTranslation: current i18n language:', i18n.language);
      if (savedLanguage && savedLanguage !== i18n.language) {
        console.log('useTranslation: changing language from localStorage:', savedLanguage);
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, [i18n]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('useTranslation: language changed event received:', lng);
      setCurrentLang(lng);
    };

    console.log('useTranslation: setting up language change listener');
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      console.log('useTranslation: cleaning up language change listener');
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return {
    t,
    changeLanguage,
    currentLanguage: currentLang,
    availableLanguages: ['en', 'ru', 'es', 'fr', 'de', 'zh']
  };
};
