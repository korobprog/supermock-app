import type { SupportedLanguage } from '../../../shared/src/types/user.js';

export interface OnboardingProfileDraftPayload {
  id: string;
  email: string;
  locale: SupportedLanguage;
  languages: SupportedLanguage[];
  timezone: string;
  timezoneSource: 'auto' | 'manual';
  professionId: string | null;
  customProfession?: string;
  expertiseTools: string[];
}

export interface OnboardingProfileDraftResponse {
  draftId: string;
  savedAt: string;
  expiresAt?: string;
}
