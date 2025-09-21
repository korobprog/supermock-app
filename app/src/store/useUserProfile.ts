import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SupportedLanguage, UserRole } from '../../../shared/src/types/user.js';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ru', 'es', 'fr', 'de', 'zh'];
export const DEFAULT_LOCALE: SupportedLanguage = 'en';

type OnboardingProfile = {
  id: string;
  email: string;
  role: UserRole;
  locale: SupportedLanguage;
  languages: SupportedLanguage[];
  timezone: string;
  timezoneSource: 'auto' | 'manual';
  professionId: string | null;
  customProfession: string;
  expertiseTools: string[];
  draftUpdatedAt: string | null;
};

interface UserProfileState {
  profile: OnboardingProfile;
  setRole: (role: UserRole) => void;
  setLocale: (locale: SupportedLanguage) => void;
  setTimezone: (timezone: string, source?: 'auto' | 'manual') => void;
  setProfession: (professionId: string | null) => void;
  setCustomProfession: (value: string) => void;
  addExpertiseTool: (tool: string) => void;
  removeExpertiseTool: (tool: string) => void;
  replaceExpertiseTools: (tools: string[]) => void;
}

const defaultProfile: OnboardingProfile = {
  id: 'demo-candidate',
  email: 'candidate@supermock.io',
  role: 'CANDIDATE',
  locale: DEFAULT_LOCALE,
  languages: [DEFAULT_LOCALE],
  timezone: 'UTC',
  timezoneSource: 'auto',
  professionId: null,
  customProfession: '',
  expertiseTools: [],
  draftUpdatedAt: null
};

function withDraftUpdate<T extends Partial<OnboardingProfile>>(profile: OnboardingProfile, updates: T) {
  return {
    ...profile,
    ...updates,
    draftUpdatedAt: new Date().toISOString()
  } satisfies OnboardingProfile;
}

export const useUserProfile = create<UserProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setRole: (role) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, { role })
        })),
      setLocale: (locale) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            locale,
            languages: [locale, ...state.profile.languages.filter((code) => code !== locale)]
          })
        })),
      setTimezone: (timezone, source = 'manual') =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            timezone,
            timezoneSource: source
          })
        })),
      setProfession: (professionId) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            professionId,
            customProfession: professionId === 'other' ? state.profile.customProfession : ''
          })
        })),
      setCustomProfession: (value) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            customProfession: value,
            professionId: state.profile.professionId ?? 'other'
          })
        })),
      addExpertiseTool: (tool) =>
        set((state) => {
          const normalized = tool.trim();
          if (!normalized) {
            return state;
          }

          const existing = new Set(state.profile.expertiseTools.map((item) => item.toLowerCase()));
          if (existing.has(normalized.toLowerCase())) {
            return {
              profile: withDraftUpdate(state.profile, {})
            };
          }

          return {
            profile: withDraftUpdate(state.profile, {
              expertiseTools: [...state.profile.expertiseTools, normalized]
            })
          };
        }),
      removeExpertiseTool: (tool) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            expertiseTools: state.profile.expertiseTools.filter(
              (item) => item.toLowerCase() !== tool.toLowerCase()
            )
          })
        })),
      replaceExpertiseTools: (tools) =>
        set((state) => ({
          profile: withDraftUpdate(state.profile, {
            expertiseTools: Array.from(
              new Map(
                tools
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item) => [item.toLowerCase(), item] as const)
              ).values()
            )
          })
        }))
    }),
    {
      name: 'supermock-onboarding-profile',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return window.localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({ profile: state.profile })
    }
  )
);
