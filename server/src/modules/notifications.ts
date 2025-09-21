import type { Notification, Prisma } from '@prisma/client';

import type {
  CreateNotificationPayload,
  MarkNotificationsReadPayload,
  NotificationDto,
  NotificationImportance
} from '../../../shared/src/types/realtime.js';
import { prisma } from './prisma.js';
import { emitNotification } from './realtime/bus.js';

function toJsonObject(
  value: Record<string, unknown> | undefined,
  field: 'payload' | 'metadata'
): Prisma.JsonObject | undefined {
  if (value == null) {
    return undefined;
  }

  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error(`Notification ${field} must be JSON-serializable`);
  }

  return value as Prisma.JsonObject;
}

function mapNotification(record: Notification): NotificationDto {
  const payload = record.payload as Record<string, unknown> | null;
  const metadata = record.metadata as Record<string, unknown> | null;
  const source = typeof metadata?.source === 'string' ? metadata.source : undefined;
  const importance = parseImportance(metadata?.importance);

  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    channel: record.channel,
    payload: payload ?? undefined,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    metadata: metadata ?? undefined,
    source,
    importance
  };
}

function parseImportance(value: unknown): NotificationImportance | undefined {
  if (value === 'low' || value === 'normal' || value === 'high') {
    return value;
  }

  return undefined;
}

function inferSource(type: string | undefined): string | undefined {
  if (!type) {
    return undefined;
  }

  const [prefix] = type.split('.');
  return prefix || undefined;
}

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export async function listNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number; before?: Date }
): Promise<NotificationDto[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  const beforeFilter = options?.before && isValidDate(options.before) ? options.before : undefined;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      readAt: options?.unreadOnly ? null : undefined,
      createdAt: beforeFilter ? { lt: beforeFilter } : undefined
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return notifications.map(mapNotification);
}

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<NotificationDto> {
  const metadata: Record<string, unknown> | undefined = (() => {
    const baseMetadata = payload.metadata ? { ...payload.metadata } : {};
    const source = payload.source ?? inferSource(payload.type);
    const importance = parseImportance(payload.importance);

    if (source) {
      baseMetadata.source = source;
    }

    if (importance) {
      baseMetadata.importance = importance;
    }

    return Object.keys(baseMetadata).length > 0 ? baseMetadata : undefined;
  })();

  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      channel: payload.channel ?? null,
      payload: toJsonObject(payload.payload, 'payload'),
      metadata: toJsonObject(metadata, 'metadata')
    }
  });

  const dto = mapNotification(notification);
  emitNotification({ notification: dto });
  return dto;
}

export async function markNotificationsAsRead(
  userId: string,
  payload: MarkNotificationsReadPayload
): Promise<number> {
  const beforeDate = payload.before ? new Date(payload.before) : null;
  const createdAtFilter = isValidDate(beforeDate) ? { lt: beforeDate } : undefined;

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      id: payload.notificationIds && payload.notificationIds.length > 0 ? { in: payload.notificationIds } : undefined,
      createdAt: createdAtFilter
    },
    data: {
      readAt: new Date()
    }
  });

  return result.count;
}
