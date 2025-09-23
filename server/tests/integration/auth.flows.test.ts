import fastify, { type FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../src/modules/config.js';
import rateLimitPlugin from '../../src/plugins/rate-limit.plugin.js';

vi.mock('@prisma/client', () => ({
  UserRole: {
    CANDIDATE: 'CANDIDATE',
    INTERVIEWER: 'INTERVIEWER'
  }
}));

vi.mock('../../src/modules/prisma.js', () => {
  type UserRecord = {
    id: string;
    email: string;
    passwordHash: string | null;
    emailVerifiedAt: Date | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };

  type RefreshTokenRecord = {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    createdByIp?: string;
    userAgent?: string;
    revokedAt?: Date | null;
    revokedByIp?: string | null;
    replacedByTokenHash?: string | null;
  };

  type EmailVerificationTokenRecord = {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    verifiedAt?: Date | null;
  };

  type PasswordResetTokenRecord = {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    usedAt?: Date | null;
  };

  type AuditLogRecord = {
    id: string;
    userId?: string | null;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  };

  const initialState = () => ({
    usersById: new Map<string, UserRecord>(),
    usersByEmail: new Map<string, UserRecord>(),
    refreshTokensById: new Map<string, RefreshTokenRecord>(),
    refreshTokensByHash: new Map<string, string>(),
    emailTokensById: new Map<string, EmailVerificationTokenRecord>(),
    emailTokensByHash: new Map<string, string>(),
    passwordTokensById: new Map<string, PasswordResetTokenRecord>(),
    passwordTokensByHash: new Map<string, string>(),
    auditLogs: new Map<string, AuditLogRecord>(),
    sequence: 0
  });

  const state = initialState();

  const cloneUser = (user: UserRecord | undefined | null) => {
    if (!user) {
      return null;
    }

    return { ...user };
  };

  const cloneRefreshToken = (token: RefreshTokenRecord) => ({ ...token });
  const cloneEmailToken = (token: EmailVerificationTokenRecord) => ({ ...token });
  const clonePasswordToken = (token: PasswordResetTokenRecord) => ({ ...token });

  const nextId = (prefix: string) => {
    state.sequence += 1;
    return `${prefix}_${state.sequence}`;
  };

  const prisma = {
    user: {
      create: async ({ data }: { data: { email: string; passwordHash?: string; role: string } }) => {
        const normalizedEmail = data.email;

        if (state.usersByEmail.has(normalizedEmail)) {
          throw Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), { code: 'P2002' });
        }

        const record: UserRecord = {
          id: nextId('user'),
          email: normalizedEmail,
          passwordHash: data.passwordHash ?? null,
          emailVerifiedAt: null,
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        state.usersById.set(record.id, record);
        state.usersByEmail.set(record.email, record);

        return { ...record };
      },
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
        const user = where.id ? state.usersById.get(where.id) : state.usersByEmail.get(where.email ?? '');
        return cloneUser(user);
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = state.usersById.get(where.id);

        if (!user) {
          throw new Error('User not found');
        }

        if ('passwordHash' in data) {
          user.passwordHash = (data as { passwordHash: string }).passwordHash;
        }

        if ('emailVerifiedAt' in data) {
          const value = (data as { emailVerifiedAt: Date | null }).emailVerifiedAt;
          user.emailVerifiedAt = value ?? user.emailVerifiedAt;
        }

        user.updatedAt = new Date();

        state.usersById.set(user.id, user);
        state.usersByEmail.set(user.email, user);

        return { ...user };
      }
    },
    refreshToken: {
      create: async ({ data }: { data: Omit<RefreshTokenRecord, 'id' | 'createdAt'> }) => {
        const record: RefreshTokenRecord = {
          id: nextId('rt'),
          createdAt: new Date(),
          revokedAt: null,
          revokedByIp: null,
          replacedByTokenHash: null,
          ...data
        };

        state.refreshTokensById.set(record.id, record);
        state.refreshTokensByHash.set(record.tokenHash, record.id);

        return cloneRefreshToken(record);
      },
      findUnique: async ({
        where,
        include
      }: {
        where: { tokenHash: string };
        include?: { user?: boolean; User?: boolean };
      }) => {
        const id = state.refreshTokensByHash.get(where.tokenHash);

        if (!id) {
          return null;
        }

        const token = state.refreshTokensById.get(id);

        if (!token) {
          return null;
        }

        const record = cloneRefreshToken(token) as RefreshTokenRecord & {
          user?: UserRecord | null;
          User?: UserRecord | null;
        };

        if (include?.user || include?.User) {
          const relatedUser = cloneUser(state.usersById.get(token.userId) ?? null);
          record.user = relatedUser;
          record.User = relatedUser;
        }

        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<RefreshTokenRecord> }) => {
        const token = state.refreshTokensById.get(where.id);

        if (!token) {
          throw new Error('Refresh token not found');
        }

        Object.assign(token, data);

        state.refreshTokensById.set(token.id, token);

        if (data.tokenHash) {
          state.refreshTokensByHash.set(data.tokenHash, token.id);
        }

        return cloneRefreshToken(token);
      },
      updateMany: async ({ where, data }: { where: { userId?: string; revokedAt?: null }; data: Partial<RefreshTokenRecord> }) => {
        let count = 0;

        state.refreshTokensById.forEach((token) => {
          if (where.userId && token.userId !== where.userId) {
            return;
          }

          if (where.revokedAt === null && token.revokedAt !== null && token.revokedAt !== undefined) {
            return;
          }

          Object.assign(token, data);
          state.refreshTokensById.set(token.id, token);
          count += 1;
        });

        return { count };
      }
    },
    emailVerificationToken: {
      create: async ({ data }: { data: Omit<EmailVerificationTokenRecord, 'id' | 'createdAt' | 'verifiedAt'> }) => {
        const record: EmailVerificationTokenRecord = {
          id: nextId('evt'),
          createdAt: new Date(),
          verifiedAt: null,
          ...data
        };

        state.emailTokensById.set(record.id, record);
        state.emailTokensByHash.set(record.tokenHash, record.id);

        return cloneEmailToken(record);
      },
      findUnique: async ({
        where,
        include
      }: {
        where: { tokenHash: string };
        include?: { user?: boolean; User?: boolean };
      }) => {
        const id = state.emailTokensByHash.get(where.tokenHash);

        if (!id) {
          return null;
        }

        const token = state.emailTokensById.get(id);

        if (!token) {
          return null;
        }

        const record = cloneEmailToken(token) as EmailVerificationTokenRecord & {
          user?: UserRecord | null;
          User?: UserRecord | null;
        };

        if (include?.user || include?.User) {
          const relatedUser = cloneUser(state.usersById.get(token.userId) ?? null);
          record.user = relatedUser;
          record.User = relatedUser;
        }

        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<EmailVerificationTokenRecord> }) => {
        const token = state.emailTokensById.get(where.id);

        if (!token) {
          throw new Error('Email verification token not found');
        }

        Object.assign(token, data);
        state.emailTokensById.set(token.id, token);

        return cloneEmailToken(token);
      },
      deleteMany: async ({ where }: { where: { userId?: string; verifiedAt?: null; id?: { not?: string } } }) => {
        let count = 0;

        state.emailTokensById.forEach((token, id) => {
          if (where.userId && token.userId !== where.userId) {
            return;
          }

          if (where.verifiedAt === null && token.verifiedAt !== null && token.verifiedAt !== undefined) {
            return;
          }

          if (where.id?.not && id === where.id.not) {
            return;
          }

          state.emailTokensById.delete(id);
          state.emailTokensByHash.delete(token.tokenHash);
          count += 1;
        });

        return { count };
      }
    },
    passwordResetToken: {
      create: async ({ data }: { data: Omit<PasswordResetTokenRecord, 'id' | 'createdAt' | 'usedAt'> }) => {
        const record: PasswordResetTokenRecord = {
          id: nextId('prt'),
          createdAt: new Date(),
          usedAt: null,
          ...data
        };

        state.passwordTokensById.set(record.id, record);
        state.passwordTokensByHash.set(record.tokenHash, record.id);

        return clonePasswordToken(record);
      },
      findUnique: async ({
        where,
        include
      }: {
        where: { tokenHash: string };
        include?: { user?: boolean; User?: boolean };
      }) => {
        const id = state.passwordTokensByHash.get(where.tokenHash);

        if (!id) {
          return null;
        }

        const token = state.passwordTokensById.get(id);

        if (!token) {
          return null;
        }

        const record = clonePasswordToken(token) as PasswordResetTokenRecord & {
          user?: UserRecord | null;
          User?: UserRecord | null;
        };

        if (include?.user || include?.User) {
          const relatedUser = cloneUser(state.usersById.get(token.userId) ?? null);
          record.user = relatedUser;
          record.User = relatedUser;
        }

        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<PasswordResetTokenRecord> }) => {
        const token = state.passwordTokensById.get(where.id);

        if (!token) {
          throw new Error('Password reset token not found');
        }

        Object.assign(token, data);
        state.passwordTokensById.set(token.id, token);

        return clonePasswordToken(token);
      }
    },
    auditLog: {
      create: async ({ data }: { data: { userId?: string | null; action: string; ipAddress?: string | null; userAgent?: string | null; metadata?: Record<string, unknown> | null } }) => {
        const record: AuditLogRecord = {
          id: nextId('log'),
          createdAt: new Date(),
          userId: data.userId ?? null,
          action: data.action,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          metadata: data.metadata ?? null
        };

        state.auditLogs.set(record.id, record);

        return { ...record };
      }
    }
  } satisfies Record<string, unknown>;

  const reset = () => {
    const fresh = initialState();

    state.usersById = fresh.usersById;
    state.usersByEmail = fresh.usersByEmail;
    state.refreshTokensById = fresh.refreshTokensById;
    state.refreshTokensByHash = fresh.refreshTokensByHash;
    state.emailTokensById = fresh.emailTokensById;
    state.emailTokensByHash = fresh.emailTokensByHash;
    state.passwordTokensById = fresh.passwordTokensById;
    state.passwordTokensByHash = fresh.passwordTokensByHash;
    state.auditLogs = fresh.auditLogs;
    state.sequence = fresh.sequence;
  };

  return {
    prisma,
    __mockDb: {
      reset
    }
  };
});

const { __mockDb } = await import('../../src/modules/prisma.js');
const { registerAuthRoutes } = await import('../../src/routes/auth.route.js');
const authPluginModule = await import('../../src/plugins/auth.plugin.js');
const authPlugin = authPluginModule.default;

const buildTestConfig = (): AppConfig => ({
  port: 0,
  host: '127.0.0.1',
  corsOrigins: [],
  logLevel: 'silent',
  jwt: {
    secret: 'test-secret',
    accessTokenTtl: '15m',
    refreshTokenTtl: '7d'
  },
  password: {
    saltRounds: 4
  },
  dailyCo: {
    enabled: false,
    apiKey: '',
    domain: ''
  },
  ai: {
    serviceUrl: null,
    defaultProvider: null,
    requestTimeoutMs: 5000,
    serviceToken: null,
    providers: {
      openrouter: null,
      openai: null,
      anthropic: null,
      groq: null
    }
  },
  rateLimit: {
    global: {
      max: 1000,
      timeWindow: '1 minute'
    },
    critical: {
      max: 1000,
      timeWindow: '1 minute'
    }
  }
});

const captureRandomTokens = () => {
  const tokens: string[] = [];
  const original = crypto.randomBytes;
  const spy = vi.spyOn(crypto, 'randomBytes').mockImplementation((size: number, callback?: any) => {
    const buffer = original.call(crypto, size, callback) as unknown as Buffer;
    if (size >= 32 && buffer) {
      tokens.push(buffer.toString('hex'));
    }
    return buffer;
  });

  return {
    tokens,
    restore: () => spy.mockRestore()
  };
};

describe('Auth HTTP flows', () => {
  let app: FastifyInstance;
  let config: AppConfig;

  beforeEach(async () => {
    __mockDb.reset();
    config = buildTestConfig();
    app = fastify({ logger: false });
    await app.register(rateLimitPlugin, { config });
    await app.register(authPlugin, { config });
    registerAuthRoutes(app, config);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('signs up, authenticates, refreshes tokens and verifies email', async () => {
    const { tokens: generatedTokens, restore } = captureRandomTokens();

    const signupResponse = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'candidate@example.com',
        password: 'Password123!',
        role: 'candidate'
      }
    });

    expect(signupResponse.statusCode).toBe(201);
    const signupBody = signupResponse.json();

    expect(signupBody.user).toMatchObject({
      email: 'candidate@example.com',
      role: 'CANDIDATE',
      emailVerified: false
    });
    expect(signupBody.tokens.refreshToken).toBeDefined();
    expect(signupBody.verification).toEqual({ status: 'pending' });

    expect(generatedTokens.length).toBe(2);
    const signupRefreshToken = generatedTokens[0];
    const emailVerificationToken = generatedTokens[1];
    expect(signupBody.tokens.refreshToken).toBe(signupRefreshToken);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'candidate@example.com',
        password: 'Password123!'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse.json();

    expect(loginBody.tokens.refreshToken).toBeDefined();
    expect(generatedTokens.length).toBe(3);
    const loginRefreshToken = generatedTokens[2];
    expect(loginBody.tokens.refreshToken).toBe(loginRefreshToken);

    const accessToken = loginBody.tokens.accessToken as string;

    const profileResponse = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(profileResponse.statusCode).toBe(200);
    const profileBody = profileResponse.json();
    expect(profileBody.user.email).toBe('candidate@example.com');

    const candidateResourceResponse = await app.inject({
      method: 'GET',
      url: '/auth/me/candidate',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(candidateResourceResponse.statusCode).toBe(200);

    const interviewerResourceResponse = await app.inject({
      method: 'GET',
      url: '/auth/me/interviewer',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(interviewerResourceResponse.statusCode).toBe(403);

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken: loginRefreshToken
      }
    });

    expect(refreshResponse.statusCode).toBe(200);
    const refreshBody = refreshResponse.json();
    expect(refreshBody.tokens.refreshToken).toBeDefined();
    expect(generatedTokens.length).toBe(4);
    const rotatedRefreshToken = generatedTokens[3];
    expect(refreshBody.tokens.refreshToken).toBe(rotatedRefreshToken);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: {
        token: emailVerificationToken
      }
    });

    expect(verifyResponse.statusCode).toBe(200);
    const verifyBody = verifyResponse.json();
    expect(verifyBody.user.emailVerified).toBe(true);

    restore();
  });

  it('handles password reset workflow and revokes previous refresh tokens', async () => {
    const { tokens: generatedTokens, restore } = captureRandomTokens();

    const signupResponse = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'forgot@example.com',
        password: 'InitialPass1!',
        role: 'candidate'
      }
    });

    expect(signupResponse.statusCode).toBe(201);
    const signupBody = signupResponse.json();
    const originalRefreshToken = signupBody.tokens.refreshToken as string;

    expect(generatedTokens.length).toBe(2);

    const resetRequestResponse = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        mode: 'request',
        email: 'forgot@example.com'
      }
    });

    expect(resetRequestResponse.statusCode).toBe(200);
    const resetRequestBody = resetRequestResponse.json();
    expect(resetRequestBody).toEqual({ requested: true, userExists: true });

    expect(generatedTokens.length).toBe(3);
    const resetToken = generatedTokens[2];

    const resetConfirmResponse = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        mode: 'confirm',
        token: resetToken,
        password: 'NewSecret45!'
      }
    });

    expect(resetConfirmResponse.statusCode).toBe(200);
    const resetConfirmBody = resetConfirmResponse.json();
    expect(resetConfirmBody.reset).toBe(true);
    expect(resetConfirmBody.tokens.accessToken).toBeDefined();

    const oldPasswordLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'forgot@example.com',
        password: 'InitialPass1!'
      }
    });

    expect(oldPasswordLogin.statusCode).toBe(401);

    const newPasswordLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'forgot@example.com',
        password: 'NewSecret45!'
      }
    });

    expect(newPasswordLogin.statusCode).toBe(200);
    const newLoginBody = newPasswordLogin.json();
    expect(newLoginBody.tokens.refreshToken).toBeDefined();

    const refreshWithOldToken = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken: originalRefreshToken
      }
    });

    expect(refreshWithOldToken.statusCode).toBe(401);

    restore();
  });
});
