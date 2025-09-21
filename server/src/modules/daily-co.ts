const DAILY_API_BASE_URL = 'https://api.daily.co/v1';

export type DailyCoConfig = {
  apiKey: string;
  domain: string;
};

export type DailyCoRoom = {
  id: string;
  name: string;
  url: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  created_at?: string;
};

export type DailyCoRoomProperties = {
  exp?: number;
  enable_knocking?: boolean;
  enable_screenshare?: boolean;
  enable_chat?: boolean;
  max_participants?: number;
  eject_on_exp?: boolean;
  eject_after_elapsed?: number;
};

export type CreateDailyCoRoomOptions = {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: DailyCoRoomProperties;
};

export type GenerateDailyTokenOptions = {
  isOwner?: boolean;
  userName?: string;
  exp?: number;
};

export type DailyCoMeetingToken = {
  token: string;
  room_name: string;
  is_owner: boolean;
  user_name?: string;
  exp?: number;
};

function sanitizeRoomPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  );
}

export class DailyCoService {
  private readonly apiKey: string;

  private readonly domain: string;

  constructor(config: DailyCoConfig) {
    if (!config.apiKey) {
      throw new Error('Daily.co API key is required');
    }

    if (!config.domain) {
      throw new Error('Daily.co domain is required');
    }

    this.apiKey = config.apiKey;
    this.domain = config.domain;
  }

  getDomain(): string {
    return this.domain;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${DAILY_API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...init.headers
      },
      ...init
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Daily.co request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async createRoom(options: CreateDailyCoRoomOptions = {}): Promise<DailyCoRoom> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const defaultExpiration = nowInSeconds + 60 * 90; // 90 minutes

    const payload = sanitizeRoomPayload({
      name: options.name,
      privacy: options.privacy ?? 'private',
      properties: {
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        eject_on_exp: true,
        max_participants: 4,
        exp: defaultExpiration,
        ...(options.properties ?? {})
      }
    });

    return this.request<DailyCoRoom>('/rooms', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async generateToken(roomName: string, options: GenerateDailyTokenOptions = {}): Promise<DailyCoMeetingToken> {
    if (!roomName) {
      throw new Error('roomName is required to generate a Daily.co meeting token');
    }

    const payload = sanitizeRoomPayload({
      properties: {
        room_name: roomName,
        is_owner: options.isOwner ?? false,
        user_name: options.userName,
        exp: options.exp
      }
    });

    return this.request<DailyCoMeetingToken>('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteRoom(roomName: string): Promise<void> {
    if (!roomName) {
      throw new Error('roomName is required to delete a Daily.co room');
    }

    await this.request(`/rooms/${encodeURIComponent(roomName)}`, {
      method: 'DELETE'
    });
  }
}
