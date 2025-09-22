'use client';

import { useTranslation } from 'next-i18next';
import { useSafeTranslation } from '@/hooks/useSafeTranslation';

const LanguageTest = () => {
  const { i18n } = useTranslation();
  const { locale } = useSafeTranslation();

  return (
    <div className="fixed top-20 right-4 bg-red-500 text-white p-2 rounded z-50">
      <div>Current Language: {i18n.language}</div>
      <div>Safe Locale: {locale}</div>
    </div>
  );
};

export default LanguageTest;
