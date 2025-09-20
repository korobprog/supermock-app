import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

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
  scheduleMatch
} from '../modules/matching.js';

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

const scheduleMatchSchema = z.object({
  availabilityId: z.string().min(1, 'availabilityId is required'),
  roomUrl: z.string().url().optional()
});

const createAvailabilitySchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  isRecurring: z.boolean().optional()
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

export function registerMatchingRoutes(app: FastifyInstance) {
  app.get('/matching/overview', async () => getMatchOverview());

  app.get('/matching/candidates', async () => listCandidateSummaries());

  app.get('/matching/interviewers', async () => listInterviewers());

  app.post('/matching/requests', async (request, reply) => {
    const payload = createMatchRequestSchema.parse(request.body);
    const result = await createMatchRequest(payload);

    if (!result) {
      reply.code(404);
      throw new Error('Candidate profile not found');
    }

    reply.code(201);
    return result;
  });

  app.get('/matching/requests/:id', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const matchRequest = await getMatchRequestById(id);

    if (!matchRequest) {
      throw new Error('Match request not found');
    }

    return matchRequest;
  });

  app.get('/matching/requests/:id/previews', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const previews = await getMatchPreviews(id);

    if (!previews) {
      throw new Error('Match request not found');
    }

    return {
      requestId: id,
      previews
    };
  });

  app.post('/matching/requests/:id/schedule', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const payload = scheduleMatchSchema.parse(request.body);

    const updated = await scheduleMatch(id, payload);

    if (!updated) {
      throw new Error('Match request or availability not found');
    }

    return updated;
  });

  app.get('/matching/interviewers/:id/availability', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return listInterviewerAvailability(id);
  });

  app.get('/matching/interviewers/:id/sessions', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const limitParam = (request.query as { limit?: string })?.limit;
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 10;
    return getInterviewerSessions(id, limit);
  });

  app.post('/matching/interviewers/:id/availability', async (request, reply) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const payload = createAvailabilitySchema.parse(request.body);

    const slot = await createInterviewerAvailability({
      interviewerId: id,
      start: payload.start,
      end: payload.end,
      isRecurring: payload.isRecurring
    });

    if (!slot) {
      reply.code(400);
      throw new Error('Failed to create availability slot');
    }

    reply.code(201);
    return slot;
  });

  app.delete('/matching/availability/:id', async (request, reply) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const removed = await deleteInterviewerAvailability(id);

    if (!removed) {
      reply.code(404);
      throw new Error('Availability slot not found');
    }

    reply.code(204);
    return null;
  });

  app.post('/matching/matches/:id/complete', async (request) => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const payload = completeMatchSchema.parse(request.body);

    const updated = await completeMatch(id, payload);

    if (!updated) {
      throw new Error('Match not found');
    }

    return updated;
  });

  app.get('/matching/sessions/recent', async (request) => {
    const limitParam = (request.query as { limit?: string })?.limit;
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 10;
    return listRecentSessions(limit);
  });
}
