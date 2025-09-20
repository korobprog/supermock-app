import { create } from 'zustand';

export interface CacheState {
  // Image cache
  imageCache: Record<string, {
    src: string;
    loaded: boolean;
    error: boolean;
    timestamp: number;
  }>;
  
  // API response cache
  apiCache: Record<string, {
    data: any;
    timestamp: number;
    ttl: number; // time to live in milliseconds
  }>;

  // Cache management
  setImageCache: (key: string, data: { src: string; loaded: boolean; error: boolean }) => void;
  getImageCache: (key: string) => { src: string; loaded: boolean; error: boolean } | null;
  
  setApiCache: (key: string, data: any, ttl?: number) => void;
  getApiCache: (key: string) => any | null;
  
  clearExpiredCache: () => void;
  clearAllCache: () => void;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const useCacheStore = create<CacheState>((set, get) => ({
  // Image cache
  imageCache: {},
  
  // API response cache
  apiCache: {},

  // Cache management
  setImageCache: (key, data) =>
    set((state) => ({
      imageCache: {
        ...state.imageCache,
        [key]: {
          ...data,
          timestamp: Date.now(),
        },
      },
    })),

  getImageCache: (key) => {
    const cache = get().imageCache[key];
    if (!cache) return null;
    
    // Check if cache is still valid (24 hours for images)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - cache.timestamp > maxAge) {
      set((state) => {
        const newCache = { ...state.imageCache };
        delete newCache[key];
        return { imageCache: newCache };
      });
      return null;
    }
    
    return cache;
  },

  setApiCache: (key, data, ttl = DEFAULT_TTL) =>
    set((state) => ({
      apiCache: {
        ...state.apiCache,
        [key]: {
          data,
          timestamp: Date.now(),
          ttl,
        },
      },
    })),

  getApiCache: (key) => {
    const cache = get().apiCache[key];
    if (!cache) return null;
    
    // Check if cache is still valid
    if (Date.now() - cache.timestamp > cache.ttl) {
      set((state) => {
        const newCache = { ...state.apiCache };
        delete newCache[key];
        return { apiCache: newCache };
      });
      return null;
    }
    
    return cache.data;
  },

  clearExpiredCache: () => {
    const now = Date.now();
    set((state) => {
      const newImageCache = { ...state.imageCache };
      const newApiCache = { ...state.apiCache };
      
      // Clear expired image cache (24 hours)
      const imageMaxAge = 24 * 60 * 60 * 1000;
      Object.keys(newImageCache).forEach(key => {
        if (now - newImageCache[key].timestamp > imageMaxAge) {
          delete newImageCache[key];
        }
      });
      
      // Clear expired API cache
      Object.keys(newApiCache).forEach(key => {
        if (now - newApiCache[key].timestamp > newApiCache[key].ttl) {
          delete newApiCache[key];
        }
      });
      
      return {
        imageCache: newImageCache,
        apiCache: newApiCache,
      };
    });
  },

  clearAllCache: () =>
    set({
      imageCache: {},
      apiCache: {},
    }),
}));
