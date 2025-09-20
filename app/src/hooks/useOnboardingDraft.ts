import { useMutation } from '@tanstack/react-query';

import { saveOnboardingProfileDraft } from '@/lib/api';
import { useUserProfile } from '@/store/useUserProfile';
import type { OnboardingProfileDraftPayload } from '@/types/onboarding';

function buildDraftPayload(profile: ReturnType<typeof useUserProfile.getState>['profile']): OnboardingProfileDraftPayload {
  const uniqueTools = Array.from(
    new Map(
      profile.expertiseTools
        .map((tool) => tool.trim())
        .filter(Boolean)
        .map((tool) => [tool.toLowerCase(), tool] as const)
    ).values()
  );

  const customProfession = profile.customProfession.trim();

  return {
    id: profile.id,
    email: profile.email,
    locale: profile.locale,
    languages: profile.languages,
    timezone: profile.timezone,
    timezoneSource: profile.timezoneSource,
    professionId: profile.professionId,
    customProfession: customProfession || undefined,
    expertiseTools: uniqueTools
  };
}

export function useSaveOnboardingDraft() {
  const profile = useUserProfile((state) => state.profile);

  return useMutation({
    mutationKey: ['onboarding', 'profile-draft', profile.id],
    mutationFn: (override?: Partial<OnboardingProfileDraftPayload>) => {
      const basePayload = buildDraftPayload(profile);
      const payload = override ? { ...basePayload, ...override } : basePayload;
      return saveOnboardingProfileDraft(payload);
    }
  });
}
