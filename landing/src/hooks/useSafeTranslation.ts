import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UseSafeTranslationReturn {
  t: (key: string, options?: any) => string;
  locale: string;
  isLoading: boolean;
  error: Error | null;
}

export const useSafeTranslation = (): UseSafeTranslationReturn => {
  const { t: i18nT, i18n } = useTranslation();
  const [error, setError] = useState<Error | null>(null);

  // Функция перевода с fallback
  const t = (key: string, options?: any): string => {
    try {
      const translation = i18nT(key, options);
      
      // Если перевод не найден, возвращаем ключ
      if (translation === key) {
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }
      
      return translation;
    } catch (err) {
      console.warn('Translation error:', err);
      setError(err instanceof Error ? err : new Error('Translation error'));
      return key;
    }
  };

  return {
    t,
    locale: i18n.language || 'ru',
    isLoading: !i18n.isInitialized,
    error
  };
};