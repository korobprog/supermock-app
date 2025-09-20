import type { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import { generateInterviewAiInsights, getPlatformStats } from '../modules/analytics.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

const matchIdParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerAnalyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/overview', { preHandler: authorizeRoles(UserRole.ADMIN) }, async () => {
    return getPlatformStats();
  });

  app.get('/analytics/interviews/:id/ai', { preHandler: authenticate }, async (request, reply) => {
    const { id } = matchIdParamsSchema.parse(request.params);

    const insights = await generateInterviewAiInsights(id);

    if (!insights) {
      reply.code(404);
      throw new Error('Match not found');
    }

    return insights;
  });
}
