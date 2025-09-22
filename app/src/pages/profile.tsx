import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  changePassword,
  deleteAccount,
  exportUserData,
  fetchActivityHistory,
  fetchNotificationPreferences,
  fetchUserProfile,
  updateNotificationPreferences,
  updateProfile,
  uploadAvatar,
  type ActivityEntryDto,
  type ActivityHistoryResponse,
  type NotificationPreferencesDto,
  type ProfileRecord
} from '@/lib/api';
import { useAuth } from '@/store/useAuth';

type ProfileFormState = {
  displayName: string;
  bio: string;
  locale: string;
  timezone: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function normalizeNotificationPreferences(value: unknown): NotificationPreferencesDto {
  const base: NotificationPreferencesDto = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  if (value && typeof value === 'object') {
    (Object.keys(base) as Array<keyof NotificationPreferencesDto>).forEach((key) => {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === 'boolean') {
        base[key] = candidate;
      }
    });
  }

  return base;
}

function cloneProfileRecord(value: ProfileRecord | null | undefined): ProfileRecord {
  if (!value) {
    return {} as ProfileRecord;
  }

  return { ...(value as Record<string, unknown>) } as ProfileRecord;
}

function getProfileString(record: ProfileRecord | null | undefined, key: keyof ProfileFormState) {
  if (!record) {
    return '';
  }

  const candidate = (record as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : '';
}

function buildProfileUpdate(
  current: ProfileRecord | null,
  form: ProfileFormState,
  preferences: NotificationPreferencesDto
): ProfileRecord {
  const next: ProfileRecord = { ...(current ?? {}) };
  const displayName = form.displayName.trim();
  const timezone = form.timezone.trim();
  const locale = form.locale.trim();
  const bio = form.bio.trim();

  next.displayName = displayName || null;
  next.timezone = timezone || null;
  next.locale = locale || null;
  next.bio = bio || null;
  next.notificationPreferences = { ...preferences };

  return next;
}

function toReadableActivityType(type: string) {
  return type
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuth((state) => state.user);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const updateUserProfile = useAuth((state) => state.updateUserProfile);
  const setUserFromDto = useAuth((state) => state.setUserFromDto);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    displayName: '',
    bio: '',
    locale: '',
    timezone: ''
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentProfile, setCurrentProfile] = useState<ProfileRecord | null>(null);

  const [notificationForm, setNotificationForm] = useState<NotificationPreferencesDto>({
    ...DEFAULT_NOTIFICATION_PREFERENCES
  });
  const [notificationDirty, setNotificationDirty] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000
  });

  const notificationQuery = useQuery({
    queryKey: ['profile', user?.id, 'notification-preferences'],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: Boolean(user?.id)
  });

  const activityQuery = useInfiniteQuery<ActivityHistoryResponse, Error>({
    queryKey: ['profile', user?.id ?? 'self', 'activity'],
    queryFn: ({ pageParam }) =>
      fetchActivityHistory(user!.id, {
        cursor: (pageParam as string | undefined) ?? undefined,
        limit: 10
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: Boolean(user?.id)
  });

  useEffect(() => {
    if (!user) {
      setProfileForm({ displayName: '', bio: '', locale: '', timezone: '' });
      setProfileDirty(false);
      setCurrentProfile(null);
      setNotificationForm({ ...DEFAULT_NOTIFICATION_PREFERENCES });
      setNotificationDirty(false);
      setAvatarPreview(null);
      setAvatarMessage(null);
      setAvatarError(null);
    }
  }, [user]);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    const profileRecord = cloneProfileRecord(profileQuery.data.profile as ProfileRecord | null);
    setCurrentProfile(profileRecord);

    if (!profileDirty) {
      setProfileForm({
        displayName: getProfileString(profileRecord, 'displayName'),
        bio: getProfileString(profileRecord, 'bio'),
        locale: getProfileString(profileRecord, 'locale'),
        timezone: getProfileString(profileRecord, 'timezone')
      });
    }

    if (!notificationQuery.isSuccess && !notificationDirty) {
      setNotificationForm(normalizeNotificationPreferences(profileRecord.notificationPreferences));
    }

    setAvatarPreview(profileQuery.data.avatarUrl ?? null);
  }, [profileQuery.data, profileDirty, notificationQuery.isSuccess, notificationDirty]);

  useEffect(() => {
    if (!notificationQuery.data) {
      return;
    }

    const preferences = normalizeNotificationPreferences(notificationQuery.data.preferences);
    setNotificationForm(preferences);
    setNotificationDirty(false);
    setNotificationMessage(null);
    setNotificationError(null);
    setCurrentProfile((prev) => {
      const next = { ...(prev ?? {}) } as ProfileRecord;
      next.notificationPreferences = { ...preferences };
      return next;
    });
  }, [notificationQuery.data]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (profile: ProfileRecord | null) => updateProfile(user!.id, { profile }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['profile', user!.id], updatedUser);
      setUserFromDto(updatedUser);

      const profileRecord = cloneProfileRecord(updatedUser.profile as ProfileRecord | null);
      setCurrentProfile(profileRecord);
      setProfileForm({
        displayName: getProfileString(profileRecord, 'displayName'),
        bio: getProfileString(profileRecord, 'bio'),
        locale: getProfileString(profileRecord, 'locale'),
        timezone: getProfileString(profileRecord, 'timezone')
      });

      const preferences = normalizeNotificationPreferences(profileRecord.notificationPreferences);
      setNotificationForm(preferences);
      setNotificationDirty(false);
      queryClient.setQueryData(['profile', user!.id, 'notification-preferences'], {
        preferences,
        updatedAt: new Date().toISOString()
      });

      setProfileDirty(false);
      setProfileMessage('Профиль обновлён.');
      setProfileError(null);
    },
    onError: (error) => {
      setProfileError(error instanceof Error ? error.message : 'Не удалось обновить профиль');
      setProfileMessage(null);
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(user!.id, file),
    onSuccess: (result) => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }

      setAvatarPreview(result.avatarUrl);
      setAvatarMessage('Аватар обновлён.');
      setAvatarError(null);
      updateUserProfile({ avatarUrl: result.avatarUrl });
      queryClient.setQueryData(['profile', user!.id], (existing) => {
        if (!existing) {
          return existing;
        }
        return { ...existing, avatarUrl: result.avatarUrl };
      });
    },
    onError: (error) => {
      setAvatarError(error instanceof Error ? error.message : 'Не удалось загрузить аватар');
      setAvatarMessage(null);
    }
  });

  const notificationMutation = useMutation({
    mutationFn: (preferences: NotificationPreferencesDto) =>
      updateNotificationPreferences(user!.id, preferences),
    onSuccess: (response) => {
      const preferences = normalizeNotificationPreferences(response.preferences);
      setNotificationForm(preferences);
      setNotificationDirty(false);
      setNotificationMessage('Настройки уведомлений обновлены.');
      setNotificationError(null);

      const nextProfile = { ...(currentProfile ?? {}) } as ProfileRecord;
      nextProfile.notificationPreferences = { ...preferences };
      setCurrentProfile(nextProfile);
      updateUserProfile({ notificationPreferences: preferences, profile: nextProfile });

      queryClient.setQueryData(['profile', user!.id, 'notification-preferences'], {
        preferences,
        updatedAt: response.updatedAt ?? new Date().toISOString()
      });
    },
    onError: (error) => {
      setNotificationError(
        error instanceof Error ? error.message : 'Не удалось обновить настройки уведомлений'
      );
      setNotificationMessage(null);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      changePassword(user!.id, payload),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Пароль обновлён.');
      setPasswordError(null);
    },
    onError: (error) => {
      setPasswordError(error instanceof Error ? error.message : 'Не удалось сменить пароль');
      setPasswordMessage(null);
    }
  });

  const handleExport = async () => {
    if (!user) {
      setExportError('Авторизуйтесь, чтобы выгрузить данные.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportUserData(user.id);
      const mimeType = blob.type?.toLowerCase?.() ?? 'application/json';
      const extension = mimeType.includes('gzip') ? 'json.gz' : 'json';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `supermock-user-export-${timestamp}.${extension}`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Не удалось выгрузить данные');
    } finally {
      setIsExporting(false);
    }
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setProfileError('Не удалось определить пользователя.');
      return;
    }

    const nextProfile = buildProfileUpdate(currentProfile, profileForm, notificationForm);
    setProfileMessage(null);
    setProfileError(null);
    updateProfileMutation.mutate(nextProfile);
  };

  const handleProfileReset = () => {
    setProfileForm({
      displayName: getProfileString(currentProfile, 'displayName'),
      bio: getProfileString(currentProfile, 'bio'),
      locale: getProfileString(currentProfile, 'locale'),
      timezone: getProfileString(currentProfile, 'timezone')
    });
    setProfileDirty(false);
    setProfileMessage(null);
    setProfileError(null);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Поддерживаются только изображения форматов PNG, JPG или WEBP.');
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setAvatarMessage(null);
    setAvatarError(null);

    if (!user) {
      setAvatarError('Не удалось определить пользователя.');
      return;
    }

    uploadAvatarMutation.mutate(file);
  };

  const handleNotificationToggle = (key: keyof NotificationPreferencesDto) => {
    setNotificationForm((prev) => {
      const next = { ...prev, [key]: !prev[key] } as NotificationPreferencesDto;
      setNotificationDirty(true);
      setNotificationMessage(null);
      setNotificationError(null);
      return next;
    });
  };

  const handleNotificationReset = () => {
    const base = normalizeNotificationPreferences(currentProfile?.notificationPreferences);
    setNotificationForm(base);
    setNotificationDirty(false);
    setNotificationMessage(null);
    setNotificationError(null);
  };

  const handleNotificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setNotificationError('Не удалось определить пользователя.');
      return;
    }

    setNotificationError(null);
    setNotificationMessage(null);
    notificationMutation.mutate({ ...notificationForm });
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (!user) {
      setPasswordError('Не удалось определить пользователя.');
      return;
    }

    const currentValue = passwordForm.currentPassword.trim();
    const newValue = passwordForm.newPassword.trim();
    const confirmValue = passwordForm.confirmPassword.trim();

    if (!currentValue || !newValue || !confirmValue) {
      setPasswordError('Заполните все поля формы.');
      return;
    }

    if (newValue.length < 8) {
      setPasswordError('Новый пароль должен содержать минимум 8 символов.');
      return;
    }

    if (newValue !== confirmValue) {
      setPasswordError('Подтверждение пароля не совпадает.');
      return;
    }

    if (currentValue === newValue) {
      setPasswordError('Новый пароль должен отличаться от текущего.');
      return;
    }

    changePasswordMutation.mutate({ currentPassword: currentValue, newPassword: newValue });
  };

  const openDeleteModal = () => {
    setDeleteError(null);
    setPassword('');
    setToken('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user) {
      setDeleteError('Не удалось определить пользователя.');
      return;
    }

    const passwordValue = password.trim();
    const tokenValue = token.trim();

    if (!passwordValue && !tokenValue) {
      setDeleteError('Введите пароль или одноразовый токен.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount(user.id, {
        password: passwordValue || undefined,
        token: tokenValue || undefined
      });

      setShowDeleteModal(false);
      setPassword('');
      setToken('');
      useAuth.getState().logout();
      await router.replace('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Не удалось удалить аккаунт');
    } finally {
      setIsDeleting(false);
    }
  };

  const activityItems =
    activityQuery.data?.pages.flatMap((page: ActivityHistoryResponse) => page.items) ?? [];

  return (
    <>
      <Head>
        <title>Профиль — SuperMock</title>
      </Head>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h1 className="text-2xl font-semibold text-white">Профиль</h1>
          {isAuthenticated && user ? (
            <p className="mt-2 text-sm text-slate-400">
              Вход выполнен для {user.email}
              {user.displayName ? ` · ${user.displayName}` : ''}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Авторизуйтесь, чтобы управлять личными данными.</p>
          )}
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Настройки профиля</h2>
          {profileQuery.isError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              Не удалось загрузить профиль: {profileQuery.error instanceof Error ? profileQuery.error.message : 'ошибка' }
            </p>
          )}
          <form onSubmit={handleProfileSubmit} className="mt-4 grid gap-6 md:grid-cols-[auto,1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-700 bg-slate-950 shadow-inner shadow-slate-950/40">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Аватар пользователя" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">Нет аватара</div>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={!user || uploadAvatarMutation.isPending}
                />
                {uploadAvatarMutation.isPending ? 'Загрузка…' : 'Обновить аватар'}
              </label>
              {avatarMessage && <p className="text-xs text-emerald-300">{avatarMessage}</p>}
              {avatarError && (
                <p className="text-xs text-red-400" role="alert">
                  {avatarError}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="profile-display-name">
                  Имя и фамилия
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={profileForm.displayName}
                  onChange={(event) => {
                    setProfileForm((prev) => ({ ...prev, displayName: event.target.value }));
                    setProfileDirty(true);
                    setProfileMessage(null);
                    setProfileError(null);
                  }}
                  placeholder="Например, Анастасия Иванова"
                  disabled={!user || updateProfileMutation.isPending}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="profile-timezone">
                    Часовой пояс
                  </label>
                <input
                  id="profile-timezone"
                  type="text"
                  value={profileForm.timezone}
                  onChange={(event) => {
                    setProfileForm((prev) => ({ ...prev, timezone: event.target.value }));
                    setProfileDirty(true);
                    setProfileMessage(null);
                    setProfileError(null);
                  }}
                    placeholder="Например, Europe/Moscow"
                    disabled={!user || updateProfileMutation.isPending}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="profile-locale">
                    Язык интерфейса
                  </label>
                <input
                  id="profile-locale"
                  type="text"
                  value={profileForm.locale}
                  onChange={(event) => {
                    setProfileForm((prev) => ({ ...prev, locale: event.target.value }));
                    setProfileDirty(true);
                    setProfileMessage(null);
                    setProfileError(null);
                  }}
                    placeholder="Например, ru-RU"
                    disabled={!user || updateProfileMutation.isPending}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="profile-bio">
                  Кратко о себе
                </label>
                <textarea
                  id="profile-bio"
                  value={profileForm.bio}
                  onChange={(event) => {
                    setProfileForm((prev) => ({ ...prev, bio: event.target.value }));
                    setProfileDirty(true);
                    setProfileMessage(null);
                    setProfileError(null);
                  }}
                  placeholder="Расскажите, чем вы занимаетесь"
                  disabled={!user || updateProfileMutation.isPending}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
              </div>
              {profileError && (
                <p className="text-sm text-red-400" role="alert">
                  {profileError}
                </p>
              )}
              {profileMessage && <p className="text-sm text-emerald-300">{profileMessage}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleProfileReset}
                  disabled={!user || updateProfileMutation.isPending}
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  disabled={!user || updateProfileMutation.isPending || !profileDirty}
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateProfileMutation.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Настройки уведомлений</h2>
          {notificationQuery.isLoading && (
            <p className="mt-3 text-sm text-slate-400">Загружаем настройки…</p>
          )}
          {notificationQuery.isError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              Не удалось загрузить настройки уведомлений.
            </p>
          )}
          <form onSubmit={handleNotificationSubmit} className="mt-4 space-y-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-secondary focus:ring-secondary/60"
                  checked={notificationForm.upcomingSessions}
                  onChange={() => handleNotificationToggle('upcomingSessions')}
                  disabled={!user || notificationMutation.isPending}
                />
                <span className="text-sm text-slate-200">
                  Напоминать о предстоящих интервью и репетициях
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-secondary focus:ring-secondary/60"
                  checked={notificationForm.newMatches}
                  onChange={() => handleNotificationToggle('newMatches')}
                  disabled={!user || notificationMutation.isPending}
                />
                <span className="text-sm text-slate-200">
                  Получать уведомления о новых подборках и совпадениях
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-secondary focus:ring-secondary/60"
                  checked={notificationForm.productUpdates}
                  onChange={() => handleNotificationToggle('productUpdates')}
                  disabled={!user || notificationMutation.isPending}
                />
                <span className="text-sm text-slate-200">Новости платформы и обновления продукта</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-secondary focus:ring-secondary/60"
                  checked={notificationForm.securityAlerts}
                  onChange={() => handleNotificationToggle('securityAlerts')}
                  disabled={!user || notificationMutation.isPending}
                />
                <span className="text-sm text-slate-200">Предупреждения о безопасности и входах в аккаунт</span>
              </label>
            </div>
            {notificationError && (
              <p className="text-sm text-red-400" role="alert">
                {notificationError}
              </p>
            )}
            {notificationMessage && <p className="text-sm text-emerald-300">{notificationMessage}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleNotificationReset}
                disabled={!user || notificationMutation.isPending}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Сбросить
              </button>
              <button
                type="submit"
                disabled={!user || notificationMutation.isPending || !notificationDirty}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {notificationMutation.isPending ? 'Сохраняем…' : 'Обновить настройки'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Смена пароля</h2>
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-current">
                Текущий пароль
              </label>
              <input
                id="password-current"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) => {
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }));
                  setPasswordError(null);
                  setPasswordMessage(null);
                }}
                disabled={!user || changePasswordMutation.isPending}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-new">
                  Новый пароль
                </label>
                <input
                  id="password-new"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) => {
                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }));
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  disabled={!user || changePasswordMutation.isPending}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-confirm">
                  Подтверждение
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => {
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }));
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  disabled={!user || changePasswordMutation.isPending}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-red-400" role="alert">
                {passwordError}
              </p>
            )}
            {passwordMessage && <p className="text-sm text-emerald-300">{passwordMessage}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!user || changePasswordMutation.isPending}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changePasswordMutation.isPending ? 'Обновляем…' : 'Сменить пароль'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">История активности</h2>
          {!isAuthenticated || !user ? (
            <p className="mt-3 text-sm text-slate-400">Авторизуйтесь, чтобы увидеть историю действий.</p>
          ) : activityQuery.isLoading ? (
            <p className="mt-3 text-sm text-slate-400">Загружаем события…</p>
          ) : activityQuery.isError ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              Не удалось загрузить историю активности.
            </p>
          ) : activityItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">История активности пока пуста.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activityItems.map((entry: ActivityEntryDto) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow shadow-slate-950/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {entry.title ?? toReadableActivityType(entry.type)}
                    </span>
                    <time className="text-xs text-slate-500" dateTime={entry.createdAt}>
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  {entry.description && (
                    <p className="mt-2 text-sm text-slate-300">{entry.description}</p>
                  )}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <pre className="mt-3 max-h-40 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
          {activityQuery.hasNextPage && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => activityQuery.fetchNextPage()}
                disabled={activityQuery.isFetchingNextPage}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activityQuery.isFetchingNextPage ? 'Загружаем…' : 'Показать ещё'}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Управление данными</h2>
          <p className="mt-2 text-sm text-slate-400">
            Вы можете выгрузить копию профиля, включая анкеты кандидата и интервьюера, а также сохранённые уведомления.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={!user || isExporting}
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Формируем архив…' : 'Выгрузить данные'}
            </button>
            <span className="text-xs text-slate-500">
              Файл будет сохранён в формате JSON. Для архива укажите параметр «format=zip».
            </span>
          </div>

          {exportError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {exportError}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Удаление аккаунта</p>
            <p className="mt-2 text-amber-100/80">
              Все данные, включая анкеты и уведомления, будут безвозвратно удалены. Для подтверждения требуется пароль или одноразовый токен подтверждения.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={!user}
                className="inline-flex items-center gap-2 rounded-md border border-red-500/70 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Удалить аккаунт
              </button>
              <span className="text-xs text-amber-200/80">
                После подтверждения токены будут отозваны, активные сессии завершатся.
              </span>
            </div>
          </div>
        </section>

        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/70"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="delete-account-title" className="text-lg font-semibold text-white">
                Подтверждение удаления
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Подтвердите, что хотите удалить учётную запись. Укажите текущий пароль или одноразовый токен подтверждения.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="delete-password">
                    Пароль
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (deleteError) {
                        setDeleteError(null);
                      }
                    }}
                    placeholder="Введите пароль"
                    disabled={isDeleting}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="delete-token">
                    Одноразовый токен
                  </label>
                  <input
                    id="delete-token"
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value);
                      if (deleteError) {
                        setDeleteError(null);
                      }
                    }}
                    placeholder="Вставьте полученный токен"
                    disabled={isDeleting}
                  />
                  <p className="mt-1 text-xs text-slate-500">Можно заполнить только одно поле: пароль или токен.</p>
                </div>
              </div>

              {deleteError && (
                <p className="mt-3 text-sm text-red-400" role="alert">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-red-900/50 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Удаляем…' : 'Удалить аккаунт'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
