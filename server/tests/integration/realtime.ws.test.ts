import fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import WebSocket from 'ws';
import { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import authPlugin from '../../src/plugins/auth.plugin.js';
import { registerRealtimeWebsocketRoutes } from '../../src/routes/realtime.ws.js';
import type { AppConfig } from '../../src/modules/config.js';
import { emitNotification } from '../../src/modules/realtime/bus.js';

type JwtUserPayload = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CANDIDATE' | 'INTERVIEWER';
  emailVerified: boolean;
};

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

const waitForOpen = (ws: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Timed out waiting for websocket open'));
    }, 1000);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });

    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForClose = (ws: WebSocket) => {
  if (ws.readyState === WebSocket.CLOSED) {
    return Promise.resolve({ code: 1000, reason: '' });
  }

  return new Promise<{ code: number; reason: string }>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('Timed out waiting for websocket close'));
    }, 2000);

    ws.once('close', (code, reasonBuffer) => {
      clearTimeout(timer);
      const reason = typeof reasonBuffer === 'string' ? reasonBuffer : reasonBuffer.toString();
      resolve({ code, reason });
    });

    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }

    await delay(10);
  }

  throw new Error('Timed out waiting for condition');
}

describe('Realtime websocket authentication', () => {
  let app: FastifyInstance;
  let baseUrl: string;

  const signToken = async (user: JwtUserPayload) => {
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
  };

  beforeEach(async () => {
    const config = buildTestConfig();
    app = fastify({ logger: false });
    await app.register(websocket);
    await app.register(authPlugin, { config });
    registerRealtimeWebsocketRoutes(app);
    await app.listen({ port: 0, host: '127.0.0.1' });

    const address = app.server.address() as AddressInfo;
    baseUrl = `ws://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects websocket connections without a token', async () => {
    const ws = new WebSocket(`${baseUrl}/ws/notifications`);

    const closeEvent = await waitForClose(ws);

    expect(closeEvent.code).toBe(1008);
    expect(closeEvent.reason).toBe('Unauthorized');
  });

  it('only delivers notifications for the authenticated user', async () => {
    const [candidateToken, interviewerToken] = await Promise.all([
      signToken({
        id: 'user-candidate',
        email: 'candidate@example.com',
        role: 'CANDIDATE',
        emailVerified: true
      }),
      signToken({
        id: 'user-interviewer',
        email: 'interviewer@example.com',
        role: 'INTERVIEWER',
        emailVerified: true
      })
    ]);

    const candidateSocket = new WebSocket(
      `${baseUrl}/ws/notifications?token=${encodeURIComponent(candidateToken)}`
    );
    const interviewerSocket = new WebSocket(`${baseUrl}/ws/notifications`, {
      headers: {
        Authorization: `Bearer ${interviewerToken}`
      }
    });

    await Promise.all([waitForOpen(candidateSocket), waitForOpen(interviewerSocket)]);

    const candidateMessages: unknown[] = [];
    const interviewerMessages: unknown[] = [];
    const socketClosures: Array<{ socket: 'candidate' | 'interviewer'; code: number; reason: string }> = [];

    candidateSocket.on('message', (data) => {
      candidateMessages.push(JSON.parse(data.toString()));
    });

    interviewerSocket.on('message', (data) => {
      interviewerMessages.push(JSON.parse(data.toString()));
    });

    candidateSocket.on('close', (code, reasonBuffer) => {
      const reason = typeof reasonBuffer === 'string' ? reasonBuffer : reasonBuffer.toString();
      socketClosures.push({ socket: 'candidate', code, reason });
    });

    interviewerSocket.on('close', (code, reasonBuffer) => {
      const reason = typeof reasonBuffer === 'string' ? reasonBuffer : reasonBuffer.toString();
      socketClosures.push({ socket: 'interviewer', code, reason });
    });

    const closeSockets = async () => {
      const pending: Array<Promise<unknown>> = [];

      if (candidateSocket.readyState !== WebSocket.CLOSED) {
        pending.push(waitForClose(candidateSocket));
        candidateSocket.close();
      }

      if (interviewerSocket.readyState !== WebSocket.CLOSED) {
        pending.push(waitForClose(interviewerSocket));
        interviewerSocket.close();
      }

      await Promise.all(pending);
    };

    try {
      emitNotification({
        notification: {
          id: 'notif-1',
          userId: 'user-candidate',
          type: 'test',
          channel: null,
          payload: { message: 'candidate' },
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await waitFor(() => candidateMessages.length === 1);
      await delay(20);
      expect(interviewerMessages.length).toBe(0);
      expect(socketClosures).toEqual([]);

      emitNotification({
        notification: {
          id: 'notif-2',
          userId: 'user-interviewer',
          type: 'test',
          channel: null,
          payload: { message: 'interviewer' },
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await waitFor(() => interviewerMessages.length === 1);
      await delay(20);
      expect(candidateMessages.length).toBe(1);

      expect(candidateMessages).toHaveLength(1);
      expect(interviewerMessages).toHaveLength(1);
      expect(socketClosures).toEqual([]);
    } finally {
      await closeSockets();
    }
  });
});
