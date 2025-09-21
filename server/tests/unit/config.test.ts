import { describe, expect, it } from 'vitest';

import { buildConfig } from '../../src/modules/config.js';

describe('buildConfig', () => {
  it('parses default configuration', () => {
    const config = buildConfig({});
    expect(config.port).toBe(4000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(config.logLevel).toBe('info');
    expect(config.jwt.secret).toBe('supermock-dev-secret');
    expect(config.rateLimit).toEqual({
      global: {
        max: 100,
        timeWindow: '1 minute'
      },
      critical: {
        max: 100,
        timeWindow: '1 minute'
      }
    });
  });

  it('parses comma separated cors origins', () => {
    const config = buildConfig({
      CORS_ORIGIN: 'https://example.com, https://supermock.ru'
    });

    expect(config.corsOrigins).toEqual(['https://example.com', 'https://supermock.ru']);
  });

  it('throws a helpful error when JWT_SECRET is missing outside development', () => {
    expect(() =>
      buildConfig({
        NODE_ENV: 'production'
      })
    ).toThrowError('JWT_SECRET must be provided when NODE_ENV is not "development".');
  });

  it('uses provided JWT_SECRET when present', () => {
    const config = buildConfig({
      NODE_ENV: 'production',
      JWT_SECRET: ' top-secret '
    });

    expect(config.jwt.secret).toBe('top-secret');
  });
});
