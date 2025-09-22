import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../src/modules/config.js';

vi.mock('../../src/modules/prisma.js', () => {
  type UserRecord = {
    id: string;
    email: string;
    role: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  type NotificationRecord = {
    id: string;
    userId: string;
    type: string;
    channel: string | null;
    payload: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  const initialState = () => ({
    sequence: 0,
    usersById: new Map<string, UserRecord>(),
    usersByEmail: new Map<string, string>(),
    notifications: new Map<string, NotificationRecord>()
  });

  const state = initialState();

  const cloneUser = (user: UserRecord | undefined | null) => {
    if (!user) {
      return null;
    }

    return { ...user } as UserRecord;
  };

  const cloneNotification = (notification: NotificationRecord) => ({
    ...notification,
    payload: notification.payload ? JSON.parse(JSON.stringify(notification.payload)) : null,
    metadata: notification.metadata ? JSON.parse(JSON.stringify(notification.metadata)) : null,
    createdAt: new Date(notification.createdAt),
    updatedAt: new Date(notification.updatedAt),
    readAt: notification.readAt ? new Date(notification.readAt) : null
  });

  const nextId = (prefix: string) => {
    state.sequence += 1;
    return `${prefix}_${state.sequence}`;
  };

  const prisma = {
    user: {
      create: async ({ data }: { data: { email: string; role: string; passwordHash?: string | null } }) => {
        const normalizedEmail = data.email.trim().toLowerCase();

        if (state.usersByEmail.has(normalizedEmail)) {
          throw Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), { code: 'P2002' });
        }

        const id = nextId('user');
        const record: UserRecord = {
          id,
          email: normalizedEmail,
          role: data.role,
          passwordHash: data.passwordHash ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        state.usersById.set(id, record);
        state.usersByEmail.set(normalizedEmail, id);

        return cloneUser(record);
      },
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) {
          return cloneUser(state.usersById.get(where.id));
        }

        if (where.email) {
          const id = state.usersByEmail.get(where.email.trim().toLowerCase());
          return cloneUser(id ? state.usersById.get(id) : null);
        }

        return null;
      }
    },
    notification: {
      create: async ({
        data
      }: {
        data: {
          userId: string;
          type: string;
          channel: string | null;
          payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
      }) => {
        const user = state.usersById.get(data.userId);

        if (!user) {
          throw new Error('Foreign key constraint failed on the field: `Notification_userId`');
        }

        const id = nextId('notification');
        const timestamp = new Date(Date.now() + state.sequence);
        const record: NotificationRecord = {
          id,
          userId: data.userId,
          type: data.type,
          channel: data.channel ?? null,
          payload: data.payload ? JSON.parse(JSON.stringify(data.payload)) : null,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
          readAt: null,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        state.notifications.set(id, record);

        return cloneNotification(record);
      },
      findMany: async ({
        where,
        orderBy,
        take
      }: {
        where?: {
          userId?: string;
          readAt?: null;
          createdAt?: { lt?: Date };
          id?: { in?: string[] };
        };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        take?: number;
      }) => {
        let items = Array.from(state.notifications.values());

        if (where?.userId) {
          items = items.filter((item) => item.userId === where.userId);
        }

        if (where?.readAt === null) {
          items = items.filter((item) => item.readAt == null);
        }

        if (where?.createdAt?.lt) {
          const before = where.createdAt.lt;
          items = items.filter((item) => item.createdAt < before);
        }

        if (where?.id?.in) {
          const ids = new Set(where.id.in);
          items = items.filter((item) => ids.has(item.id));
        }

        const direction = orderBy?.createdAt === 'asc' ? 1 : -1;
        items.sort((a, b) => {
          const diff = a.createdAt.getTime() - b.createdAt.getTime();

          if (diff === 0) {
            return direction === 1 ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
          }

          return direction === 1 ? diff : -diff;
        });

        if (typeof take === 'number') {
          items = items.slice(0, take);
        }

        return items.map(cloneNotification);
      },
      updateMany: async ({
        where,
        data
      }: {
        where: {
          userId: string;
          readAt?: null;
          createdAt?: { lt?: Date };
          id?: { in?: string[] };
        };
        data: { readAt: Date };
      }) => {
        let count = 0;
        const ids = where.id?.in ? new Set(where.id.in) : null;
        const before = where.createdAt?.lt;

        state.notifications.forEach((notification, id) => {
          if (notification.userId !== where.userId) {
            return;
          }

          if (where.readAt === null && notification.readAt !== null) {
            return;
          }

          if (ids && !ids.has(id)) {
            return;
          }

          if (before && !(notification.createdAt < before)) {
            return;
          }

          notification.readAt = new Date(data.readAt);
          notification.updatedAt = new Date();
          state.notifications.set(id, notification);
          count += 1;
        });

        return { count };
      }
    }
  } satisfies Record<string, unknown>;

  const reset = () => {
    const fresh = initialState();

    state.sequence = fresh.sequence;
    state.usersById = fresh.usersById;
    state.usersByEmail = fresh.usersByEmail;
    state.notifications = fresh.notifications;
  };

  return {
    prisma,
    __mockDb: {
      reset
    }
  };
});

const { prisma, __mockDb } = await import('../../src/modules/prisma.js');
const { registerNotificationRoutes } = await import('../../src/routes/notifications.route.js');
const authPluginModule = await import('../../src/plugins/auth.plugin.js');
const authPlugin = authPluginModule.default;

const buildTestConfig = (): AppConfig => ({
  port: 0,
  host: '127.0.0.1',
  corsOrigins: [],
  logLevel: 'silent',
  jwt: {
    secret: 'test-secret',
    accessTokenTtl: '15m',
    refreshTokenTtl: '7d'
  },
  password: {
    saltRounds: 4
  },
  dailyCo: {
    enabled: false,
    apiKey: '',
    domain: ''
  },
  rateLimit: {
    global: {
      max: 1000,
      timeWindow: '1 minute'
    },
    critical: {
      max: 1000,
      timeWindow: '1 minute'
    }
  }
});

describe('Notification HTTP persistence', () => {
  let config: AppConfig;
  let activeApps: FastifyInstance[];

  const startApp = async () => {
    const app = fastify({ logger: false });
    await app.register(authPlugin, { config });
    registerNotificationRoutes(app);
    await app.ready();
    activeApps.push(app);
    return app;
  };

  const closeApp = async (app: FastifyInstance) => {
    await app.close();
    activeApps = activeApps.filter((instance) => instance !== app);
  };

  const seedUsers = async (app: FastifyInstance) => {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        role: 'ADMIN'
      }
    });

    const recipient = await prisma.user.create({
      data: {
        email: 'candidate@example.com',
        role: 'CANDIDATE'
      }
    });

    const adminToken = app.jwt.sign({
      id: admin.id,
      email: admin.email,
      role: 'ADMIN',
      emailVerified: true
    });

    const recipientToken = app.jwt.sign({
      id: recipient.id,
      email: recipient.email,
      role: 'CANDIDATE',
      emailVerified: true
    });

    return { admin, recipient, adminToken, recipientToken };
  };

  beforeEach(async () => {
    __mockDb.reset();
    config = buildTestConfig();
    activeApps = [];
  });

  afterEach(async () => {
    await Promise.all(activeApps.map((app) => app.close()));
    activeApps = [];
  });

  it('persists notifications across restarts and marks specific items as read', async () => {
    const app1 = await startApp();
    const { recipient, adminToken, recipientToken } = await seedUsers(app1);

    const createFirst = await app1.inject({
      method: 'POST',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        userId: recipient.id,
        type: 'MATCH_READY',
        payload: { matchId: 'match-123' },
        metadata: { origin: 'matching-service' }
      }
    });

    expect(createFirst.statusCode).toBe(201);
    const olderNotification = createFirst.json();

    const createSecond = await app1.inject({
      method: 'POST',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        userId: recipient.id,
        type: 'REMINDER',
        channel: 'email'
      }
    });

    expect(createSecond.statusCode).toBe(201);
    const latestNotification = createSecond.json();

    const initialListResponse = await app1.inject({
      method: 'GET',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(initialListResponse.statusCode).toBe(200);
    const initialList = initialListResponse.json();
    expect(initialList).toHaveLength(2);
    expect(initialList[0].id).toBe(latestNotification.id);
    expect(initialList[1].id).toBe(olderNotification.id);
    initialList.forEach((item: any) => {
      expect(item.readAt).toBeNull();
    });

    await closeApp(app1);

    const app2 = await startApp();

    const listAfterRestart = await app2.inject({
      method: 'GET',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(listAfterRestart.statusCode).toBe(200);
    const persistedList = listAfterRestart.json();
    expect(persistedList.map((item: any) => item.id)).toEqual(initialList.map((item: any) => item.id));

    const markResponse = await app2.inject({
      method: 'POST',
      url: '/notifications/read',
      headers: {
        authorization: `Bearer ${recipientToken}`
      },
      payload: {
        notificationIds: [olderNotification.id]
      }
    });

    expect(markResponse.statusCode).toBe(200);
    expect(markResponse.json()).toEqual({ updated: 1 });

    const unreadOnlyResponse = await app2.inject({
      method: 'GET',
      url: '/notifications?unreadOnly=true',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(unreadOnlyResponse.statusCode).toBe(200);
    const unreadList = unreadOnlyResponse.json();
    expect(unreadList).toHaveLength(1);
    expect(unreadList[0].id).toBe(latestNotification.id);

    const finalListResponse = await app2.inject({
      method: 'GET',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(finalListResponse.statusCode).toBe(200);
    const finalList = finalListResponse.json();
    const markedNotification = finalList.find((item: any) => item.id === olderNotification.id);
    expect(markedNotification?.readAt).toBeTypeOf('string');
  });

  it('marks older notifications using before filter after restart', async () => {
    const app1 = await startApp();
    const { recipient, adminToken, recipientToken } = await seedUsers(app1);

    for (const detail of [
      { type: 'FIRST_ALERT', payload: { idx: 1 } },
      { type: 'SECOND_ALERT', payload: { idx: 2 } },
      { type: 'THIRD_ALERT', payload: { idx: 3 } }
    ]) {
      const response = await app1.inject({
        method: 'POST',
        url: '/notifications',
        headers: {
          authorization: `Bearer ${adminToken}`
        },
        payload: {
          userId: recipient.id,
          type: detail.type,
          payload: detail.payload
        }
      });

      expect(response.statusCode).toBe(201);
    }

    const snapshotResponse = await app1.inject({
      method: 'GET',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(snapshotResponse.statusCode).toBe(200);
    const snapshot = snapshotResponse.json();
    expect(snapshot).toHaveLength(3);

    await closeApp(app1);

    const app2 = await startApp();

    const markResponse = await app2.inject({
      method: 'POST',
      url: '/notifications/read',
      headers: {
        authorization: `Bearer ${recipientToken}`
      },
      payload: {
        before: snapshot[0].createdAt
      }
    });

    expect(markResponse.statusCode).toBe(200);
    expect(markResponse.json()).toEqual({ updated: 2 });

    const unreadAfterMark = await app2.inject({
      method: 'GET',
      url: '/notifications?unreadOnly=true',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(unreadAfterMark.statusCode).toBe(200);
    const unreadList = unreadAfterMark.json();
    expect(unreadList).toHaveLength(1);
    expect(unreadList[0].id).toBe(snapshot[0].id);

    const allAfterMark = await app2.inject({
      method: 'GET',
      url: '/notifications',
      headers: {
        authorization: `Bearer ${recipientToken}`
      }
    });

    expect(allAfterMark.statusCode).toBe(200);
    const allNotifications = allAfterMark.json();
    const readOnes = allNotifications.filter((item: any) => item.id !== snapshot[0].id);
    expect(readOnes).toHaveLength(2);
    readOnes.forEach((item: any) => {
      expect(item.readAt).toBeTypeOf('string');
    });
  });
});
