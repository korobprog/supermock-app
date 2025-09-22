import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';

interface UseSafeTranslationReturn {
  t: (key: string, options?: any) => string;
  locale: string;
  isLoading: boolean;
  error: Error | null;
}

export const useSafeTranslation = (): UseSafeTranslationReturn => {
  const { t: i18nT, i18n } = useTranslation();
  const [error, setError] = useState<Error | null>(null);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  // Функция перевода с fallback
  const t = (key: string, options?: any): string => {
    try {
      const translation = i18nT(key, options);

      // Если перевод не найден, возвращаем ключ
      if (translation === key) {
        if (!i18n.isInitialized) {
          console.warn('i18n not initialized yet, returning key:', key);
        } else {
          console.warn(`Translation not found for key: ${key}`);
        }
        return key;
      }

      // Если перевод - объект, возвращаем строковое представление
      if (typeof translation === 'object') {
        console.warn(`Translation for key '${key}' returned an object, converting to string`);
        return JSON.stringify(translation);
      }

      return String(translation);
    } catch (err) {
      console.warn('Translation error:', err);
      setError(err instanceof Error ? err : new Error('Translation error'));
      return key;
    }
  };

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('useSafeTranslation: language changed to:', lng);
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return {
    t,
    locale: currentLang || 'en',
    isLoading: typeof window !== 'undefined' ? !i18n.isInitialized : false,
    error
  };
};
