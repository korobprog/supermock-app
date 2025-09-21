import fastify, { type FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authPlugin from '../../src/plugins/auth.plugin.js';
import { registerMatchingRoutes } from '../../src/routes/matching.route.js';
import { registerRealtimeSessionRoutes } from '../../src/routes/sessions.route.js';
import type { AppConfig } from '../../src/modules/config.js';

describe('matching & sessions route authorization', () => {
  let app: FastifyInstance;

  const config: AppConfig = {
    port: 0,
    host: '127.0.0.1',
    corsOrigins: [],
    logLevel: 'silent',
    jwt: {
      secret: 'test-secret',
      accessTokenTtl: '1h',
      refreshTokenTtl: '7d'
    },
    password: {
      saltRounds: 10
    },
    dailyCo: {
      enabled: false,
      apiKey: '',
      domain: ''
    }
  };

  function signToken(role: UserRole) {
    return app.jwt.sign({
      id: `user-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      emailVerified: true
    });
  }

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(authPlugin, { config });
    registerMatchingRoutes(app, {
      dailyCo: { service: null, domain: undefined, enabled: false }
    });
    registerRealtimeSessionRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for matching endpoints without authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/matching/candidates' });
    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for matching endpoints with insufficient role', async () => {
    const token = signToken(UserRole.CANDIDATE);

    const response = await app.inject({
      method: 'GET',
      url: '/matching/candidates',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 401 for sessions endpoints without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: { hostId: 'interviewer-1' }
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for sessions endpoints with insufficient role', async () => {
    const token = signToken(UserRole.CANDIDATE);

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: { hostId: 'interviewer-1' }
    });

    expect(response.statusCode).toBe(403);
  });
});
