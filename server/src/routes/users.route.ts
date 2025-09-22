import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import type { UserExportDto } from '../../../shared/src/types/user.js';

import {
  createUser,
  deleteUser,
  getUserById,
  getUserCredentials,
  listUsers,
  updateUser,
  verifyAccountDeletionChallenge,
  AccountDeletionError
} from '../modules/users.js';
import { listAllNotificationsForUser } from '../modules/notifications.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const gzipAsync = promisify(gzip);

const profileSchema = z.record(z.any()).nullable().optional();

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(UserRole).optional()
});

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(UserRole),
  profile: profileSchema,
  avatarUrl: z.string().trim().nullable().optional()
});

const updateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(UserRole).optional(),
  profile: profileSchema,
  avatarUrl: z.string().trim().nullable().optional()
});

const userIdParamsSchema = z.object({
  id: z.string().min(1)
});

const exportUserQuerySchema = z.object({
  format: z.enum(['json', 'zip']).optional()
});

const deleteUserBodySchema = z
  .object({
    password: z.string().trim().min(1).optional(),
    token: z.string().trim().min(1).optional()
  })
  .refine((data) => Boolean(data.password || data.token), {
    message: 'Password or token is required',
    path: ['password']
  });

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

function ensureSelfOrAdmin(request: AuthenticatedRequest, reply: FastifyReply, targetUserId: string) {
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  if (request.user.id !== targetUserId) {
    reply.code(403);
    throw new Error('Forbidden');
  }
}

export function registerUserRoutes(app: FastifyInstance, options: { passwordSaltRounds: number }) {
  app.get('/users', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const query = listUsersQuerySchema.parse(request.query);
    return listUsers(query);
  });

  app.get('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, id);

    const user = await getUserById(id);

    if (!user) {
      reply.code(404);
      throw new Error('User not found');
    }

    return user;
  });

  app.get('/users/:id/export', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, id);

    const query = exportUserQuerySchema.parse(request.query);

    const user = await getUserById(id);

    if (!user) {
      reply.code(404);
      throw new Error('User not found');
    }

    const notifications = await listAllNotificationsForUser(id);
    const exportData: UserExportDto = {
      exportedAt: new Date().toISOString(),
      user,
      candidateProfile: user.candidateProfile,
      interviewerProfile: user.interviewerProfile,
      notifications
    };

    const format = query.format ?? 'json';

    if (format === 'zip') {
      const gzipped = await gzipAsync(Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8'));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      reply.header('Content-Type', 'application/gzip');
      reply.header('Content-Disposition', `attachment; filename="user-${id}-export-${timestamp}.json.gz"`);
      reply.send(gzipped);
      return reply;
    }

    reply.header('Content-Disposition', `attachment; filename="user-${id}-export.json"`);
    return exportData;
  });

  app.post('/users', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request, reply) => {
    const payload = createUserSchema.parse(request.body ?? {});

    const user = await createUser({
      email: payload.email,
      password: payload.password,
      role: payload.role,
      profile: payload.profile ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      passwordSaltRounds: options.passwordSaltRounds
    });

    reply.code(201);
    return user;
  });

  app.put('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, id);

    const payload = updateUserSchema.parse(request.body ?? {});

    const existing = await getUserById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('User not found');
    }

    const user = await updateUser(id, {
      email: payload.email,
      password: payload.password,
      role: payload.role,
      profile: payload.profile ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      passwordSaltRounds: options.passwordSaltRounds
    });

    return user;
  });

  app.delete('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, id);

    const existing = await getUserById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('User not found');
    }

    const requester = (request as AuthenticatedRequest).user;
    const requiresChallenge = requester.role !== UserRole.ADMIN || requester.id === id;

    if (requiresChallenge) {
      const payload = deleteUserBodySchema.parse(request.body ?? {});
      const credentials = await getUserCredentials(id);

      if (!credentials) {
        reply.code(404);
        throw new Error('User not found');
      }

      try {
        await verifyAccountDeletionChallenge(credentials, payload);
      } catch (error) {
        if (error instanceof AccountDeletionError) {
          reply.code(error.statusCode);
          throw new Error(error.message);
        }

        throw error;
      }
    }

    await deleteUser(id);

    reply.code(204);
    return null;
  });
}
