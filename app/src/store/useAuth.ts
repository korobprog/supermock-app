import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
  } | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthData: (accessToken: string, refreshToken: string, refreshTokenExpiresAt: string, user: AuthState['user']) => void;
  refreshAccessToken: () => Promise<boolean>;
  isRefreshTokenExpired: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => {
      // Migration helper for existing users
      const migrateAuthData = () => {
        const state = get();
        // If user has accessToken but no refreshToken, they need to re-login
        if (state.accessToken && !state.refreshToken) {
          console.log('Auth data migration: refresh token missing, logging out user');
          set({
            accessToken: null,
            refreshToken: null,
            refreshTokenExpiresAt: null,
            user: null,
            isAuthenticated: false,
          });
        }
      };

      // Run migration on store initialization
      if (typeof window !== 'undefined') {
        setTimeout(migrateAuthData, 0);
      }

      return {
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      user: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        try {
          const response = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'Login failed');
          }

          const data = await response.json();
          
          set({
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
            user: data.user,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      
      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          refreshTokenExpiresAt: null,
          user: null,
          isAuthenticated: false,
        });
      },
      
      setAuthData: (accessToken: string, refreshToken: string, refreshTokenExpiresAt: string, user: AuthState['user']) => {
        set({
          accessToken,
          refreshToken,
          refreshTokenExpiresAt,
          user,
          isAuthenticated: true,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          console.log('No refresh token available');
          return false;
        }

        try {
          const response = await fetch('http://localhost:4000/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            console.log('Token refresh failed:', response.status);
            // If refresh fails, logout the user
            get().logout();
            return false;
          }

          const data = await response.json();
          
          set({
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
            user: data.user,
            isAuthenticated: true,
          });

          console.log('Token refreshed successfully');
          return true;
        } catch (error) {
          console.error('Token refresh error:', error);
          // If refresh fails, logout the user
          get().logout();
          return false;
        }
      },

      isRefreshTokenExpired: () => {
        const { refreshTokenExpiresAt } = get();
        
        if (!refreshTokenExpiresAt) {
          return true;
        }
        
        const expirationTime = new Date(refreshTokenExpiresAt).getTime();
        const currentTime = Date.now();
        
        // Consider token expired if it expires within the next 5 minutes
        return currentTime >= (expirationTime - 5 * 60 * 1000);
      },
      };
    },
    {
      name: 'supermock-auth',
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
      partialize: (state) => ({ 
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
