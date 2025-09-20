import type { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  listInvitations,
  revokeInvitation
} from '../modules/invitations.js';
import { authorizeRoles } from '../utils/auth.js';

const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(UserRole),
  ttlHours: z.number().min(1).max(24 * 30).optional(),
  metadata: z.record(z.any()).optional()
});

const listInvitationsQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'revoked']).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.nativeEnum(UserRole).optional()
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1).optional()
});

const invitationIdParamsSchema = z.object({
  id: z.string().min(1)
});

const invitationTokenParamsSchema = z.object({
  token: z.string().min(1)
});

export function registerInvitationRoutes(app: FastifyInstance) {
  app.get('/users/invitations', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const query = listInvitationsQuerySchema.parse(request.query);
    return listInvitations(query);
  });

  app.post('/users/invitations', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const payload = createInvitationSchema.parse(request.body ?? {});
    const ttlMs = payload.ttlHours ? payload.ttlHours * 60 * 60 * 1000 : undefined;
    const actor = request.user as { id?: string } | undefined;

    const invitation = await createInvitation({
      email: payload.email,
      role: payload.role,
      ttlMs,
      metadata: payload.metadata,
      invitedById: actor?.id
    });

    return invitation;
  });

  app.post('/users/invitations/:id/revoke', { preHandler: authorizeRoles(UserRole.ADMIN) }, async (request) => {
    const { id } = invitationIdParamsSchema.parse(request.params);
    const actor = request.user as { id?: string } | undefined;

    const invitation = await revokeInvitation(id, actor?.id);
    return invitation;
  });

  app.post('/users/invitations/accept', async (request) => {
    const payload = acceptInvitationSchema.parse(request.body ?? {});
    return acceptInvitation(payload.token, payload.userId);
  });

  app.get('/users/invitations/:token', async (request, reply) => {
    const { token } = invitationTokenParamsSchema.parse(request.params);
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      reply.code(404);
      throw new Error('Invitation not found');
    }

    return invitation;
  });
}
