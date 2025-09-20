import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    const initI18n = async () => {
      try {
        // Ждем инициализации i18n
        await i18n;
        setIsI18nReady(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        // В случае ошибки все равно показываем приложение
        setIsI18nReady(true);
      }
    };

    initI18n();
  }, []);

  // Показываем загрузку пока i18n не готов
  if (!isI18nReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};
