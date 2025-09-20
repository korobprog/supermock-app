import { useMemo, useState } from 'react';
import Head from 'next/head';

import LanguageStep from '@/components/onboarding/LanguageStep';
import RoleSelectionStep from '@/components/onboarding/RoleSelectionStep';
import SkillProfileStep from '@/components/onboarding/SkillProfileStep';
import TimezoneStep from '@/components/onboarding/TimezoneStep';

const STEP_COMPONENTS: Array<() => JSX.Element> = [LanguageStep, TimezoneStep, SkillProfileStep, RoleSelectionStep];

export default function OnboardingPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const CurrentStepComponent = useMemo(() => STEP_COMPONENTS[currentStepIndex] ?? LanguageStep, [currentStepIndex]);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_COMPONENTS.length - 1;

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
              onClick={() => setCurrentStepIndex((index) => Math.max(0, index - 1))}
              disabled={isFirstStep}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90"
              onClick={() => {
                if (!isLastStep) {
                  setCurrentStepIndex((index) => Math.min(STEP_COMPONENTS.length - 1, index + 1));
                  return;
                }

                // TODO: navigate to the next onboarding step once implemented
              }}
            >
              {isLastStep ? 'Continue' : 'Next step'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
