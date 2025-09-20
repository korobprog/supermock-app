import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  subscribeToNotifications,
  subscribeToSessionUpdates,
  subscribeToSlotUpdates
} from '../modules/realtime/bus.js';
import { listInterviewerAvailability } from '../modules/matching.js';

function sendJson(connection: any, payload: unknown) {
  try {
    connection.socket.send(JSON.stringify(payload));
  } catch (error) {
    // no-op: avoid crashing due to closed sockets
  }
}

type SlotsQuery = {
  interviewerId?: string;
};

type NotificationsQuery = {
  userId?: string;
};

type SessionQuery = {
  hostId?: string;
};

export function registerRealtimeWebsocketRoutes(app: FastifyInstance) {
  app.get('/ws/slots', { websocket: true }, async (connection: any, request) => {
    const { interviewerId } = (request as FastifyRequest<{ Querystring: SlotsQuery }>).query ?? {};

    if (interviewerId) {
      try {
        const slots = await listInterviewerAvailability(interviewerId);
        sendJson(connection, { type: 'slots:initial', data: slots });
      } catch (error) {
        sendJson(connection, {
          type: 'error',
          message: 'Failed to load availability for interviewer'
        });
      }
    } else {
      sendJson(connection, { type: 'slots:ready' });
    }

    const unsubscribe = subscribeToSlotUpdates((event) => {
      if (interviewerId && event.slot.interviewerId !== interviewerId) {
        return;
      }

      sendJson(connection, { type: 'slots:update', data: event });
    });

    connection.socket.on('close', () => {
      unsubscribe();
    });
  });

  app.get('/ws/notifications', { websocket: true }, (connection: any, request) => {
    const { userId } = (request as FastifyRequest<{ Querystring: NotificationsQuery }>).query ?? {};

    const unsubscribe = subscribeToNotifications((event) => {
      if (userId && event.notification.userId !== userId) {
        return;
      }

      sendJson(connection, { type: 'notifications:new', data: event.notification });
    });

    connection.socket.on('close', () => {
      unsubscribe();
    });
  });

  app.get('/ws/sessions', { websocket: true }, (connection: any, request) => {
    const { hostId } = (request as FastifyRequest<{ Querystring: SessionQuery }>).query ?? {};

    const unsubscribe = subscribeToSessionUpdates((event) => {
      if (hostId && event.session.hostId !== hostId) {
        return;
      }

      sendJson(connection, { type: 'sessions:update', data: event });
    });

    connection.socket.on('close', () => {
      unsubscribe();
    });
  });
}
