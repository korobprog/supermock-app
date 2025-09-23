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
    expect(config.ai).toEqual({
      serviceUrl: null,
      defaultProvider: null,
      requestTimeoutMs: 15000,
      serviceToken: null,
      providers: {
        openrouter: null,
        openai: null,
        anthropic: null,
        groq: null
      }
    });
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

  it('extracts AI configuration from environment variables', () => {
    const config = buildConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      AI_SERVICE_URL: ' https://ai.example.com ',
      AI_SERVICE_TOKEN: ' bearer-token ',
      DEFAULT_AI_PROVIDER: 'anthropic',
      AI_REQUEST_TIMEOUT_MS: '22000',
      OPENROUTER_API_KEY: 'router-key',
      OPENAI_API_KEY: 'openai-key',
      ANTHROPIC_API_KEY: 'anthropic-key',
      GROQ_API_KEY: 'groq-key'
    });

    expect(config.ai).toEqual({
      serviceUrl: 'https://ai.example.com',
      defaultProvider: 'anthropic',
      requestTimeoutMs: 22000,
      serviceToken: 'bearer-token',
      providers: {
        openrouter: 'router-key',
        openai: 'openai-key',
        anthropic: 'anthropic-key',
        groq: 'groq-key'
      }
    });
  });
});
