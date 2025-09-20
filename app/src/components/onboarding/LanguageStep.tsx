import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { DEFAULT_LOCALE, SUPPORTED_LANGUAGES, useUserProfile } from '@/store/useUserProfile';

import OnboardingProgress from './OnboardingProgress';
import type { SupportedLanguage } from '../../../../shared/src/types/user.js';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文'
};

const SUPPORTED_SET = new Set<SupportedLanguage>(SUPPORTED_LANGUAGES);

function resolveSupportedLanguage(rawLanguage: string | undefined): SupportedLanguage {
  if (!rawLanguage) {
    return DEFAULT_LOCALE;
  }

  const normalized = rawLanguage.toLowerCase();
  const primaryCode = normalized.split(/[-_]/)[0];

  if (SUPPORTED_SET.has(primaryCode as SupportedLanguage)) {
    return primaryCode as SupportedLanguage;
  }

  return DEFAULT_LOCALE;
}

export default function LanguageStep() {
  const profile = useUserProfile((state) => state.profile);
  const setLocale = useUserProfile((state) => state.setLocale);
  const detectionAppliedRef = useRef(false);
  const [browserLanguage, setBrowserLanguage] = useState('');
  const [detectedLocale, setDetectedLocale] = useState<SupportedLanguage>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const detectedLanguage = window.navigator.language ?? '';
    const matchedLocale = resolveSupportedLanguage(detectedLanguage);

    setBrowserLanguage(detectedLanguage);
    setDetectedLocale(matchedLocale);

    if (!detectionAppliedRef.current) {
      detectionAppliedRef.current = true;
      if (profile.locale === DEFAULT_LOCALE && matchedLocale !== profile.locale) {
        setLocale(matchedLocale);
      }
    }
  }, [profile.locale, setLocale]);

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((code) => ({
        value: code,
        label: LANGUAGE_LABELS[code]
      })),
    []
  );

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value as SupportedLanguage);
  };

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary/80">
            Step 1 · Onboarding
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Choose your interface language
          </h1>
          <p className="max-w-xl text-sm text-slate-300">
            We&apos;ll tailor navigation, scheduling slots, and interviewer communication hints to the selected locale.
          </p>
        </div>
        <OnboardingProgress currentStep={1} totalSteps={4} />
      </header>

      <div className="mt-8 space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200" htmlFor="language-selector">
            Interface language
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              id="language-selector"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40 sm:max-w-xs"
              value={profile.locale}
              onChange={handleLanguageChange}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Current profile locale</p>
              <p>{LANGUAGE_LABELS[profile.locale]}</p>
            </div>
          </div>
          {browserLanguage && (
            <p className="text-xs text-slate-400">
              Auto-detected from browser: {LANGUAGE_LABELS[detectedLocale]} ({browserLanguage})
            </p>
          )}
        </div>

        <p className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Локаль влияет на отображение слотов и коммуникацию — выберите язык, на котором вам удобнее проходить интервью.
        </p>
      </div>
    </section>
  );
}
