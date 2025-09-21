import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchNotifications,
  formatNotification,
  markNotificationsRead,
  subscribeToNotifications,
  type FormattedNotification,
  type NotificationSubscription
} from '@/lib/api';
import type { NotificationDto } from '../../../shared/src/types/realtime.js';

export type NotificationConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export type NotificationFilters = {
  unreadOnly: boolean;
  importantOnly: boolean;
};

export type NotificationGroup = {
  date: string;
  items: FormattedNotification[];
};

type ChannelStats = Record<string, { total: number; unread: number }>;

type UseNotificationsOptions = {
  initialLimit?: number;
  filters?: Partial<NotificationFilters>;
};

const DEFAULT_LIMIT = 20;

function mergeNotifications(
  current: FormattedNotification[],
  incoming: FormattedNotification[]
) {
  if (incoming.length === 0) {
    return current;
  }

  const map = new Map(current.map((item) => [item.id, item] as const));

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const limitRef = useRef(options.initialLimit ?? DEFAULT_LIMIT);
  const isMountedRef = useRef(false);
  const subscriptionRef = useRef<NotificationSubscription | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifications, setNotifications] = useState<FormattedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wsError, setWsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<NotificationConnectionStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    unreadOnly: options.filters?.unreadOnly ?? false,
    importantOnly: options.filters?.importantOnly ?? false
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await fetchNotifications({ limit: limitRef.current });
      if (!isMountedRef.current) {
        return;
      }

      setNotifications(data.map((item) => formatNotification(item)));
      setHasMore(data.length === limitRef.current);
      setLastSyncedAt(new Date());
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить уведомления';
      setLoadError(message);
      setWsError(message);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const data = await fetchNotifications({ limit: limitRef.current });
      if (!isMountedRef.current) {
        return;
      }

      setNotifications((current) =>
        mergeNotifications(
          current,
          data.map((item) => formatNotification(item))
        )
      );
      setHasMore(data.length === limitRef.current);
      setLastSyncedAt(new Date());
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Не удалось обновить список уведомлений';
      setWsError(message);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  const handleRealtimeNotification = useCallback(
    (notification: NotificationDto) => {
      setNotifications((current) => {
        const formatted = formatNotification(notification);
        const exists = current.find((item) => item.id === formatted.id);

        if (!exists) {
          return [formatted, ...current].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
        }

        return current.map((item) =>
          item.id === formatted.id ? { ...item, ...formatted } : item
        );
      });
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadInitial();

    return () => {
      isMountedRef.current = false;
      clearReconnectTimer();
      subscriptionRef.current?.close();
    };
  }, [clearReconnectTimer, loadInitial]);

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }

    clearReconnectTimer();
    subscriptionRef.current?.close();

    setConnectionStatus('connecting');
    setWsError(null);

    const subscription = subscribeToNotifications({
      onNotification: handleRealtimeNotification,
      onOpen: () => {
        setConnectionStatus('open');
        setWsError(null);
      },
      onClose: () => {
        setConnectionStatus('closed');
        setWsError('Соединение с уведомлениями закрыто');
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }

          subscriptionRef.current?.reconnect();
        }, 5000);
        void refreshLatest();
      },
      onError: (error) => {
        setConnectionStatus('error');
        const message = error.message || 'Ошибка подключения к уведомлениям';
        setWsError(message);
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }

          subscriptionRef.current?.reconnect();
        }, 5000);
        void refreshLatest();
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      subscription.close();
    };
  }, [clearReconnectTimer, handleRealtimeNotification, refreshLatest]);

  const loadMore = useCallback(async () => {
    if (isFetchingMore || notifications.length === 0) {
      return;
    }

    setIsFetchingMore(true);

    try {
      const lastNotification = notifications[notifications.length - 1];
      const cursor = lastNotification?.raw.createdAt ?? lastNotification?.createdAtIso;
      const data = await fetchNotifications({
        limit: limitRef.current,
        before: cursor
      });

      if (!isMountedRef.current) {
        return;
      }

      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      setNotifications((current) =>
        mergeNotifications(
          current,
          data.map((item) => formatNotification(item))
        )
      );
      setHasMore(data.length === limitRef.current);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить историю уведомлений';
      setWsError(message);
    } finally {
      if (isMountedRef.current) {
        setIsFetchingMore(false);
      }
    }
  }, [isFetchingMore, notifications]);

  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return 0;
      }

      setIsMarking(true);

      try {
        const { updated } = await markNotificationsRead({ notificationIds });

        if (!isMountedRef.current) {
          return updated;
        }

        setNotifications((current) =>
          current.map((item) =>
            notificationIds.includes(item.id)
              ? { ...item, isRead: true, readAt: new Date() }
              : item
          )
        );

        return updated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось обновить статус уведомлений';
        setWsError(message);
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsMarking(false);
        }
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (notifications.length === 0) {
      return 0;
    }

    setIsMarking(true);

    try {
      const before = new Date().toISOString();
      const { updated } = await markNotificationsRead({ before });

      if (!isMountedRef.current) {
        return updated;
      }

      const markedAt = new Date();
      setNotifications((current) =>
        current.map((item) =>
          item.createdAt <= markedAt
            ? { ...item, isRead: true, readAt: markedAt }
            : item
        )
      );

      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось отметить уведомления прочитанными';
      setWsError(message);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsMarking(false);
      }
    }
  }, [notifications.length]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filters.unreadOnly && notification.isRead) {
        return false;
      }

      if (filters.importantOnly && notification.importance !== 'high') {
        return false;
      }

      return true;
    });
  }, [notifications, filters]);

  const groupedNotifications = useMemo<NotificationGroup[]>(() => {
    const buckets = new Map<string, FormattedNotification[]>();

    for (const notification of filteredNotifications) {
      const list = buckets.get(notification.dateKey) ?? [];
      list.push(notification);
      buckets.set(notification.dateKey, list);
    }

    const groups = Array.from(buckets.entries()).map(([date, items]) => ({
      date,
      items: items.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    }));

    return groups.sort((a, b) => {
      const aTime = a.items[0]?.createdAt.getTime() ?? 0;
      const bTime = b.items[0]?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [filteredNotifications]);

  const channelStats = useMemo<ChannelStats>(() => {
    const stats: ChannelStats = {};

    for (const notification of notifications) {
      const key = notification.channel ?? 'in-app';
      if (!stats[key]) {
        stats[key] = { total: 0, unread: 0 };
      }

      stats[key].total += 1;
      if (!notification.isRead) {
        stats[key].unread += 1;
      }
    }

    return stats;
  }, [notifications]);

  const sourceStats = useMemo<ChannelStats>(() => {
    const stats: ChannelStats = {};

    for (const notification of notifications) {
      const key = notification.source ?? 'system';
      if (!stats[key]) {
        stats[key] = { total: 0, unread: 0 };
      }

      stats[key].total += 1;
      if (!notification.isRead) {
        stats[key].unread += 1;
      }
    }

    return stats;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const importantCount = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.importance === 'high' && !notification.isRead
      ).length,
    [notifications]
  );

  const reconnect = useCallback(() => {
    setWsError(null);
    setConnectionStatus('connecting');
    clearReconnectTimer();
    subscriptionRef.current?.reconnect();
  }, [clearReconnectTimer]);

  return {
    notifications,
    filteredNotifications,
    groupedNotifications,
    filters,
    setFilters,
    isLoading,
    isRefreshing,
    isFetchingMore,
    isMarking,
    hasMore,
    unreadCount,
    importantCount,
    channelStats,
    sourceStats,
    connectionStatus,
    wsError,
    loadError,
    lastSyncedAt,
    loadMore,
    refresh: refreshLatest,
    markAsRead,
    markAllAsRead,
    reconnect
  };
}

