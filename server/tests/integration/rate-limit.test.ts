import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/modules/config.js';
import rateLimitPlugin from '../../src/plugins/rate-limit.plugin.js';

describe('Rate limiting for critical routes', () => {
  let app: FastifyInstance;
  let config: AppConfig;

  const buildConfig = (): AppConfig => ({
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
    rateLimit: {
      global: {
        max: 100,
        timeWindow: '1 minute'
      },
      critical: {
        max: 2,
        timeWindow: '1 minute'
      }
    }
  });

  beforeEach(async () => {
    config = buildConfig();
    app = fastify({ logger: false });
    await app.register(rateLimitPlugin, { config });

    app.post('/auth/test', async () => ({ ok: true }));
    app.get('/matching/test', async () => ({ ok: true }));

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 when auth routes exceed the configured limit for an IP address', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.10' };

    for (let attempt = 0; attempt < config.rateLimit.critical.max; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/test',
        headers
      });

      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/auth/test',
      headers
    });

    expect(blocked.statusCode).toBe(429);

    const differentIp = await app.inject({
      method: 'POST',
      url: '/auth/test',
      headers: { 'x-forwarded-for': '198.51.100.42' }
    });

    expect(differentIp.statusCode).toBe(200);
  });

  it('returns 429 when matching routes exceed the configured limit for an IP address', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.20' };

    for (let attempt = 0; attempt < config.rateLimit.critical.max; attempt += 1) {
      const response = await app.inject({
        method: 'GET',
        url: '/matching/test',
        headers
      });

      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'GET',
      url: '/matching/test',
      headers
    });

    expect(blocked.statusCode).toBe(429);

    const differentIp = await app.inject({
      method: 'GET',
      url: '/matching/test',
      headers: { 'x-forwarded-for': '198.51.100.99' }
    });

    expect(differentIp.statusCode).toBe(200);
  });
});
