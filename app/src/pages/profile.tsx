import Head from 'next/head';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BoltIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

import NotificationToggle from '@/components/profile/NotificationToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchUser, type UpdateUserPayload, updateUser } from '@/lib/api';
import { useAuth } from '@/store/useAuth';

const DEFAULT_CHANNELS: Record<string, boolean> = {
  telegram: false,
  email: false,
  push: false
};

type NotificationSettingsShape = {
  channels: Record<string, boolean>;
  updatedAt?: string;
};

function parseNotificationSettings(
  profile: Record<string, unknown> | null | undefined
): NotificationSettingsShape {
  const settings = ((profile as { notificationSettings?: Record<string, unknown> } | null)?.notificationSettings ?? {}) as Record<string, unknown>;
  const channels = (settings.channels as Record<string, boolean> | undefined) ?? {};

  return {
    channels: { ...DEFAULT_CHANNELS, ...channels },
    updatedAt: typeof settings.updatedAt === 'string' ? settings.updatedAt : undefined
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [channelError, setChannelError] = useState<string | null>(null);

  const {
    notifications,
    filteredNotifications,
    groupedNotifications,
    filters,
    setFilters,
    isLoading: isNotificationsLoading,
    isRefreshing,
    isFetchingMore,
    isMarking,
    hasMore,
    unreadCount,
    importantCount,
    channelStats,
    connectionStatus,
    wsError,
    loadError,
    lastSyncedAt,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    reconnect
  } = useNotifications({ initialLimit: 30 });

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUser(user!.id),
    enabled: Boolean(user?.id)
  });

  const notificationSettings = useMemo(
    () => parseNotificationSettings(profileQuery.data?.profile as Record<string, unknown> | null | undefined),
    [profileQuery.data?.profile]
  );

  const updateChannelsMutation = useMutation({
    mutationFn: async (nextChannels: Record<string, boolean>) => {
      if (!user?.id) {
        throw new Error('Необходимо войти в аккаунт');
      }

      const currentProfile = ((profileQuery.data?.profile ?? {}) as Record<string, unknown>) ?? {};
      const currentSettings = ((currentProfile.notificationSettings as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;

      const payload: UpdateUserPayload = {
        profile: {
          ...currentProfile,
          notificationSettings: {
            ...currentSettings,
            channels: nextChannels,
            updatedAt: new Date().toISOString()
          }
        }
      };

      return updateUser(user.id, payload);
    },
    onSuccess: (data) => {
      if (!user?.id) {
        return;
      }

      queryClient.setQueryData(['profile', user.id], data);
      setChannelError(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить настройки каналов';
      setChannelError(message);
    }
  });

  const handleChannelToggle = async (channel: string, nextValue: boolean) => {
    const nextChannels = { ...notificationSettings.channels, [channel]: nextValue };
    await updateChannelsMutation.mutateAsync(nextChannels);
  };

  const channelNotificationIds = useMemo(() => {
    const result: Record<string, string[]> = {};

    for (const notification of notifications) {
      const key = notification.channel ?? 'in-app';
      if (!result[key]) {
        result[key] = [];
      }

      if (!notification.isRead) {
        result[key].push(notification.id);
      }
    }

    return result;
  }, [notifications]);

  const filteredUnreadIds = useMemo(
    () => filteredNotifications.filter((item) => !item.isRead).map((item) => item.id),
    [filteredNotifications]
  );

  const lastSyncedLabel = lastSyncedAt
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(lastSyncedAt)
    : null;

  const connectionColor = {
    open: 'text-emerald-400',
    connecting: 'text-amber-300',
    closed: 'text-slate-400',
    error: 'text-rose-400',
    idle: 'text-slate-400'
  }[connectionStatus];

  return (
    <>
      <Head>
        <title>Профиль — уведомления | SuperMock</title>
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 pb-16 text-white">
        <div className="mx-auto w-full max-w-6xl px-6 pt-16">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Профиль</p>
              <h1 className="mt-2 text-3xl font-semibold">Центр уведомлений</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Управляйте каналами связи и оперативно просматривайте ключевые события: новые матчи,
                обновления расписания и системные сообщения. Отмечайте уведомления как прочитанные в один клик и не
                упускайте важное.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
              <div className={`flex items-center gap-2 ${connectionColor}`}>
                <SignalIcon className="h-4 w-4" />
                <span className="font-semibold uppercase tracking-wide">{connectionStatus}</span>
              </div>
              {lastSyncedLabel && <span>Обновлено: {lastSyncedLabel}</span>}
              {isRefreshing && <span>Синхронизация…</span>}
            </div>
          </header>

          {wsError && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>{wsError}</span>
              </div>
              <button
                type="button"
                onClick={reconnect}
                className="rounded-full border border-amber-400/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
              >
                Переподключить
              </button>
            </div>
          )}

          {loadError && (
            <div className="mt-6 rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {loadError}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[380px_1fr]">
            <aside className="flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm shadow-slate-950/50">
                <h2 className="text-lg font-semibold">Каналы уведомлений</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Выберите, где хотите получать обновления. Отключение канала не влияет на историю уведомлений.
                </p>
                <div className="mt-6 space-y-3">
                  <NotificationToggle
                    channel="telegram"
                    label="Telegram"
                    description="Моментальные сообщения от бота SuperMock"
                    enabled={notificationSettings.channels.telegram}
                    unreadCount={channelStats.telegram?.unread ?? 0}
                    notificationIds={channelNotificationIds.telegram ?? []}
                    onToggle={(next) => handleChannelToggle('telegram', next)}
                    onMarkRead={async (ids) => {
                      await markAsRead(ids);
                    }}
                    isSaving={updateChannelsMutation.isPending}
                    isMarking={isMarking}
                  />
                  <NotificationToggle
                    channel="email"
                    label="Email"
                    description="Ежедневная сводка и результаты матчей"
                    enabled={notificationSettings.channels.email}
                    unreadCount={channelStats.email?.unread ?? 0}
                    notificationIds={channelNotificationIds.email ?? []}
                    onToggle={(next) => handleChannelToggle('email', next)}
                    onMarkRead={async (ids) => {
                      await markAsRead(ids);
                    }}
                    isSaving={updateChannelsMutation.isPending}
                    isMarking={isMarking}
                  />
                  <NotificationToggle
                    channel="push"
                    label="Push"
                    description="Браузерные уведомления о назначениях и изменениях"
                    enabled={notificationSettings.channels.push}
                    unreadCount={channelStats.push?.unread ?? 0}
                    notificationIds={channelNotificationIds.push ?? []}
                    onToggle={(next) => handleChannelToggle('push', next)}
                    onMarkRead={async (ids) => {
                      await markAsRead(ids);
                    }}
                    isSaving={updateChannelsMutation.isPending}
                    isMarking={isMarking}
                  />
                </div>
                {channelError && (
                  <p className="mt-3 text-xs text-rose-300">{channelError}</p>
                )}
                {notificationSettings.updatedAt && (
                  <p className="mt-3 text-xs text-slate-500">
                    Обновлено: {formatDateTime(notificationSettings.updatedAt)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300 shadow-sm shadow-slate-950/40">
                <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                  <BoltIcon className="h-5 w-5 text-secondary" />
                  Краткая статистика
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li>Всего уведомлений: {notifications.length}</li>
                  <li>Непрочитанные: {unreadCount}</li>
                  <li>Важные непрочитанные: {importantCount}</li>
                </ul>
              </div>
            </aside>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm shadow-slate-950/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Лента уведомлений</h2>
                  <p className="text-sm text-slate-400">
                    Просматривайте историю событий, фильтруйте по важности и отмечайте уведомления прочитанными.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilters((previous) => ({
                      ...previous,
                      unreadOnly: !previous.unreadOnly
                    }))}
                    className={`rounded-full border px-3 py-1 font-semibold transition ${
                      filters.unreadOnly
                        ? 'border-secondary/70 bg-secondary/10 text-secondary'
                        : 'border-slate-700 text-slate-300 hover:border-secondary/40 hover:text-secondary'
                    }`}
                  >
                    Только непрочитанные ({unreadCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters((previous) => ({
                      ...previous,
                      importantOnly: !previous.importantOnly
                    }))}
                    className={`rounded-full border px-3 py-1 font-semibold transition ${
                      filters.importantOnly
                        ? 'border-amber-400/80 bg-amber-400/10 text-amber-200'
                        : 'border-slate-700 text-slate-300 hover:border-amber-300/60 hover:text-amber-200'
                    }`}
                  >
                    Важные ({importantCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-300 transition hover:border-secondary/40 hover:text-secondary"
                  >
                    Обновить
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => markAsRead(filteredUnreadIds)}
                  disabled={filteredUnreadIds.length === 0 || isMarking}
                  className="rounded-lg bg-secondary px-4 py-2 font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-secondary/40"
                >
                  Прочитано
                </button>
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  disabled={notifications.length === 0 || isMarking}
                  className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-200 transition hover:border-secondary/50 hover:text-secondary disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                >
                  Отметить всё
                </button>
              </div>

              {isNotificationsLoading && (
                <div className="mt-6 text-sm text-slate-400">Загружаем историю уведомлений…</div>
              )}

              {!isNotificationsLoading && groupedNotifications.length === 0 && (
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-6 py-10 text-center text-sm text-slate-400">
                  У вас пока нет уведомлений по выбранным фильтрам.
                </div>
              )}

              <div className="mt-6 space-y-6">
                {groupedNotifications.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <span>{group.date}</span>
                      <span className="h-px flex-1 bg-slate-800" />
                    </div>
                    <ul className="space-y-3">
                      {group.items.map((notification) => (
                        <li
                          key={notification.id}
                          className={`rounded-xl border px-4 py-3 transition ${
                            notification.isRead
                              ? 'border-slate-800 bg-slate-950/40'
                              : 'border-secondary/40 bg-secondary/5'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{notification.title}</p>
                              <p className="mt-1 text-sm text-slate-300">{notification.description}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                                <span>{notification.timeLabel}</span>
                                {notification.channel && (
                                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                                    {notification.channel}
                                  </span>
                                )}
                                {notification.source && (
                                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                                    {notification.source}
                                  </span>
                                )}
                                {notification.importance === 'high' && (
                                  <span className="flex items-center gap-1 rounded-full border border-amber-400 px-2 py-0.5 text-[10px] text-amber-200">
                                    <ExclamationTriangleIcon className="h-3 w-3" /> Важно
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => markAsRead([notification.id])}
                                disabled={notification.isRead || isMarking}
                                className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition ${
                                  notification.isRead
                                    ? 'border border-slate-700 text-slate-500'
                                    : 'border border-secondary/70 text-secondary hover:border-secondary hover:text-secondary/90'
                                }`}
                              >
                                <CheckIcon className="h-4 w-4" />
                                {notification.isRead ? 'Прочитано' : 'Отметить'}
                              </button>
                              <span className="text-slate-500">Создано: {notification.createdAtLabel}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadMore()}
                    disabled={isFetchingMore}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-secondary/60 hover:text-secondary disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                  >
                    {isFetchingMore ? 'Загружаем…' : 'Загрузить ещё'}
                  </button>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
