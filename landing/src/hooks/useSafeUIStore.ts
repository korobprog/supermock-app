import { useUIStore } from '@/stores/uiStore';

export const useSafeUIStore = () => {
  try {
    return useUIStore();
  } catch (error) {
    // Fallback when store is not available (during SSR/static generation)
    return {
      isMobileMenuOpen: false,
      setMobileMenuOpen: () => {},
      toggleMobileMenu: () => {},
      closeMobileMenu: () => {},
      isLanguageDropdownOpen: false,
      setLanguageDropdownOpen: () => {},
      toggleLanguageDropdown: () => {},
      closeLanguageDropdown: () => {},
      imageLoadingStates: {},
      setImageLoading: () => {},
      getImageLoading: () => false,
      isMobile: false,
      setIsMobile: () => {},
    };
  }
};
