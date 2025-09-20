import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { useUserProfile } from '@/store/useUserProfile';

import OnboardingProgress from './OnboardingProgress';
import type { SupportedLanguage } from '../../../../shared/src/types/user.js';

const LANGUAGE_TO_INTL_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN'
};

const FALLBACK_TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Kiev',
  'Europe/Warsaw',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Mexico_City',
  'Africa/Cairo',
  'Africa/Johannesburg'
];

function formatTimeForZone(zone: string, locale: SupportedLanguage): string {
  if (!zone) {
    return '—';
  }

  try {
    const intlLocale = LANGUAGE_TO_INTL_LOCALE[locale] ?? 'en-US';
    return new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: zone
    }).format(new Date());
  } catch (error) {
    return '—';
  }
}

export default function TimezoneStep() {
  const profile = useUserProfile((state) => state.profile);
  const setTimezone = useUserProfile((state) => state.setTimezone);
  const detectionAppliedRef = useRef(false);

  const [autoTimezone, setAutoTimezone] = useState<string>(profile.timezone || 'UTC');
  const [questionState, setQuestionState] = useState<'unanswered' | 'confirmed' | 'override'>(
    'unanswered'
  );
  const [manualSelection, setManualSelection] = useState<string>(profile.timezone);
  const [availableTimezones, setAvailableTimezones] = useState<string[]>(FALLBACK_TIMEZONES);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    setAutoTimezone(resolvedZone);

    if (!detectionAppliedRef.current) {
      detectionAppliedRef.current = true;

      if (profile.timezoneSource === 'auto' && profile.timezone !== resolvedZone) {
        setTimezone(resolvedZone, 'auto');
      }

      if (profile.timezoneSource === 'auto') {
        setManualSelection(resolvedZone);
      }
    }
  }, [profile.timezone, profile.timezoneSource, setTimezone]);

  useEffect(() => {
    setManualSelection(profile.timezone);
  }, [profile.timezone]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
      try {
        const result = (Intl as any).supportedValuesOf('timeZone') as string[];
        if (Array.isArray(result) && result.length > 0) {
          setAvailableTimezones(result);
        }
      } catch (error) {
        setAvailableTimezones(FALLBACK_TIMEZONES);
      }
    }
  }, []);

  const sortedTimezones = useMemo(() => {
    const unique = new Set([...availableTimezones, ...FALLBACK_TIMEZONES]);
    return Array.from(unique).sort();
  }, [availableTimezones]);

  const detectedTimeLabel = useMemo(
    () => formatTimeForZone(autoTimezone, profile.locale),
    [autoTimezone, profile.locale]
  );

  const selectedTimeLabel = useMemo(
    () => formatTimeForZone(manualSelection, profile.locale),
    [manualSelection, profile.locale]
  );

  const handleConfirmDetected = () => {
    setTimezone(autoTimezone, 'auto');
    setManualSelection(autoTimezone);
    setQuestionState('confirmed');
  };

  const handleRejectDetected = () => {
    setQuestionState('override');
  };

  const handleManualSelection = (event: ChangeEvent<HTMLSelectElement>) => {
    const zone = event.target.value;
    setManualSelection(zone);
    setTimezone(zone, 'manual');
  };

  const showConfirmationMessage =
    questionState === 'confirmed' || profile.timezoneSource === 'manual';

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary/80">
            Step 2 · Onboarding
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Set your timezone</h1>
          <p className="max-w-xl text-sm text-slate-300">
            We auto-detect your timezone to schedule interviews in your local time. Confirm or adjust it to keep
            availability and notifications accurate.
          </p>
        </div>
        <OnboardingProgress currentStep={2} totalSteps={4} />
      </header>

      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">Auto-detected timezone</p>
          <p>{autoTimezone}</p>
          <p className="text-xs text-slate-400">Detected using your browser settings</p>
        </div>

        <div className="space-y-4">
          <p className="text-lg font-semibold text-white">
            Сейчас у вас {detectedTimeLabel !== '—' ? detectedTimeLabel : '...'}?
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl border border-secondary/60 px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10"
              onClick={handleConfirmDetected}
            >
              Да, всё верно
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              onClick={handleRejectDetected}
            >
              Нет, выбрать другой
            </button>
          </div>
          {showConfirmationMessage && (
            <p className="text-sm text-emerald-300">Часовой пояс сохранён: {profile.timezone}</p>
          )}
        </div>

        {questionState === 'override' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-200" htmlFor="timezone-selector">
              Выберите ваш часовой пояс
            </label>
            <select
              id="timezone-selector"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
              value={manualSelection}
              onChange={handleManualSelection}
            >
              {sortedTimezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">Время в выбранной зоне: {selectedTimeLabel}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">Текущий профиль</p>
            <p>{profile.timezone}</p>
          </div>
          <p className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Расхождение с собеседником компенсируем — система предложит общий слот с учётом часовых зон.
          </p>
        </div>
      </div>
    </section>
  );
}
