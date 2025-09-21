import { useMemo, useState } from 'react';

import { markNotificationsRead } from '@/lib/api';

export interface NotificationToggleProps {
  channel: string;
  label: string;
  description: string;
  enabled: boolean;
  unreadCount?: number;
  notificationIds?: string[];
  onToggle?: (nextValue: boolean) => Promise<void> | void;
  onMarkRead?: (notificationIds: string[]) => Promise<void> | void;
  onMarked?: (notificationIds: string[]) => void;
  isSaving?: boolean;
  isMarking?: boolean;
  disabled?: boolean;
  showMarkReadButton?: boolean;
}

function formatChannelName(channel: string) {
  const normalized = channel.toLowerCase();

  switch (normalized) {
    case 'telegram':
      return 'Telegram';
    case 'email':
      return 'Email';
    case 'push':
      return 'Push';
    case 'in-app':
      return 'В приложении';
    default:
      return channel;
  }
}

export function NotificationToggle({
  channel,
  label,
  description,
  enabled,
  unreadCount = 0,
  notificationIds = [],
  onToggle,
  onMarkRead,
  onMarked,
  isSaving = false,
  isMarking = false,
  disabled = false,
  showMarkReadButton = true
}: NotificationToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingLocal, setIsMarkingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUnread = unreadCount > 0;
  const isToggleDisabled = disabled || isSaving || isUpdating;
  const isMarkButtonDisabled =
    disabled || isMarking || isMarkingLocal || notificationIds.length === 0;

  const statusText = useMemo(() => {
    const parts: string[] = [];

    parts.push(enabled ? 'Включено' : 'Выключено');

    if (unreadCount > 0) {
      parts.push(`непрочитанных: ${unreadCount}`);
    } else {
      parts.push('непрочитанных нет');
    }

    return parts.join(' · ');
  }, [enabled, unreadCount]);

  const handleToggle = async () => {
    if (!onToggle) {
      return;
    }

    setError(null);
    setIsUpdating(true);

    try {
      await onToggle(!enabled);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось обновить настройки уведомлений';
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkRead = async () => {
    if (notificationIds.length === 0) {
      return;
    }

    setError(null);
    setIsMarkingLocal(true);

    try {
      if (onMarkRead) {
        await onMarkRead(notificationIds);
      } else {
        await markNotificationsRead({ notificationIds });
      }

      onMarked?.(notificationIds);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось отметить уведомления прочитанными';
      setError(message);
    } finally {
      setIsMarkingLocal(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm shadow-slate-950/60">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
            {formatChannelName(channel)} · {statusText}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={isToggleDisabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${
            enabled ? 'bg-secondary/80' : 'bg-slate-700'
          } ${isToggleDisabled ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-slate-950 transition ${
              enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        {hasUnread ? (
          <span className="rounded-full border border-amber-400/60 px-2 py-1 text-amber-200">
            Есть непрочитанные
          </span>
        ) : (
          <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-400">
            Всё прочитано
          </span>
        )}
        {showMarkReadButton && (
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={isMarkButtonDisabled}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-secondary/60 hover:text-secondary disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {isMarkingLocal || isMarking ? 'Отмечаем…' : 'Прочитано'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-300">{error}</p>
      )}
    </div>
  );
}

export default NotificationToggle;
