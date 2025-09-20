import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createVersionedStorage } from '@/lib/persistence';

export interface SettingsState {
  // Language settings
  language: string;
  setLanguage: (language: string) => void;

  // Theme settings (if needed in future)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // User preferences
  preferences: {
    showAnimations: boolean;
    reducedMotion: boolean;
    compactMode: boolean;
  };
  updatePreferences: (preferences: Partial<SettingsState['preferences']>) => void;

  // Analytics consent
  analyticsConsent: boolean | null; // null = not asked, true = consented, false = declined
  setAnalyticsConsent: (consent: boolean) => void;
}

const defaultPreferences = {
  showAnimations: true,
  reducedMotion: false,
  compactMode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Language settings
      language: 'en',
      setLanguage: (language) => set({ language }),

      // Theme settings
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // User preferences
      preferences: defaultPreferences,
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
          },
        })),

      // Analytics consent
      analyticsConsent: null,
      setAnalyticsConsent: (consent) => set({ analyticsConsent: consent }),
    }),
    {
      name: 'landing-settings-store',
      storage: createVersionedStorage('landing-settings'),
      // Persist all settings
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        preferences: state.preferences,
        analyticsConsent: state.analyticsConsent,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Settings store rehydrated:', { 
            language: state.language,
            theme: state.theme,
            analyticsConsent: state.analyticsConsent
          })
        }
      }
    }
  )
);
