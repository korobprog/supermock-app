import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { UserDto } from '../../../shared/src/types/user.js';

interface NotificationPreferencesState {
  upcomingSessions: boolean;
  newMatches: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesState = {
  upcomingSessions: true,
  newMatches: true,
  productUpdates: false,
  securityAlerts: true,
};

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  locale?: string | null;
  timezone?: string | null;
  profile?: Record<string, unknown> | null;
  notificationPreferences: NotificationPreferencesState;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthData: (accessToken: string, user: UserDto | AuthUser) => void;
  updateUserProfile: (updates: Partial<AuthUser>) => void;
  setUserFromDto: (user: UserDto) => void;
}

function resolveNotificationPreferences(
  profile: Record<string, unknown> | null | undefined
): NotificationPreferencesState {
  const base: NotificationPreferencesState = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  if (profile && typeof profile === 'object') {
    const raw = (profile as { notificationPreferences?: unknown }).notificationPreferences;

    if (raw && typeof raw === 'object') {
      (Object.keys(base) as Array<keyof NotificationPreferencesState>).forEach((key) => {
        const value = (raw as Record<string, unknown>)[key];
        if (typeof value === 'boolean') {
          base[key] = value;
        }
      });
    }
  }

  return base;
}

function normalizeUser(user: UserDto | AuthUser): AuthUser {
  if (isAuthUser(user)) {
    return {
      ...user,
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...user.notificationPreferences,
      },
    } satisfies AuthUser;
  }

  const profile = user.profile && typeof user.profile === 'object'
    ? (user.profile as Record<string, unknown>)
    : null;

  const notificationPreferences = resolveNotificationPreferences(profile);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    avatarUrl: user.avatarUrl ?? null,
    displayName: typeof profile?.displayName === 'string' ? (profile.displayName as string) : null,
    locale: typeof profile?.locale === 'string' ? (profile.locale as string) : null,
    timezone: typeof profile?.timezone === 'string' ? (profile.timezone as string) : null,
    profile: profile ?? null,
    notificationPreferences,
  } satisfies AuthUser;
}

function isAuthUser(user: UserDto | AuthUser): user is AuthUser {
  return Boolean((user as AuthUser).notificationPreferences);
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

          const normalizedUser = normalizeUser(data.user);

          set({
            accessToken: data.tokens.accessToken,
            user: normalizedUser,
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

      setAuthData: (accessToken: string, user: UserDto | AuthUser) => {
        set({
          accessToken,
          user: normalizeUser(user),
          isAuthenticated: true,
        });
      },

      updateUserProfile: (updates: Partial<AuthUser>) => {
        set((state) => {
          if (!state.user) {
            return {};
          }

          const nextProfile =
            updates.profile !== undefined ? (updates.profile ?? null) : state.user.profile;

          const nextPreferences = updates.notificationPreferences
            ? {
                ...state.user.notificationPreferences,
                ...updates.notificationPreferences,
              }
            : state.user.notificationPreferences;

          return {
            user: {
              ...state.user,
              ...updates,
              profile: nextProfile,
              notificationPreferences: nextPreferences,
            },
          } satisfies Partial<AuthState>;
        });
      },

      setUserFromDto: (userDto: UserDto) => {
        set((state) => ({
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
          user: normalizeUser(userDto),
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
