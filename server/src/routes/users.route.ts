import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser
} from '../modules/users.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

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

  app.delete('/users/:id', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);

    const existing = await getUserById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('User not found');
    }

    await deleteUser(id);

    reply.code(204);
    return null;
  });
}
