import { EventEmitter } from 'node:events';

import type { AvailabilitySlotDto } from '../../../../shared/src/types/matching.js';
import type {
  NotificationDto,
  RealtimeSessionDto,
  SessionParticipantDto
} from '../../../../shared/src/types/realtime.js';

export type SlotUpdateEvent = {
  action: 'created' | 'updated' | 'deleted';
  slot: AvailabilitySlotDto;
};

export type SessionBroadcastEvent = {
  action: 'created' | 'updated' | 'deleted' | 'heartbeat' | 'participant_joined' | 'participant_left' | 'restored';
  session: RealtimeSessionDto;
  participant?: SessionParticipantDto;
};

export type NotificationBroadcastEvent = {
  notification: NotificationDto;
};

type EventMap = {
  'slots:update': SlotUpdateEvent;
  'sessions:update': SessionBroadcastEvent;
  'notifications:new': NotificationBroadcastEvent;
};

class RealtimeBus extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.on(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.off(event, listener);
  }
}

export const realtimeBus = new RealtimeBus();

export function emitSlotUpdate(event: SlotUpdateEvent) {
  realtimeBus.emit('slots:update', event);
}

const globalStructuredClone = (globalThis as {
  structuredClone?: <T>(value: T) => T;
}).structuredClone;

function cloneSessionEvent(event: SessionBroadcastEvent): SessionBroadcastEvent {
  if (typeof globalStructuredClone === 'function') {
    return globalStructuredClone(event);
  }

  return JSON.parse(JSON.stringify(event)) as SessionBroadcastEvent;
}

export function emitSessionUpdate(event: SessionBroadcastEvent) {
  realtimeBus.emit('sessions:update', cloneSessionEvent(event));
}

export function emitNotification(event: NotificationBroadcastEvent) {
  realtimeBus.emit('notifications:new', event);
}

export function subscribeToSlotUpdates(listener: (event: SlotUpdateEvent) => void) {
  realtimeBus.on('slots:update', listener);
  return () => realtimeBus.off('slots:update', listener);
}

export function subscribeToSessionUpdates(listener: (event: SessionBroadcastEvent) => void) {
  realtimeBus.on('sessions:update', listener);
  return () => realtimeBus.off('sessions:update', listener);
}

export function subscribeToNotifications(listener: (event: NotificationBroadcastEvent) => void) {
  realtimeBus.on('notifications:new', listener);
  return () => realtimeBus.off('notifications:new', listener);
}
