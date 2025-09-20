import { randomUUID } from 'node:crypto';

import type {
  CreateNotificationPayload,
  MarkNotificationsReadPayload,
  NotificationDto
} from '../../../shared/src/types/realtime.js';
import { emitNotification } from './realtime/bus.js';

const notifications = new Map<string, NotificationDto>();

function nowIso() {
  return new Date().toISOString();
}

export async function listNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number; before?: Date }
): Promise<NotificationDto[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  const items = Array.from(notifications.values())
    .filter((item) => item.userId === userId)
    .filter((item) => (options?.unreadOnly ? item.readAt == null : true))
    .filter((item) => (options?.before ? new Date(item.createdAt) < options.before : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return items;
}

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<NotificationDto> {
  const id = randomUUID();
  const timestamp = nowIso();

  const notification: NotificationDto = {
    id,
    userId: payload.userId,
    type: payload.type,
    channel: payload.channel ?? null,
    payload: payload.payload,
    readAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: payload.metadata
  };

  notifications.set(id, notification);
  emitNotification({ notification });
  return notification;
}

export async function markNotificationsAsRead(
  userId: string,
  payload: MarkNotificationsReadPayload
): Promise<number> {
  const now = nowIso();
  let updated = 0;

  notifications.forEach((notification, id) => {
    if (notification.userId !== userId) {
      return;
    }

    if (payload.notificationIds && payload.notificationIds.length > 0) {
      if (!payload.notificationIds.includes(id)) {
        return;
      }
    }

    if (payload.before) {
      const before = new Date(payload.before);
      if (!(before instanceof Date) || Number.isNaN(before.getTime())) {
        return;
      }
      if (new Date(notification.createdAt) >= before) {
        return;
      }
    }

    if (!notification.readAt) {
      notification.readAt = now;
      notification.updatedAt = now;
      updated += 1;
    }
  });

  return updated;
}
