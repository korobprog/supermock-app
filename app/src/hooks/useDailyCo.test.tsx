import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDailyCo } from './useDailyCo';

class FakeCallObject {
  handlers = new Map<string, Set<(event: any) => void>>();

  participantsState = {
    local: {
      session_id: 'local',
      user_name: 'local-user',
      tracks: {
        video: { state: 'playable' },
        audio: { state: 'playable' }
      }
    }
  };

  join = vi.fn().mockResolvedValue(undefined);

  leave = vi.fn().mockResolvedValue(undefined);

  destroy = vi.fn().mockResolvedValue(undefined);

  setLocalVideo = vi.fn();

  setLocalAudio = vi.fn();

  participants() {
    return this.participantsState as any;
  }

  on(event: string, handler: (event: any) => void) {
    const listeners = this.handlers.get(event) ?? new Set();
    listeners.add(handler);
    this.handlers.set(event, listeners);
    return this;
  }

  off(event: string, handler: (event: any) => void) {
    const listeners = this.handlers.get(event);
    if (listeners) {
      listeners.delete(handler);
      if (!listeners.size) {
        this.handlers.delete(event);
      }
    }
    return this;
  }

  emit(event: string, payload?: Record<string, unknown>) {
    const listeners = this.handlers.get(event);
    if (!listeners) {
      return;
    }
    listeners.forEach((listener) => {
      listener(payload ?? ({ action: event } as any));
    });
  }
}

const createFrameMock = vi.fn((parent: HTMLElement) => {
  const instance = new FakeCallObject();
  const store = (globalThis as any).__dailyInstances as FakeCallObject[] | undefined;
  if (store) {
    store.push(instance);
  } else {
    (globalThis as any).__dailyInstances = [instance];
  }
  return instance;
});

vi.mock('@daily-co/daily-js', () => ({
  default: {
    createFrame: createFrameMock
  }
}));

declare global {
  // eslint-disable-next-line no-var
  var __dailyInstances: FakeCallObject[] | undefined;
}

beforeEach(() => {
  (globalThis as any).__dailyInstances = [];
  createFrameMock.mockClear();
});

afterEach(() => {
  (globalThis as any).__dailyInstances = [];
});

describe('useDailyCo', () => {
  it('creates call object and joins on demand', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { result, rerender } = renderHook((props: Parameters<typeof useDailyCo>[0]) => useDailyCo(props), {
      initialProps: {
        roomUrl: null as string | null,
        token: null as string | null,
        autoJoin: false,
        userName: undefined as string | undefined
      }
    });

    act(() => {
      (result.current.containerRef as any).current = container;
    });

    rerender({
      roomUrl: 'https://example.daily.co/test-room' as string | null,
      token: 'token-123' as string | null,
      autoJoin: false,
      userName: 'Interviewer'
    });

    await act(async () => {
      await Promise.resolve();
    });

    const instances = (globalThis as any).__dailyInstances as FakeCallObject[];
    expect(instances).toHaveLength(1);
    const call = instances[0];

    await act(async () => {
      await result.current.join();
    });

    expect(call.join).toHaveBeenCalledTimes(1);

    act(() => {
      call.emit('joining-meeting');
      call.emit('joined-meeting');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    document.body.removeChild(container);
  });

  it('handles media toggles and errors', async () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { result, rerender } = renderHook((props: Parameters<typeof useDailyCo>[0]) => useDailyCo(props), {
      initialProps: {
        roomUrl: null as string | null,
        token: null as string | null,
        autoJoin: false,
        userName: undefined as string | undefined
      }
    });

    act(() => {
      (result.current.containerRef as any).current = container;
    });

    rerender({
      roomUrl: 'https://example.daily.co/test-room' as string | null,
      token: 'token-123' as string | null,
      autoJoin: false,
      userName: 'Host'
    });

    await act(async () => {
      await Promise.resolve();
    });

    const call = ((globalThis as any).__dailyInstances as FakeCallObject[])[0];

    act(() => {
      call.emit('joined-meeting');
    });

    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      await result.current.toggleCamera();
    });
    expect(call.setLocalVideo).toHaveBeenCalled();

    await act(async () => {
      await result.current.toggleMicrophone();
    });
    expect(call.setLocalAudio).toHaveBeenCalled();

    act(() => {
      call.emit('error', { error: { message: 'network issue' } });
    });

    expect(result.current.error).toBe('network issue');
    expect(result.current.isConnected).toBe(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(call.join).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
    vi.useRealTimers();
  });
});
