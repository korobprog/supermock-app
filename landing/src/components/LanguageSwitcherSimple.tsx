'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import { useTranslation as useI18nTranslation } from 'next-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' }
];

const LanguageSwitcherSimple = () => {
  const { i18n } = useI18nTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = router.locale ?? i18n.language ?? router.defaultLocale ?? 'en';
  const currentLanguage = languages.find(lang => lang.code === currentLocale);

  const handleLanguageChange = (languageCode: string) => {
    if (languageCode === currentLocale) {
      setIsOpen(false);
      return;
    }

    void router
      .push(
        { pathname: router.pathname, query: router.query },
        router.asPath,
        { locale: languageCode }
      )
      .catch((error) => {
        console.error('LanguageSwitcherSimple: error changing language:', error);
      })
      .finally(() => {
        setIsOpen(false);
      });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center gap-2"
      >
        <span>{currentLanguage?.flag ?? '🇺🇸'}</span>
        <span>{currentLocale.toUpperCase()}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
          <div className="py-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
              >
                <span className="text-xl">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcherSimple;
