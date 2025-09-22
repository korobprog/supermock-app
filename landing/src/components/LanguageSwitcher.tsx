'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Globe } from 'lucide-react';
import { useSafeUIStore } from '@/hooks/useSafeUIStore';
import { useTranslation as useI18nTranslation } from 'next-i18next';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher = ({ compact = false }: LanguageSwitcherProps) => {
  const { i18n } = useI18nTranslation();
  const { isLanguageDropdownOpen, toggleLanguageDropdown, closeLanguageDropdown } = useSafeUIStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isI18nReady, setIsI18nReady] = useState(i18n.isInitialized);
  
  console.log('LanguageSwitcher render:', {
    compact,
    isLanguageDropdownOpen,
    currentLanguage,
    isI18nReady,
    i18nInitialized: i18n.isInitialized
  });
  const availableLanguages = ['en', 'ru', 'es', 'fr', 'de', 'zh'];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const currentLanguageInfo = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    console.log('LanguageSwitcher: handleLanguageChange called with:', languageCode);
    console.log('LanguageSwitcher: current language:', currentLanguage);
    console.log('LanguageSwitcher: i18n ready:', isI18nReady);
    console.log('LanguageSwitcher: i18n initialized:', i18n.isInitialized);
    
    // Проверяем, что i18n готов
    if (!isI18nReady || !i18n.isInitialized) {
      console.log('LanguageSwitcher: i18n not ready, cannot change language');
      closeLanguageDropdown();
      return;
    }
    
    // Не меняем язык, если он уже выбран
    if (languageCode === currentLanguage) {
      console.log('LanguageSwitcher: language already selected, closing dropdown');
      closeLanguageDropdown();
      return;
    }
    
    try {
      console.log('LanguageSwitcher: changing language to:', languageCode);
      i18n.changeLanguage(languageCode).then(() => {
        console.log('LanguageSwitcher: language changed successfully to:', i18n.language);
        setCurrentLanguage(i18n.language);
        
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('language', languageCode);
          console.log('LanguageSwitcher: language saved to localStorage:', languageCode);
        }
        
        // Закрываем dropdown только после успешного переключения
        closeLanguageDropdown();
      }).catch((error) => {
        console.error('LanguageSwitcher: error changing language:', error);
        // В случае ошибки тоже закрываем dropdown
        closeLanguageDropdown();
      });
    } catch (error) {
      console.error('LanguageSwitcher: error changing language:', error);
      // В случае ошибки тоже закрываем dropdown
      closeLanguageDropdown();
    }
  };

  // Закрытие dropdown при клике вне его и обработка клавиатуры
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

  // Check i18n readiness and initialize language from localStorage
  useEffect(() => {
    const checkI18nReady = () => {
      if (i18n.isInitialized) {
        console.log('LanguageSwitcher: i18n is ready, current language:', i18n.language);
        setIsI18nReady(true);
        setCurrentLanguage(i18n.language);
        
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('language');
          if (savedLanguage && savedLanguage !== i18n.language) {
            console.log('LanguageSwitcher: loading saved language from localStorage:', savedLanguage);
            i18n.changeLanguage(savedLanguage);
            setCurrentLanguage(savedLanguage);
          }
        }
      } else {
        console.log('LanguageSwitcher: i18n not ready yet, waiting...');
        setTimeout(checkI18nReady, 100);
      }
    };
    
    checkI18nReady();
  }, [i18n]);

  // Listen for language changes to update the component
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('LanguageSwitcher: language changed to:', lng);
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Debug: Log when dropdown state changes
  useEffect(() => {
    console.log('LanguageSwitcher: dropdown state changed to:', isLanguageDropdownOpen);
  }, [isLanguageDropdownOpen]);

  // Не отображаем компонент, пока i18n не готов
  if (!isI18nReady || !i18n.isInitialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 h-auto">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative z-[9998]" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          console.log('LanguageSwitcher: toggleLanguageDropdown clicked, current state:', isLanguageDropdownOpen);
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
                aria-selected={currentLanguage === language.code}
                className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 ${
                  currentLanguage === language.code ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <span className="text-xl" aria-hidden="true">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {currentLanguage === language.code && (
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

