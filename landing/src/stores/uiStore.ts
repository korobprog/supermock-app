import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createVersionedStorage } from '@/lib/persistence';

export interface UIState {
  // Navigation state
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // Language switcher state
  isLanguageDropdownOpen: boolean;
  setLanguageDropdownOpen: (open: boolean) => void;
  toggleLanguageDropdown: () => void;
  closeLanguageDropdown: () => void;

  // Loading states
  imageLoadingStates: Record<string, boolean>;
  setImageLoading: (key: string, loading: boolean) => void;
  getImageLoading: (key: string) => boolean;

  // Mobile detection
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Navigation state
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      closeMobileMenu: () => set({ isMobileMenuOpen: false }),

      // Language switcher state
      isLanguageDropdownOpen: false,
      setLanguageDropdownOpen: (open) => set({ isLanguageDropdownOpen: open }),
      toggleLanguageDropdown: () => set((state) => ({ isLanguageDropdownOpen: !state.isLanguageDropdownOpen })),
      closeLanguageDropdown: () => set({ isLanguageDropdownOpen: false }),

      // Loading states
      imageLoadingStates: {},
      setImageLoading: (key, loading) => 
        set((state) => ({
          imageLoadingStates: {
            ...state.imageLoadingStates,
            [key]: loading
          }
        })),
      getImageLoading: (key) => get().imageLoadingStates[key] || false,

      // Mobile detection
      isMobile: false,
      setIsMobile: (mobile) => set({ isMobile: mobile }),
    }),
    {
      name: 'landing-ui-store',
      storage: createVersionedStorage('landing-ui'),
      // Only persist navigation and mobile state, not loading states
      partialize: (state) => ({
        isMobile: state.isMobile,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('UI store rehydrated:', { 
            isMobile: state.isMobile
          })
        }
      }
    }
  )
);
