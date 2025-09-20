import { useEffect } from 'react';
import { useCacheStore } from '@/stores/cacheStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const { clearExpiredCache } = useCacheStore();

  useEffect(() => {
    // Clear expired cache on app start
    clearExpiredCache();

    // Set up periodic cache cleanup (every 10 minutes)
    const interval = setInterval(() => {
      clearExpiredCache();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clearExpiredCache]);

  return <>{children}</>;
};
