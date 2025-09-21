import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { FastifyJWT } from '@fastify/jwt';

import {
  subscribeToNotifications,
  subscribeToSessionUpdates,
  subscribeToSlotUpdates
} from '../modules/realtime/bus.js';
import { listInterviewerAvailability } from '../modules/matching.js';

const UNAUTHORIZED_CLOSE_CODE = 1008;
const UNAUTHORIZED_CLOSE_REASON = 'Unauthorized';

type RealtimeAuthQuery = {
  token?: string;
};

type WebSocketLike = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  on: (event: 'close', listener: () => void) => void;
};

type AuthenticatedConnection = {
  socket?: WebSocketLike | null;
  user?: FastifyJWT['user'];
} & Partial<WebSocketLike> & Record<string, unknown>;

function getSocket(connection: AuthenticatedConnection): WebSocketLike | null {
  if (connection.socket && typeof connection.socket.send === 'function') {
    return connection.socket;
  }

  if (
    typeof connection.send === 'function' &&
    typeof connection.close === 'function' &&
    typeof connection.on === 'function'
  ) {
    return connection as WebSocketLike;
  }

  return null;
}

function sendJson(connection: AuthenticatedConnection, payload: unknown) {
  const socket = getSocket(connection);

  if (!socket) {
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    // no-op: avoid crashing due to closed sockets
  }
}

function closeUnauthorized(connection: AuthenticatedConnection) {
  const socket = getSocket(connection);

  if (!socket) {
    return;
  }

  try {
    socket.close(UNAUTHORIZED_CLOSE_CODE, UNAUTHORIZED_CLOSE_REASON);
  } catch {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }
}

function extractToken(request: FastifyRequest): string | null {
  const authorizationHeader = request.headers['authorization'];
  const headerValue = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

  if (typeof headerValue === 'string') {
    const bearerMatch = headerValue.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return bearerMatch[1].trim();
    }

    const trimmedHeader = headerValue.trim();
    if (trimmedHeader) {
      return trimmedHeader;
    }
  }

  const { token } = (request as FastifyRequest<{ Querystring: RealtimeAuthQuery }>).query ?? {};

  if (typeof token === 'string' && token.trim()) {
    return token.trim();
  }

  return null;
}

async function verifyToken(app: FastifyInstance, token: string): Promise<FastifyJWT['user']> {
  const fastifyWithJwt = app as FastifyInstance & {
    jwt?: {
      verify: (
        token: string
      ) => FastifyJWT['user'] | (FastifyJWT['user'] & Record<string, unknown>) | Promise<FastifyJWT['user'] | (FastifyJWT['user'] & Record<string, unknown>)>;
    };
  };

  if (!fastifyWithJwt.jwt || typeof fastifyWithJwt.jwt.verify !== 'function') {
    throw new Error('JWT plugin is not registered');
  }

  const decoded = (await fastifyWithJwt.jwt.verify(token)) as FastifyJWT['user'] & Record<string, unknown>;

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    emailVerified: decoded.emailVerified
  };
}

async function authenticateRealtimeConnection(
  app: FastifyInstance,
  request: FastifyRequest,
  connection: AuthenticatedConnection
): Promise<FastifyJWT['user'] | null> {
  const token = extractToken(request);

  if (!token) {
    request.log.warn('Missing token for websocket connection');
    closeUnauthorized(connection);
    return null;
  }

  try {
    const user = await verifyToken(app, token);

    (request as FastifyRequest & { user: FastifyJWT['user'] }).user = user;
    connection.user = user;

    return user;
  } catch (error) {
    request.log.error({ err: error }, 'Failed to verify websocket token');
    closeUnauthorized(connection);
    return null;
  }
}

type SlotsQuery = RealtimeAuthQuery & {
  interviewerId?: string;
};

type NotificationsQuery = RealtimeAuthQuery;

type SessionQuery = RealtimeAuthQuery & {
  hostId?: string;
};

export function registerRealtimeWebsocketRoutes(app: FastifyInstance) {
  app.get('/ws/slots', { websocket: true }, async (connection: any, request) => {
    const authConnection = connection as AuthenticatedConnection;
    const { interviewerId } = (request as FastifyRequest<{ Querystring: SlotsQuery }>).query ?? {};

    if (!(await authenticateRealtimeConnection(app, request, authConnection))) {
      return;
    }

    if (interviewerId) {
      try {
        const slots = await listInterviewerAvailability(interviewerId);
        sendJson(authConnection, { type: 'slots:initial', data: slots });
      } catch (error) {
        sendJson(authConnection, {
          type: 'error',
          message: 'Failed to load availability for interviewer'
        });
      }
    } else {
      sendJson(authConnection, { type: 'slots:ready' });
    }

    const unsubscribe = subscribeToSlotUpdates((event) => {
      if (interviewerId && event.slot.interviewerId !== interviewerId) {
        return;
      }

      sendJson(authConnection, { type: 'slots:update', data: event });
    });

    getSocket(authConnection)?.on('close', () => {
      unsubscribe();
    });
  });

  app.get('/ws/notifications', { websocket: true }, async (connection: any, request) => {
    const authConnection = connection as AuthenticatedConnection;

    const user = await authenticateRealtimeConnection(app, request, authConnection);
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToNotifications((event) => {
      if (event.notification.userId !== user.id) {
        return;
      }

      sendJson(authConnection, { type: 'notifications:new', data: event.notification });
    });

    getSocket(authConnection)?.on('close', () => {
      unsubscribe();
    });
  });

  app.get('/ws/sessions', { websocket: true }, async (connection: any, request) => {
    const authConnection = connection as AuthenticatedConnection;
    const { hostId } = (request as FastifyRequest<{ Querystring: SessionQuery }>).query ?? {};

    if (!(await authenticateRealtimeConnection(app, request, authConnection))) {
      return;
    }

    const unsubscribe = subscribeToSessionUpdates((event) => {
      if (hostId && event.session.hostId !== hostId) {
        return;
      }

      sendJson(authConnection, { type: 'sessions:update', data: event });
    });

    getSocket(authConnection)?.on('close', () => {
      unsubscribe();
    });
  });
}
