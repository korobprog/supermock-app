import { describe, expect, it } from 'vitest';

import { buildConfig } from '../../src/modules/config.js';

describe('buildConfig', () => {
  it('parses default configuration', () => {
    const config = buildConfig({});
    expect(config.port).toBe(4000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(config.logLevel).toBe('info');
  });

  it('parses comma separated cors origins', () => {
    const config = buildConfig({
      CORS_ORIGIN: 'https://example.com, https://supermock.ru'
    });

    expect(config.corsOrigins).toEqual(['https://example.com', 'https://supermock.ru']);
  });
});
