import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for landing page
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect for landing page
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Cache cleanup utility
export const clearExpiredQueries = () => {
  queryClient.invalidateQueries();
};

// Prefetch utilities for common data
export const prefetchCommonData = async () => {
  // You can add prefetching logic here for common data
  // that might be needed across the landing page
};
