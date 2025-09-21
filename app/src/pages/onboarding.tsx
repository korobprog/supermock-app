import { useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import LanguageStep from '@/components/onboarding/LanguageStep';
import RoleSelectionStep from '@/components/onboarding/RoleSelectionStep';
import SkillProfileStep from '@/components/onboarding/SkillProfileStep';
import TimezoneStep from '@/components/onboarding/TimezoneStep';
import { completeOnboarding } from '@/lib/api';
import { useUserProfile } from '@/store/useUserProfile';
import { PROFESSION_OPTIONS } from '@/data/professions';
import type { CompleteOnboardingPayload } from '../../../shared/src/types/user.js';

type OnboardingProfile = ReturnType<typeof useUserProfile.getState>['profile'];

function normalizeExpertiseTools(tools: OnboardingProfile['expertiseTools']) {
  return Array.from(
    new Map(
      tools
        .map((tool) => tool.trim())
        .filter(Boolean)
        .map((tool) => [tool.toLowerCase(), tool] as const)
    ).values()
  );
}

function ensureUnique(values: readonly string[]) {
  return Array.from(
    new Map(values.map((value) => [value.trim().toLowerCase(), value.trim()])).values()
  ).filter(Boolean);
}

function deriveDisplayName(email: string) {
  const base = email.split('@')[0] ?? '';
  const normalized = base
    .replace(/[_\-.]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return normalized.length > 0 ? normalized.join(' ') : 'SuperMock User';
}

function buildCompletePayload(profile: OnboardingProfile): CompleteOnboardingPayload {
  const languages = Array.from(new Set([profile.locale, ...profile.languages]));
  const expertiseTools = normalizeExpertiseTools(profile.expertiseTools);
  const customProfession = profile.customProfession.trim();
  const profession =
    profile.professionId !== null
      ? PROFESSION_OPTIONS.find((option) => option.id === profile.professionId)
      : undefined;

  const preferredRoles = ensureUnique(
    [profession?.title, customProfession].filter((value): value is string => Boolean(value))
  );

  const experienceYears = Math.min(10, Math.max(1, expertiseTools.length || 3));

  return {
    draftId: profile.id,
    userId: profile.id,
    role: profile.role,
    displayName: deriveDisplayName(profile.email),
    experienceYears,
    timezone: profile.timezone || 'UTC',
    languages,
    focusAreas: expertiseTools,
    preferredRoles,
    expertiseTools,
    customProfession: customProfession || undefined
  } satisfies CompleteOnboardingPayload;
}

const STEP_COMPONENTS: Array<() => JSX.Element> = [
  LanguageStep,
  TimezoneStep,
  SkillProfileStep,
  RoleSelectionStep,
];

export default function OnboardingPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const profile = useUserProfile((state) => state.profile);

  const CurrentStepComponent = useMemo(() => STEP_COMPONENTS[currentStepIndex] ?? LanguageStep, [currentStepIndex]);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_COMPONENTS.length - 1;

  const handleSubmitFinalStep = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = buildCompletePayload(profile);
      const response = await completeOnboarding(payload);

      useUserProfile.setState((state) => ({
        profile: {
          ...state.profile,
          role: payload.role,
          languages: payload.languages,
          timezone: payload.timezone,
          expertiseTools: payload.expertiseTools ?? state.profile.expertiseTools,
          customProfession: payload.customProfession ?? state.profile.customProfession,
          draftUpdatedAt: response.user.updatedAt
        }
      }));

      setIsSubmitting(false);
      void router.push(payload.role === 'INTERVIEWER' ? '/interviewer' : '/interview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось завершить онбординг. Попробуйте ещё раз.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Onboarding · SuperMock</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
          <CurrentStepComponent />
          <div className="flex w-full max-w-3xl items-center justify-between">
            <button
              type="button"
              className="rounded-xl border border-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                setErrorMessage(null);
                setCurrentStepIndex((index) => Math.max(0, index - 1));
              }}
              disabled={isFirstStep || isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90"
              disabled={isSubmitting}
              onClick={() => {
                setErrorMessage(null);
                if (!isLastStep) {
                  setCurrentStepIndex((index) => Math.min(STEP_COMPONENTS.length - 1, index + 1));
                  return;
                }

                void handleSubmitFinalStep();
              }}
            >
              {isLastStep ? (isSubmitting ? 'Finishing…' : 'Continue') : 'Next step'}
            </button>
          </div>
          {errorMessage && (
            <p className="w-full max-w-3xl rounded-2xl border border-amber-400/60 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
              {errorMessage}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
