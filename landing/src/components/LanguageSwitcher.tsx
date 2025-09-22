'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Globe } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSafeUIStore } from '@/hooks/useSafeUIStore';
import { useTranslation as useI18nTranslation } from 'next-i18next';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' }
];

const LanguageSwitcher = ({ compact = false }: LanguageSwitcherProps) => {
  const { i18n } = useI18nTranslation();
  const router = useRouter();
  const { isLanguageDropdownOpen, toggleLanguageDropdown, closeLanguageDropdown } = useSafeUIStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = router.locale ?? i18n.language ?? router.defaultLocale ?? 'en';
  const currentLanguageInfo = languages.find(lang => lang.code === currentLocale) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    if (languageCode === currentLocale) {
      closeLanguageDropdown();
      return;
    }

    void router
      .push(
        { pathname: router.pathname, query: router.query },
        router.asPath,
        { locale: languageCode }
      )
      .catch((error) => {
        console.error('LanguageSwitcher: error changing language:', error);
      })
      .finally(() => {
        closeLanguageDropdown();
      });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeLanguageDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isLanguageDropdownOpen) {
        closeLanguageDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLanguageDropdownOpen, closeLanguageDropdown]);

  return (
    <div className="relative z-[9998]" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toggleLanguageDropdown();
        }}
        aria-label={`Current language: ${currentLanguageInfo.name}. Click to change language.`}
        aria-expanded={isLanguageDropdownOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-2 px-3 py-2 h-auto ${
          compact ? 'px-2 py-1 h-8' : ''
        }`}
      >
        {!compact && <Globe className="h-4 w-4" />}
        <span className={`${compact ? 'text-base' : 'text-lg'}`}>{currentLanguageInfo.flag}</span>
        {!compact && (
          <span className="hidden sm:inline text-sm font-medium">
            {currentLanguageInfo.code.toUpperCase()}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isLanguageDropdownOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-2xl z-[9999] backdrop-blur-sm language-switcher-dropdown"
          role="listbox"
          aria-label="Language selection"
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="py-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                role="option"
                aria-selected={currentLocale === language.code}
                className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 ${
                  currentLocale === language.code ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <span className="text-xl" aria-hidden="true">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {currentLocale === language.code && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" aria-hidden="true"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

