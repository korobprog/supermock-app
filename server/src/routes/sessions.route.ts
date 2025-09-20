import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  createRealtimeSession,
  getRealtimeSessionById,
  heartbeatRealtimeSession,
  joinRealtimeSession,
  leaveRealtimeSession,
  listRealtimeSessions,
  removeRealtimeSession,
  updateRealtimeSessionStatus
} from '../modules/realtime-sessions.js';

const realtimeStatusValues = ['SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'] as const;
const participantRoleValues = ['HOST', 'INTERVIEWER', 'CANDIDATE', 'OBSERVER'] as const;

const metadataSchema = z.record(z.string(), z.any());

const createSessionSchema = z.object({
  matchId: z.string().min(1).optional(),
  hostId: z.string().min(1),
  status: z.enum(realtimeStatusValues).optional(),
  metadata: metadataSchema.optional()
});

const joinSessionSchema = z.object({
  userId: z.string().min(1).optional(),
  role: z.enum(participantRoleValues).optional(),
  connectionId: z.string().min(1).optional(),
  metadata: metadataSchema.optional()
});

const heartbeatSchema = z.object({
  participantId: z.string().min(1).optional(),
  timestamp: z.string().datetime().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(realtimeStatusValues),
  endedAt: z.string().datetime().optional(),
  metadata: metadataSchema.optional()
});

const sessionIdParamsSchema = z.object({
  id: z.string().min(1)
});

const listSessionsQuerySchema = z.object({
  status: z.enum(realtimeStatusValues).optional(),
  hostId: z.string().min(1).optional(),
  matchId: z.string().min(1).optional(),
  activeOnly: z.coerce.boolean().optional()
});

export function registerRealtimeSessionRoutes(app: FastifyInstance) {
  app.get('/sessions', async (request) => {
    const query = listSessionsQuerySchema.parse(request.query ?? {});
    return listRealtimeSessions({
      status: query.status,
      hostId: query.hostId,
      matchId: query.matchId,
      activeOnly: query.activeOnly
    });
  });

  app.get('/sessions/:id', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const session = await getRealtimeSessionById(id);

    if (!session) {
      reply.code(404);
      throw new Error('Session not found');
    }

    return session;
  });

  app.post('/sessions', async (request, reply) => {
    const payload = createSessionSchema.parse(request.body ?? {});
    const session = await createRealtimeSession({
      matchId: payload.matchId,
      hostId: payload.hostId,
      status: payload.status,
      metadata: payload.metadata
    });
    reply.code(201);
    return session;
  });

  app.post('/sessions/:id/join', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const payload = joinSessionSchema.parse(request.body ?? {});

    const participant = await joinRealtimeSession(id, {
      userId: payload.userId,
      role: payload.role,
      connectionId: payload.connectionId,
      metadata: payload.metadata
    });

    if (!participant) {
      reply.code(404);
      throw new Error('Session not found');
    }

    reply.code(201);
    return participant;
  });

  app.post('/sessions/:id/leave', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const { participantId } = z
      .object({ participantId: z.string().min(1) })
      .parse(request.body ?? {});

    const success = await leaveRealtimeSession(id, participantId);

    if (!success) {
      reply.code(404);
      throw new Error('Session or participant not found');
    }

    return { success };
  });

  app.post('/sessions/:id/heartbeat', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const payload = heartbeatSchema.parse(request.body ?? {});

    const session = await heartbeatRealtimeSession(id, {
      participantId: payload.participantId,
      timestamp: payload.timestamp
    });

    if (!session) {
      reply.code(404);
      throw new Error('Session not found');
    }

    return session;
  });

  app.patch('/sessions/:id/status', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const payload = updateStatusSchema.parse(request.body ?? {});

    const session = await updateRealtimeSessionStatus(id, {
      status: payload.status,
      endedAt: payload.endedAt,
      metadata: payload.metadata
    });

    if (!session) {
      reply.code(404);
      throw new Error('Session not found');
    }

    return session;
  });

  app.delete('/sessions/:id', async (request, reply) => {
    const { id } = sessionIdParamsSchema.parse(request.params);
    const removed = await removeRealtimeSession(id);

    if (!removed) {
      reply.code(404);
      throw new Error('Session not found');
    }

    reply.code(204);
    return null;
  });
}
