import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';

export const authenticate = async (request: FastifyRequest, _reply: FastifyReply) => {
  await request.jwtVerify();
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    const payload = request.user;

    if (!roles.includes(payload.role)) {
      const error = new Error('Forbidden');
      (error as { statusCode?: number }).statusCode = 403;
      throw error;
    }
  };
};
