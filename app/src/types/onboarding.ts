import type { SupportedLanguage, UserRole } from '../../../shared/src/types/user.js';

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
  role?: UserRole;
  displayName?: string;
  experienceYears?: number;
  focusAreas?: string[];
  preferredRoles?: string[];
  bio?: string;
}

export interface OnboardingProfileDraftResponse {
  draftId: string;
  savedAt: string;
  expiresAt?: string;
}
