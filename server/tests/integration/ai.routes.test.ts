import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerAiRoutes, type AiRouteDependencies } from '../../src/routes/ai.route.js';

function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('AI HTTP routes', () => {
  let app: FastifyInstance;
  let httpClient: ReturnType<typeof vi.fn>;
  let deps: AiRouteDependencies;

  beforeEach(async () => {
    app = fastify({ logger: false });
    httpClient = vi.fn();
    deps = {
      httpClient,
      serviceUrl: 'https://ai.supermock.test',
      requestTimeoutMs: 5000,
      defaultProvider: 'openrouter',
      serviceToken: 'test-token'
    };

    registerAiRoutes(app, deps);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards chat requests to the configured AI service', async () => {
    const responseBody = { id: 'chat-1', reply: 'Привет!' };
    httpClient.mockResolvedValue(createJsonResponse(200, responseBody));

    const response = await app.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: {
        messages: [{ role: 'user', content: 'Hello!' }],
        metadata: { locale: 'en' }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(responseBody);

    expect(httpClient).toHaveBeenCalledTimes(1);
    expect(httpClient).toHaveBeenCalledWith(
      'https://ai.supermock.test/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer test-token'
        })
      })
    );

    const [, init] = httpClient.mock.calls[0];
    const requestInit = init as RequestInit;
    expect(requestInit).toBeDefined();
    const body = typeof requestInit.body === 'string' ? requestInit.body : '';
    expect(body).not.toBe('');
    const parsedBody = JSON.parse(body);
    expect(parsedBody).toMatchObject({
      provider: 'openrouter',
      messages: [{ role: 'user', content: 'Hello!' }],
      metadata: { locale: 'en' }
    });
  });

  it('proxies feedback generation requests and returns the upstream payload', async () => {
    const responseBody = {
      summary: 'Candidate showed strong system design fundamentals.',
      highlights: ['Clear trade-off analysis', 'Structured approach']
    };
    httpClient.mockResolvedValue(createJsonResponse(200, responseBody));

    const response = await app.inject({
      method: 'POST',
      url: '/ai/feedback',
      payload: {
        transcript: 'Q: How would you design a URL shortener? ...',
        language: 'en'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(responseBody);

    const [, init] = httpClient.mock.calls[0];
    const requestInit = init as RequestInit;
    expect(requestInit).toBeDefined();
    const body = typeof requestInit.body === 'string' ? requestInit.body : '';
    expect(body).not.toBe('');
    const parsedBody = JSON.parse(body);
    expect(parsedBody).toMatchObject({
      transcript: expect.stringContaining('URL shortener'),
      provider: 'openrouter'
    });
  });

  it('returns 503 when the AI service URL is not configured', async () => {
    const otherApp = fastify({ logger: false });
    registerAiRoutes(otherApp, {
      ...deps,
      serviceUrl: null
    });
    await otherApp.ready();

    const response = await otherApp.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: { messages: [{ role: 'user', content: 'Ping' }] }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'AI service is not configured' });

    await otherApp.close();
  });
});
