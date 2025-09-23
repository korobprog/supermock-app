import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

export type AiRouteDependencies = {
  httpClient: typeof fetch;
  serviceUrl: string | null;
  requestTimeoutMs?: number;
  defaultProvider?: string | null;
  serviceToken?: string | null;
  headers?: Record<string, string>;
};

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).default('user'),
  content: z.string().trim().min(1, 'Message content is required')
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1, 'At least one message is required'),
  provider: z.string().trim().min(1).optional(),
  metadata: z.record(z.any()).optional()
});

const feedbackRequestSchema = z.object({
  transcript: z.string().trim().min(1, 'Interview transcript is required'),
  highlights: z.array(z.string().trim().min(1)).optional(),
  language: z.string().trim().min(2).max(8).optional(),
  provider: z.string().trim().min(1).optional(),
  metadata: z.record(z.any()).optional()
});

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
}

function parseResponseBody(body: string): unknown {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function proxyAiRequest(
  reply: FastifyReply,
  deps: AiRouteDependencies,
  path: string,
  payload: Record<string, unknown>
) {
  const { httpClient, serviceUrl, requestTimeoutMs = 15000, serviceToken, headers } = deps;

  if (!serviceUrl) {
    reply.code(503);
    return { error: 'AI service is not configured' };
  }

  const url = joinUrl(serviceUrl, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...(headers ?? {})
  };

  if (serviceToken) {
    baseHeaders.authorization = `Bearer ${serviceToken}`;
  }

  try {
    const response = await httpClient(url, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawBody = await response.text();
    const parsed = parseResponseBody(rawBody);

    if (!response.ok) {
      reply.code(response.status || 502);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }

      return { error: 'AI service request failed', details: parsed ?? null };
    }

    return parsed ?? {};
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      reply.code(504);
      return { error: 'AI service request timed out' };
    }

    reply.code(502);
    return { error: 'Failed to reach AI service' };
  } finally {
    clearTimeout(timer);
  }
}

export function registerAiRoutes(app: FastifyInstance, deps: AiRouteDependencies) {
  app.post('/ai/chat', async (request, reply) => {
    const { provider, ...rest } = chatRequestSchema.parse(request.body ?? {});
    const providerName = provider ?? deps.defaultProvider ?? undefined;
    const payload = providerName ? { ...rest, provider: providerName } : rest;

    return proxyAiRequest(reply, deps, '/chat', payload);
  });

  app.post('/ai/feedback', async (request, reply) => {
    const { provider, ...rest } = feedbackRequestSchema.parse(request.body ?? {});
    const providerName = provider ?? deps.defaultProvider ?? undefined;
    const payload = providerName ? { ...rest, provider: providerName } : rest;

    return proxyAiRequest(reply, deps, '/feedback', payload);
  });
}
