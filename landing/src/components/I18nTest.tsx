'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

const I18nTest = () => {
  const { t, i18n } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkInitialization = () => {
      if (i18n.isInitialized) {
        setIsInitialized(true);
        console.log('I18nTest: i18n is initialized');
        console.log('I18nTest: current language:', i18n.language);
        console.log('I18nTest: available languages:', i18n.languages);
      } else {
        console.log('I18nTest: i18n is not initialized yet');
        setTimeout(checkInitialization, 100);
      }
    };
    
    checkInitialization();
  }, [i18n]);

  const testTranslation = () => {
    console.log('I18nTest: testing translation');
    console.log('I18nTest: hero.title =', t('hero.title'));
    console.log('I18nTest: hero.subtitle =', t('hero.subtitle'));
  };

  const changeLanguage = (lang: string) => {
    console.log('I18nTest: changing language to:', lang);
    i18n.changeLanguage(lang).then(() => {
      console.log('I18nTest: language changed to:', i18n.language);
      testTranslation();
    });
  };

  return (
    <div className="fixed top-32 right-4 bg-blue-500 text-white p-4 rounded z-50 max-w-xs">
      <div className="space-y-2">
        <div>I18n Initialized: {isInitialized ? 'Yes' : 'No'}</div>
        <div>Current Language: {i18n.language}</div>
        <div>Available Languages: {i18n.languages?.join(', ')}</div>
        <div className="space-y-1">
          <button 
            onClick={() => changeLanguage('ru')}
            className="block w-full bg-white text-blue-500 px-2 py-1 rounded text-sm"
          >
            Switch to Russian
          </button>
          <button 
            onClick={() => changeLanguage('en')}
            className="block w-full bg-white text-blue-500 px-2 py-1 rounded text-sm"
          >
            Switch to English
          </button>
          <button 
            onClick={testTranslation}
            className="block w-full bg-white text-blue-500 px-2 py-1 rounded text-sm"
          >
            Test Translation
          </button>
        </div>
      </div>
    </div>
  );
};

export default I18nTest;
