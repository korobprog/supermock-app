import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  createInterviewerProfile,
  deleteInterviewerProfile,
  getInterviewerProfileById,
  getInterviewerProfileByUserId,
  listInterviewerProfiles,
  updateInterviewerProfile
} from '../modules/interviewers.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const interviewerIdParamsSchema = z.object({
  id: z.string().min(1)
});

const listInterviewersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  minRating: z.coerce.number().min(0).max(5).optional()
});

const createInterviewerSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(2),
  timezone: z.string().min(2),
  experienceYears: z.number().int().min(0),
  languages: z.array(z.string().min(2)).min(1),
  specializations: z.array(z.string().min(2)).min(1),
  bio: z.string().trim().max(1000).optional()
});

const updateInterviewerSchema = createInterviewerSchema.partial().omit({ userId: true }).extend({
  rating: z.number().min(0).max(5).optional()
});

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

function ensureInterviewerAccess(request: AuthenticatedRequest, reply: FastifyReply, targetUserId: string) {
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  if (request.user.id !== targetUserId) {
    reply.code(403);
    throw new Error('Forbidden');
  }
}

export function registerInterviewerRoutes(app: FastifyInstance) {
  app.get('/interviewers', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const query = listInterviewersQuerySchema.parse(request.query);
    return listInterviewerProfiles(query);
  });

  app.get('/interviewers/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = interviewerIdParamsSchema.parse(request.params);
    const profile = await getInterviewerProfileById(id);

    if (!profile) {
      reply.code(404);
      throw new Error('Interviewer profile not found');
    }

    ensureInterviewerAccess(request as AuthenticatedRequest, reply, profile.userId);

    return profile;
  });

  app.get('/interviewers/user/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = interviewerIdParamsSchema.parse(request.params);
    ensureInterviewerAccess(request as AuthenticatedRequest, reply, id);

    const profile = await getInterviewerProfileByUserId(id);

    if (!profile) {
      reply.code(404);
      throw new Error('Interviewer profile not found');
    }

    return profile;
  });

  app.post('/interviewers', { preHandler: authenticate }, async (request, reply) => {
    const payload = createInterviewerSchema.parse(request.body ?? {});
    ensureInterviewerAccess(request as AuthenticatedRequest, reply, payload.userId);

    const profile = await createInterviewerProfile(payload);

    reply.code(201);
    return profile;
  });

  app.put('/interviewers/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = interviewerIdParamsSchema.parse(request.params);
    const payload = updateInterviewerSchema.parse(request.body ?? {});

    const existing = await getInterviewerProfileById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('Interviewer profile not found');
    }

    ensureInterviewerAccess(request as AuthenticatedRequest, reply, existing.userId);

    const updated = await updateInterviewerProfile(id, payload);
    return updated;
  });

  app.delete('/interviewers/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = interviewerIdParamsSchema.parse(request.params);

    const existing = await getInterviewerProfileById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('Interviewer profile not found');
    }

    ensureInterviewerAccess(request as AuthenticatedRequest, reply, existing.userId);

    await deleteInterviewerProfile(id);

    reply.code(204);
    return null;
  });
}
