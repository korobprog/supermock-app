import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    (set) => ({
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
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.warn(`Failed to parse stored data for ${name}:`, error)
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.error(`Failed to store data for ${name}:`, error)
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        }
      },
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
