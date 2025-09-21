import type { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import type { DailyCoService } from '../modules/daily-co.js';

import {
  createInterviewerAvailability,
  createMatchRequest,
  completeMatch,
  deleteInterviewerAvailability,
  getMatchOverview,
  getMatchPreviews,
  getMatchRequestById,
  listCandidateSummaries,
  listRecentSessions,
  listInterviewers,
  listInterviewerAvailability,
  getInterviewerSessions,
  scheduleMatch,
  getSlotById,
  joinSlot
} from '../modules/matching.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const createMatchRequestSchema = z.object({
  candidateId: z.string().min(1, 'candidateId is required'),
  targetRole: z.string().min(2, 'targetRole is required'),
  focusAreas: z.array(z.string().min(2)).min(1),
  preferredLanguages: z.array(z.string().min(2)).min(1),
  sessionFormat: z.enum(['SYSTEM_DESIGN', 'CODING', 'BEHAVIORAL', 'MIXED']),
  notes: z.string().max(500).optional()
});

const requestIdParamsSchema = z.object({
  id: z.string().min(1)
});

type MatchingRouteDependencies = {
  dailyCo?: {
    service: DailyCoService | null;
    domain?: string;
    enabled?: boolean;
  };
};

function normalizeDailyDomain(domain?: string | null): string | null {
  if (!domain) {
    return null;
  }

  const trimmed = domain.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.host.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//, '').toLowerCase();
  }
}

function isValidDailyUrl(value: string, domain?: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const normalizedHost = normalizeDailyDomain(domain);

    if (normalizedHost) {
      return url.host.toLowerCase() === normalizedHost && url.pathname.length > 1;
    }

    return url.hostname.endsWith('.daily.co') && url.pathname.length > 1;
  } catch {
    return false;
  }
}

function createScheduleMatchSchema(domain?: string | null, enabled?: boolean) {
  const base = {
    availabilityId: z.string().min(1, 'availabilityId is required'),
    roomUrl: z
      .string()
      .url()
      .optional()
  };

  const normalizedDomain = normalizeDailyDomain(domain);
  const shouldEnforceDaily = Boolean(enabled ?? normalizedDomain);

  return z.object({
    ...base,
    roomUrl: shouldEnforceDaily
      ? base.roomUrl?.refine(
          (value) => !value || isValidDailyUrl(value, normalizedDomain),
          'Room URL must belong to the configured Daily.co domain'
        )
      : base.roomUrl
  });
}

const createAvailabilitySchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  isRecurring: z.boolean().optional(),
  language: z.string().optional()
});

const joinSlotSchema = z
  .object({
    role: z.enum(['CANDIDATE', 'INTERVIEWER', 'OBSERVER']),
    candidateId: z.string().min(1).optional(),
    interviewerId: z.string().min(1).optional(),
    matchRequest: createMatchRequestSchema
      .omit({ candidateId: true })
      .partial({ notes: true })
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.candidateId && data.interviewerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either candidateId or interviewerId, not both',
        path: ['interviewerId']
      });
    }

    if (data.role === 'CANDIDATE' && !data.candidateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'candidateId is required for candidate role',
        path: ['candidateId']
      });
    }

    if (data.role === 'INTERVIEWER' && !data.interviewerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interviewerId is required for interviewer role',
        path: ['interviewerId']
      });
    }

    if (data.role === 'OBSERVER' && !data.candidateId && !data.interviewerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Observer must reference a candidateId or interviewerId',
        path: ['role']
      });
    }
  });

const completeMatchSchema = z.object({
  effectivenessScore: z.number().min(0).max(100),
  interviewerNotes: z.string().min(3),
  candidateNotes: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  aiHighlights: z.record(z.any()).optional()
});

export function registerMatchingRoutes(app: FastifyInstance, deps: MatchingRouteDependencies = {}) {
  const scheduleMatchSchema = createScheduleMatchSchema(deps.dailyCo?.domain, deps.dailyCo?.enabled);

  app.get('/matching/overview', { preHandler: authenticate }, async () => getMatchOverview());

  app.get(
    '/matching/candidates',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async () => listCandidateSummaries()
  );

  app.get(
    '/matching/interviewers',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async () => listInterviewers()
  );

  app.post(
    '/matching/requests',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request, reply) => {
      const payload = createMatchRequestSchema.parse(request.body);
      const result = await createMatchRequest(payload);

      if (!result) {
        reply.code(404);
        throw new Error('Candidate profile not found');
      }

      reply.code(201);
      return result;
    }
  );

  app.get('/matching/requests/:id', { preHandler: authenticate }, async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const matchRequest = await getMatchRequestById(id);

    if (!matchRequest) {
      throw new Error('Match request not found');
    }

    return matchRequest;
  });

  app.get(
    '/matching/requests/:id/previews',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const previews = await getMatchPreviews(id);

      if (!previews) {
        throw new Error('Match request not found');
    }

    return {
      requestId: id,
      previews
    };
    }
  );

  app.post(
    '/matching/requests/:id/schedule',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const payload = scheduleMatchSchema.parse(request.body);

      const updated = await scheduleMatch(id, payload, { dailyCoService: deps.dailyCo?.service ?? null });

      if (!updated) {
        throw new Error('Match request or availability not found');
      }

      return updated;
    }
  );

  app.get('/matching/interviewers/:id/availability', { preHandler: authenticate }, async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return listInterviewerAvailability(id);
  });

  app.get('/matching/slots/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const slot = await getSlotById(id);

    if (!slot) {
      reply.code(404);
      throw new Error('Slot not found');
    }

    return slot;
  });

  app.get(
    '/matching/interviewers/:id/sessions',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const limitParam = (request.query as { limit?: string })?.limit;
      const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 10;
      return getInterviewerSessions(id, limit);
    }
  );

  app.post(
    '/matching/interviewers/:id/availability',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request, reply) => {
      console.log('Received request to create availability slot');
      const { id } = requestIdParamsSchema.parse(request.params);
      console.log('Interviewer ID:', id);

      const payload = createAvailabilitySchema.parse(request.body);
      console.log('Parsed payload:', payload);

      const slot = await createInterviewerAvailability({
        interviewerId: id,
        start: payload.start,
        end: payload.end,
        isRecurring: payload.isRecurring,
        language: payload.language
      });

      if (!slot) {
        console.log('Slot creation failed - returning 400');
        reply.code(400);
        throw new Error('Failed to create availability slot');
      }

      console.log('Slot created successfully, returning 201');
      reply.code(201);
      return slot;
    }
  );

  app.delete(
    '/matching/availability/:id',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request, reply) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const removed = await deleteInterviewerAvailability(id);

      if (!removed) {
        reply.code(404);
        throw new Error('Availability slot not found');
      }

      reply.code(204);
      return null;
    }
  );

  app.post(
    '/matching/slots/:id/join',
    { preHandler: authorizeRoles(UserRole.CANDIDATE, UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request, reply) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const payload = joinSlotSchema.parse(request.body);

      const request = await joinSlot(id, payload);

      if (!request) {
        reply.code(404);
        throw new Error('Slot or participant not found');
      }

      return request;
    }
  );

  app.post(
    '/matching/matches/:id/complete',
    { preHandler: authorizeRoles(UserRole.INTERVIEWER, UserRole.ADMIN) },
    async (request) => {
      const { id } = requestIdParamsSchema.parse(request.params);
      const payload = completeMatchSchema.parse(request.body);

      const updated = await completeMatch(id, payload);

      if (!updated) {
        throw new Error('Match not found');
      }

      return updated;
    }
  );

  app.get('/matching/sessions/recent', { preHandler: authenticate }, async (request) => {
    const limitParam = (request.query as { limit?: string })?.limit;
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 10;
    return listRecentSessions(limit);
  });
}
