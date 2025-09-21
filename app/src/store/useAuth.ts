import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
  } | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthData: (accessToken: string, user: AuthState['user']) => void;
  updateUser: (user: AuthState['user']) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
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
          user: null,
          isAuthenticated: false,
        });
      },

      setAuthData: (accessToken: string, user: AuthState['user']) => {
        set({
          accessToken,
          user,
          isAuthenticated: true,
        });
      },

      updateUser: (user: AuthState['user']) => {
        set((state) => ({
          user,
          isAuthenticated: user ? true : state.isAuthenticated && Boolean(state.accessToken),
        }));
      },
    }),
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
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
