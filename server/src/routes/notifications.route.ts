import type { FastifyInstance, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  createNotification,
  listNotifications,
  markNotificationsAsRead
} from '../modules/notifications.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const listNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().optional(),
  before: z.string().datetime().optional()
});

const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  channel: z.string().min(1).optional(),
  payload: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).optional(),
  before: z.string().datetime().optional()
});

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

export function registerNotificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: authenticate }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const query = listNotificationsQuerySchema.parse(request.query ?? {});

    return listNotifications(authRequest.user.id, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      before: query.before ? new Date(query.before) : undefined
    });
  });

  app.post('/notifications', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request, reply) => {
    const payload = createNotificationSchema.parse(request.body ?? {});
    const notification = await createNotification(payload);
    reply.code(201);
    return notification;
  });

  app.post('/notifications/read', { preHandler: authenticate }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const payload = markReadSchema.parse(request.body ?? {});

    const count = await markNotificationsAsRead(authRequest.user.id, payload);

    return {
      updated: count
    };
  });
}
