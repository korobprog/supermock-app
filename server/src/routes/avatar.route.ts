import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import { deleteUserAvatar, getUserAvatar, saveUserAvatar } from '../modules/avatars.js';
import { getUserById } from '../modules/users.js';
import { authenticate } from '../utils/auth.js';

const userIdParamsSchema = z.object({
  id: z.string().min(1)
});

const uploadAvatarSchema = z.object({
  data: z.string().min(20),
  mediaType: z.string().trim().optional()
});

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

function ensureAvatarAccess(request: AuthenticatedRequest, reply: FastifyReply, targetUserId: string) {
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  if (request.user.id !== targetUserId) {
    reply.code(403);
    throw new Error('Forbidden');
  }
}

export function registerAvatarRoutes(app: FastifyInstance) {
  app.post('/users/:id/avatar', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const payload = uploadAvatarSchema.parse(request.body ?? {});

    const actorRequest = request as AuthenticatedRequest;
    ensureAvatarAccess(actorRequest, reply, id);

    const user = await getUserById(id);

    if (!user) {
      reply.code(404);
      throw new Error('User not found');
    }

    const avatarUrl = await saveUserAvatar({ userId: id, data: payload.data, mediaType: payload.mediaType });

    return {
      avatarUrl
    };
  });

  app.get('/users/:id/avatar', async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const avatar = await getUserAvatar(id);

    if (!avatar) {
      reply.code(404);
      throw new Error('Avatar not found');
    }

    return avatar;
  });

  app.delete('/users/:id/avatar', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);

    const actorRequest = request as AuthenticatedRequest;
    ensureAvatarAccess(actorRequest, reply, id);

    const user = await getUserById(id);
    if (!user) {
      reply.code(404);
      throw new Error('User not found');
    }

    await deleteUserAvatar(id);

    reply.code(204);
    return null;
  });
}
