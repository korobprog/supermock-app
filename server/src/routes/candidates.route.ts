import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  createCandidateProfile,
  deleteCandidateProfile,
  getCandidateProfileById,
  getCandidateProfileByUserId,
  listCandidateProfiles,
  updateCandidateProfile
} from '../modules/candidates.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const candidateIdParamsSchema = z.object({
  id: z.string().min(1)
});

const listCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional()
});

const createCandidateSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(2),
  timezone: z.string().min(2),
  experienceYears: z.number().int().min(0),
  preferredRoles: z.array(z.string().min(2)).min(1),
  preferredLanguages: z.array(z.string().min(2)).min(1),
  focusAreas: z.array(z.string().min(2)).min(1),
  bio: z.string().trim().max(1000).optional()
});

const updateCandidateSchema = createCandidateSchema.partial().omit({ userId: true });

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

function ensureCandidateAccess(request: AuthenticatedRequest, reply: FastifyReply, targetUserId: string) {
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  if (request.user.id !== targetUserId) {
    reply.code(403);
    throw new Error('Forbidden');
  }
}

export function registerCandidateRoutes(app: FastifyInstance) {
  app.get('/candidates', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const query = listCandidatesQuerySchema.parse(request.query);
    return listCandidateProfiles(query);
  });

  app.get('/candidates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = candidateIdParamsSchema.parse(request.params);
    const profile = await getCandidateProfileById(id);

    if (!profile) {
      reply.code(404);
      throw new Error('Candidate profile not found');
    }

    ensureCandidateAccess(request as AuthenticatedRequest, reply, profile.userId);

    return profile;
  });

  app.get('/candidates/user/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = candidateIdParamsSchema.parse(request.params);
    ensureCandidateAccess(request as AuthenticatedRequest, reply, id);

    const profile = await getCandidateProfileByUserId(id);

    if (!profile) {
      reply.code(404);
      throw new Error('Candidate profile not found');
    }

    return profile;
  });

  app.post('/candidates', { preHandler: authenticate }, async (request, reply) => {
    const payload = createCandidateSchema.parse(request.body ?? {});
    ensureCandidateAccess(request as AuthenticatedRequest, reply, payload.userId);

    const profile = await createCandidateProfile(payload);

    reply.code(201);
    return profile;
  });

  app.put('/candidates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = candidateIdParamsSchema.parse(request.params);
    const payload = updateCandidateSchema.parse(request.body ?? {});

    const existing = await getCandidateProfileById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('Candidate profile not found');
    }

    ensureCandidateAccess(request as AuthenticatedRequest, reply, existing.userId);

    const updated = await updateCandidateProfile(id, payload);
    return updated;
  });

  app.delete('/candidates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = candidateIdParamsSchema.parse(request.params);

    const existing = await getCandidateProfileById(id);
    if (!existing) {
      reply.code(404);
      throw new Error('Candidate profile not found');
    }

    ensureCandidateAccess(request as AuthenticatedRequest, reply, existing.userId);

    await deleteCandidateProfile(id);

    reply.code(204);
    return null;
  });
}
