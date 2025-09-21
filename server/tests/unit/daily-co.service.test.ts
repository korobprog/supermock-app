import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { DailyCoService } from '../../src/modules/daily-co.js';

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    // @ts-expect-error allow cleanup for tests
    delete global.fetch;
  }
});

describe('DailyCoService', () => {
  it('creates a room with provided options', async () => {
    const response = {
      id: 'rm_123',
      name: 'room-123',
      url: 'https://example.daily.co/room-123',
      api_created: true,
      privacy: 'private' as const
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response
    } as unknown as Response);

    const service = new DailyCoService({ apiKey: 'test-key', domain: 'example.daily.co' });

    const result = await service.createRoom({
      name: 'room-123',
      properties: { exp: 1_700_000_000 }
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.daily.co/v1/rooms', expect.objectContaining({
      method: 'POST'
    }));

    const [, init] = (global.fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(body).toMatchObject({
      name: 'room-123',
      privacy: 'private',
      properties: expect.objectContaining({
        exp: 1_700_000_000,
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true
      })
    });

    expect(result).toEqual(response);
  });

  it('generates meeting token for a room', async () => {
    const tokenResponse = {
      token: 'meeting-token',
      room_name: 'room-456',
      is_owner: true,
      user_name: 'Host'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tokenResponse
    } as unknown as Response);

    const service = new DailyCoService({ apiKey: 'test-key', domain: 'example.daily.co' });

    const result = await service.generateToken('room-456', {
      isOwner: true,
      userName: 'Host'
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.daily.co/v1/meeting-tokens', expect.objectContaining({
      method: 'POST'
    }));

    const [, init] = (global.fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(body).toMatchObject({
      properties: {
        room_name: 'room-456',
        is_owner: true,
        user_name: 'Host'
      }
    });

    expect(result).toEqual(tokenResponse);
  });

  it('deletes a room by name', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    } as unknown as Response);

    const service = new DailyCoService({ apiKey: 'test-key', domain: 'example.daily.co' });

    await service.deleteRoom('room-789');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.daily.co/v1/rooms/room-789',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
