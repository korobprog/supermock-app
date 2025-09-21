import { EventEmitter } from 'node:events';

export type MatchingEventMap = {
  'matchRequest.created': { requestId: string };
};

class MatchingEventBus extends EventEmitter {
  emit<K extends keyof MatchingEventMap>(event: K, payload: MatchingEventMap[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends keyof MatchingEventMap>(event: K, listener: (payload: MatchingEventMap[K]) => void): this {
    return super.on(event, listener);
  }

  off<K extends keyof MatchingEventMap>(event: K, listener: (payload: MatchingEventMap[K]) => void): this {
    return super.off(event, listener);
  }
}

const matchingEventBus = new MatchingEventBus();

export function emitMatchRequestCreated(requestId: string) {
  matchingEventBus.emit('matchRequest.created', { requestId });
}

export function onMatchRequestCreated(listener: (payload: { requestId: string }) => void) {
  matchingEventBus.on('matchRequest.created', listener);
  return () => matchingEventBus.off('matchRequest.created', listener);
}
