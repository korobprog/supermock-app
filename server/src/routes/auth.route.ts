import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import type { AppConfig } from '../modules/config.js';
import {
  AuthError,
  signupUser,
  loginUser,
  refreshSession,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getUserProfile
} from '../modules/auth.js';
import {
  findSessionById,
  listAccountSecurity,
  revokeSessionById
} from '../modules/account.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';
import { getRequestIp } from '../utils/request-ip.js';

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must contain at least 8 characters'),
  role: z.enum(['candidate', 'interviewer'])
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32)
});

const resetPasswordSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('request'), email: z.string().trim().toLowerCase().email() }),
  z.object({
    mode: z.literal('confirm'),
    token: z.string().min(32),
    password: z.string().min(8, 'Password must contain at least 8 characters')
  })
]);

const verifySchema = z.object({
  token: z.string().min(32)
});

const sessionQuerySchema = z.object({
  userId: z.string().min(1).optional()
});

const sessionParamsSchema = z.object({
  id: z.string().min(1)
});

type RequestMetadata = {
  ipAddress: string;
  userAgent?: string;
};

type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    role: UserRole;
  };
};

const roleMap: Record<'candidate' | 'interviewer', UserRole> = {
  candidate: UserRole.CANDIDATE,
  interviewer: UserRole.INTERVIEWER
};

function extractMetadata(request: FastifyRequest): RequestMetadata {
  const userAgentHeader = request.headers['user-agent'];
  return {
    ipAddress: getRequestIp(request),
    userAgent: typeof userAgentHeader === 'string' ? userAgentHeader : undefined
  };
}

async function signAccessToken(app: FastifyInstance, user: { id: string; email: string; role: UserRole; emailVerified: boolean }) {
  const fastifyWithJwt = app as FastifyInstance & {
    jwt?: {
      sign: (payload: unknown) => string | Promise<string>;
    };
  };

  if (!fastifyWithJwt.jwt || typeof fastifyWithJwt.jwt.sign !== 'function') {
    throw new Error('JWT plugin is not registered');
  }

  return fastifyWithJwt.jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified
  });
}

function mapAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    reply.code(error.statusCode);
    return error;
  }

  return error;
}

function ensureSelfOrAdmin(request: AuthenticatedRequest, reply: FastifyReply, targetUserId: string) {
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  if (request.user.id !== targetUserId) {
    reply.code(403);
    throw new Error('Forbidden');
  }
}

export function registerAuthRoutes(app: FastifyInstance, config: AppConfig) {
  app.post('/auth/signup', async (request, reply) => {
    try {
      const payload = signupSchema.parse(request.body);
      const metadata = extractMetadata(request);

      const result = await signupUser(payload.email, payload.password, roleMap[payload.role], config, metadata);
      const accessToken = await signAccessToken(app, result.user);

      reply.code(201);
      return {
        user: result.user,
        tokens: {
          accessToken,
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString()
        },
        verification: {
          status: 'pending'
        }
      };
    } catch (error) {
      throw mapAuthError(reply, error);
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const payload = loginSchema.parse(request.body);
      const metadata = extractMetadata(request);
      const result = await loginUser(payload.email, payload.password, config, metadata);
      const accessToken = await signAccessToken(app, result.user);

      return {
        user: result.user,
        tokens: {
          accessToken,
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString()
        }
      };
    } catch (error) {
      throw mapAuthError(reply, error);
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    try {
      const payload = refreshSchema.parse(request.body);
      const metadata = extractMetadata(request);
      const result = await refreshSession(payload.refreshToken, config, metadata);
      const accessToken = await signAccessToken(app, result.user);

      return {
        user: result.user,
        tokens: {
          accessToken,
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString()
        }
      };
    } catch (error) {
      throw mapAuthError(reply, error);
    }
  });

  app.post('/auth/reset-password', async (request, reply) => {
    try {
      const payload = resetPasswordSchema.parse(request.body);
      const metadata = extractMetadata(request);

      if (payload.mode === 'request') {
        const result = await requestPasswordReset(payload.email, metadata);

        return {
          requested: true,
          userExists: result.userExists
        };
      }

      const user = await resetPassword(payload.token, payload.password, config, metadata);
      const accessToken = await signAccessToken(app, user);

      return {
        reset: true,
        user,
        tokens: {
          accessToken
        }
      };
    } catch (error) {
      throw mapAuthError(reply, error);
    }
  });

  app.post('/auth/verify-email', async (request, reply) => {
    try {
      const payload = verifySchema.parse(request.body);
      const metadata = extractMetadata(request);
      const user = await verifyEmail(payload.token, metadata);
      const accessToken = await signAccessToken(app, user);

      return {
        verified: true,
        user,
        tokens: {
          accessToken
        }
      };
    } catch (error) {
      throw mapAuthError(reply, error);
    }
  });

  app.get('/auth/me', { preHandler: [authenticate] }, async (request) => {
    const user = await getUserProfile(request.user.id);

    if (!user) {
      throw new Error('User not found');
    }

    return { user };
  });

  app.get('/auth/sessions', { preHandler: [authenticate] }, async (request, reply) => {
    const query = sessionQuerySchema.parse(request.query ?? {});
    const targetUserId = query.userId ?? request.user.id;

    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, targetUserId);

    const data = await listAccountSecurity(targetUserId);
    return data;
  });

  app.delete('/auth/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const params = sessionParamsSchema.parse(request.params ?? {});
    const session = await findSessionById(params.id);

    if (!session) {
      reply.code(404);
      throw new Error('Session not found');
    }

    ensureSelfOrAdmin(request as AuthenticatedRequest, reply, session.userId);

    const metadata = extractMetadata(request);
    const result = await revokeSessionById(params.id, {
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      actorUserId: request.user.id
    });

    return { revoked: true, session: result };
  });

  app.get(
    '/auth/me/candidate',
    {
      preHandler: [authorizeRoles(UserRole.CANDIDATE)]
    },
    async (request) => {
      const user = await getUserProfile(request.user.id);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        user,
        role: 'candidate-only-resource'
      };
    }
  );

  app.get(
    '/auth/me/interviewer',
    {
      preHandler: [authorizeRoles(UserRole.INTERVIEWER)]
    },
    async (request) => {
      const user = await getUserProfile(request.user.id);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        user,
        role: 'interviewer-only-resource'
      };
    }
  );
}
