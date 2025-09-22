'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation as useI18nTranslation } from 'react-i18next';

const LanguageSwitcherSimple = () => {
  const { i18n } = useI18nTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const handleLanguageChange = (languageCode: string) => {
    console.log('SimpleLanguageSwitcher: changing language to:', languageCode);
    i18n.changeLanguage(languageCode).then(() => {
      console.log('SimpleLanguageSwitcher: language changed successfully to:', i18n.language);
    }).catch((error) => {
      console.error('SimpleLanguageSwitcher: error changing language:', error);
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          console.log('SimpleLanguageSwitcher: toggle clicked, current state:', isOpen);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2"
      >
        <span>{languages.find(lang => lang.code === i18n.language)?.flag || '🇺🇸'}</span>
        <span>{i18n.language.toUpperCase()}</span>
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
