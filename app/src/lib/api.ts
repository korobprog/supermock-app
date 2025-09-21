import type {
  CreateMatchRequestPayload,
  CandidateSummaryDto,
  InterviewerSummaryDto,
  MatchOverviewDto,
  MatchPreviewDto,
  MatchRequestWithResultDto,
  ScheduleMatchPayload,
  MatchTokenResponse,
  AvailabilitySlotDto,
  CreateAvailabilityPayload,
  CompleteMatchPayload,
  CompletedSessionDto,
  InterviewerSessionDto,
  SlotDto,
  JoinSlotPayload
} from '../../../shared/src/types/matching.js';
import type {
  CreateRealtimeSessionPayload,
  JoinRealtimeSessionPayload,
  MarkNotificationsReadPayload,
  NotificationDto,
  NotificationImportance,
  NotificationSource,
  RealtimeSessionDto,
  SessionParticipantDto,
  UpdateRealtimeSessionStatusPayload
} from '../../../shared/src/types/realtime.js';
import type {
  CompleteOnboardingPayload,
  CompleteOnboardingResponse,
  UserDto
} from '../../../shared/src/types/user.js';
import type { InterviewAiInsightDto, PlatformStatsDto } from '../../../shared/src/types/analytics.js';
import type { OnboardingProfileDraftPayload, OnboardingProfileDraftResponse } from '@/types/onboarding';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const USE_NEXT_API = typeof window !== 'undefined'; // Use Next.js API routes on client side
const NEXT_API_PROXY_PREFIXES = [
  '/matching/overview',
  '/matching/candidates',
  '/matching/interviewers',
  '/matching/availability',
  '/matching/sessions/recent',
  '/matching/requests',
  '/matching/slots'
] as const;

function shouldUseNextApi(path: string) {
  return NEXT_API_PROXY_PREFIXES.some((prefix) =>
    path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  
  // Only set Content-Type for requests with a body
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add authentication header if available
  if (typeof window !== 'undefined') {
    try {
      const authStore = await import('../store/useAuth');
      const { accessToken } = authStore.useAuth.getState();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log('Adding auth header:', `Bearer ${accessToken.substring(0, 20)}...`);
      } else {
        console.log('No access token found in auth store');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }
  
  // Use Next.js API routes on client side for better CORS handling when a proxy exists
  const baseUrl = USE_NEXT_API && shouldUseNextApi(path) ? '/api' : API_BASE_URL;
  
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...headers,
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchMatchOverview() {
  return request<MatchOverviewDto>('/matching/overview');
}

export function fetchCandidateSummaries() {
  return request<CandidateSummaryDto[]>('/matching/candidates');
}

export function fetchInterviewers() {
  console.log('Fetching interviewers from:', `${API_BASE_URL}/matching/interviewers`);
  return request<InterviewerSummaryDto[]>('/matching/interviewers');
}

export function createMatchRequest(payload: CreateMatchRequestPayload) {
  return request<MatchRequestWithResultDto>('/matching/requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchMatchRequest(id: string) {
  return request<MatchRequestWithResultDto>(`/matching/requests/${id}`);
}

export function fetchMatchPreviews(id: string) {
  return request<{ requestId: string; previews: MatchPreviewDto[] }>(
    `/matching/requests/${id}/previews`
  );
}

export function scheduleMatch(requestId: string, payload: ScheduleMatchPayload) {
  return request<MatchRequestWithResultDto>(`/matching/requests/${requestId}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchInterviewerAvailability(interviewerId: string) {
  return request<AvailabilitySlotDto[]>(`/matching/interviewers/${interviewerId}/availability`);
}

export interface SlotDetailsDto extends Omit<AvailabilitySlotDto, 'language'> {
  participantCapacity: number;
  participantCount: number;
  candidateId?: string | null;
  language?: string | null;
  profession?: string | null;
}

export function fetchSlotDetails(slotId: string) {
  return request<SlotDetailsDto>(`/matching/slots/${slotId}`);
}

export function fetchSlot(slotId: string) {
  return request<SlotDto>(`/matching/slots/${slotId}`);
}

export function createInterviewerAvailabilitySlot(
  interviewerId: string,
  payload: Omit<CreateAvailabilityPayload, 'interviewerId'>
) {
  return request<AvailabilitySlotDto>(`/matching/interviewers/${interviewerId}/availability`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deleteInterviewerAvailabilitySlot(slotId: string) {
  return request<void>(`/matching/availability/${slotId}`, {
    method: 'DELETE'
  });
}

export function joinSlot(slotId: string, payload: JoinSlotPayload) {
  return request<MatchRequestWithResultDto>(`/matching/slots/${slotId}/join`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function completeMatch(matchId: string, payload: CompleteMatchPayload) {
  return request<MatchRequestWithResultDto>(`/matching/matches/${matchId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchMatchToken(matchId: string) {
  return request<MatchTokenResponse>(`/matching/matches/${matchId}/token`, {
    method: 'POST'
  });
}

export function fetchRecentSessions(limit = 5) {
  const search = new URLSearchParams({ limit: String(limit) });
  return request<CompletedSessionDto[]>(`/matching/sessions/recent?${search.toString()}`);
}

export function fetchInterviewerSessions(interviewerId: string, limit = 10) {
  const search = new URLSearchParams({ limit: String(limit) });
  return request<InterviewerSessionDto[]>(
    `/matching/interviewers/${interviewerId}/sessions?${search.toString()}`
  );
}

export function saveOnboardingProfileDraft(payload: OnboardingProfileDraftPayload) {
  return request<OnboardingProfileDraftResponse>('/onboarding/profile/draft', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function completeOnboarding(payload: CompleteOnboardingPayload) {
  return request<CompleteOnboardingResponse>('/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchUser(userId: string) {
  return request<UserDto>(`/users/${userId}`);
}

export type UpdateUserPayload = {
  email?: string;
  role?: UserDto['role'];
  password?: string;
  passwordSaltRounds?: number;
  profile?: Record<string, unknown> | null;
  avatarUrl?: string | null;
};

export function updateUser(userId: string, payload: UpdateUserPayload) {
  return request<UserDto>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function fetchNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
  before?: string;
}) {
  const search = new URLSearchParams();

  if (params?.unreadOnly !== undefined) {
    search.set('unreadOnly', String(params.unreadOnly));
  }

  if (params?.limit) {
    search.set('limit', String(params.limit));
  }

  if (params?.before) {
    search.set('before', params.before);
  }

  const query = search.toString();
  const suffix = query ? `?${query}` : '';

  return request<NotificationDto[]>(`/notifications${suffix}`);
}

export function markNotificationsRead(payload: MarkNotificationsReadPayload) {
  return request<{ updated: number }>('/notifications/read', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function normalizeImportance(value?: NotificationImportance | null | unknown): NotificationImportance {
  if (value === 'high' || value === 'low' || value === 'normal') {
    return value;
  }

  return 'normal';
}

function resolveSource(notification: NotificationDto): NotificationSource | undefined {
  if (notification.source) {
    return notification.source;
  }

  const metadataSource = notification.metadata?.source;
  if (typeof metadataSource === 'string' && metadataSource.trim()) {
    return metadataSource as NotificationSource;
  }

  const [prefix] = notification.type.split('.');
  return prefix ? (prefix as NotificationSource) : undefined;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const NOTIFICATION_DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const NOTIFICATION_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit'
});

const NOTIFICATION_DATETIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

type NotificationPayload = Record<string, unknown> | undefined;

function formatMatchScheduled(payload: NotificationPayload) {
  const slot = (payload?.slot as { start?: string } | undefined) ?? {};
  const role = typeof payload?.role === 'string' ? payload.role : undefined;
  const start = parseDate(slot.start);
  const interviewer = (payload?.interviewer as { displayName?: string } | undefined)?.displayName;
  const candidate = (payload?.candidate as { displayName?: string } | undefined)?.displayName;

  const dateLabel = start ? NOTIFICATION_DATETIME_FORMAT.format(start) : 'скоро';

  if (role === 'candidate') {
    const counterpart = interviewer ? `с ${interviewer}` : '';
    return {
      title: 'Собеседование назначено',
      description: `Сессия ${counterpart ? `${counterpart} ` : ''}назначена на ${dateLabel}.`
    };
  }

  const counterpart = candidate ? `с ${candidate}` : '';
  return {
    title: 'Новая сессия в календаре',
    description: `Вы назначены на сессию ${counterpart ? `${counterpart} ` : ''}${dateLabel}.`
  };
}

function formatDefaultNotification(notification: NotificationDto) {
  const payloadMessage = typeof notification.payload?.message === 'string' ? notification.payload.message : null;

  return {
    title: 'Новое уведомление',
    description: payloadMessage ?? `Событие «${notification.type}»`
  };
}

export interface FormattedNotification {
  id: string;
  title: string;
  description: string;
  channel?: NotificationDto['channel'];
  source?: NotificationSource;
  importance: NotificationImportance;
  createdAt: Date;
  createdAtIso: string;
  createdAtLabel: string;
  dateKey: string;
  timeLabel: string;
  readAt: Date | null;
  isRead: boolean;
  payload?: Record<string, unknown>;
  raw: NotificationDto;
}

export function formatNotification(notification: NotificationDto): FormattedNotification {
  const createdAt = parseDate(notification.createdAt) ?? new Date();
  const readAt = notification.readAt ? parseDate(notification.readAt) : null;
  const source = resolveSource(notification);
  const importance = normalizeImportance(notification.importance ?? notification.metadata?.importance);

  let copy: { title: string; description: string };
  switch (notification.type) {
    case 'match.scheduled':
      copy = formatMatchScheduled(notification.payload);
      break;
    case 'match.assigned':
      copy = formatMatchScheduled(notification.payload);
      break;
    default:
      copy = formatDefaultNotification(notification);
  }

  return {
    id: notification.id,
    title: copy.title,
    description: copy.description,
    channel: notification.channel,
    source,
    importance,
    createdAt,
    createdAtIso: createdAt.toISOString(),
    createdAtLabel: NOTIFICATION_DATETIME_FORMAT.format(createdAt),
    dateKey: NOTIFICATION_DATE_FORMAT.format(createdAt),
    timeLabel: NOTIFICATION_TIME_FORMAT.format(createdAt),
    readAt,
    isRead: Boolean(readAt),
    payload: notification.payload,
    raw: notification
  };
}

type NotificationSubscriptionOptions = {
  token?: string | null;
  onNotification: (notification: NotificationDto) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Error) => void;
};

export type NotificationSubscription = {
  close: () => void;
  reconnect: () => void;
  getReadyState: () => number;
};

async function resolveNotificationToken(token?: string | null) {
  if (token) {
    return token;
  }

  try {
    const authStore = await import('../store/useAuth');
    const { accessToken } = authStore.useAuth.getState();
    return accessToken ?? null;
  } catch (error) {
    console.error('Failed to resolve auth token for notifications', error);
    return null;
  }
}

function buildWebsocketUrl(path: string, token?: string | null) {
  const url = new URL(path, API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}

export function subscribeToNotifications(
  options: NotificationSubscriptionOptions
): NotificationSubscription {
  if (typeof window === 'undefined') {
    return {
      close() {},
      reconnect() {},
      getReadyState() {
        return WebSocket.CLOSED;
      }
    };
  }

  let socket: WebSocket | null = null;
  let manuallyClosed = false;

  const handleOpen = (event: Event) => {
    options.onOpen?.(event);
  };

  const handleClose = (event: CloseEvent) => {
    options.onClose?.(event);
    detach();
    socket = null;
  };

  const handleError = (event: Event) => {
    if (manuallyClosed) {
      return;
    }

    const error = event instanceof ErrorEvent ? event.error ?? event : event;
    const normalizedError =
      error instanceof Error ? error : new Error('WebSocket connection error');
    options.onError?.(normalizedError);
  };

  const handleMessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data ?? '{}');

      if (payload?.type === 'notifications:new' && payload?.data) {
        options.onNotification(payload.data as NotificationDto);
        return;
      }

      if (payload?.type === 'error' && payload?.message) {
        options.onError?.(new Error(String(payload.message)));
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error('Failed to parse notification message')
      );
    }
  };

  const detach = () => {
    if (!socket) {
      return;
    }

    socket.removeEventListener('open', handleOpen);
    socket.removeEventListener('close', handleClose);
    socket.removeEventListener('error', handleError);
    socket.removeEventListener('message', handleMessage as EventListener);
  };

  const connect = async () => {
    const token = await resolveNotificationToken(options.token);

    if (!token) {
      options.onError?.(new Error('Требуется авторизация для подписки на уведомления'));
      return;
    }

    const url = buildWebsocketUrl('/ws/notifications', token);
    socket = new WebSocket(url);
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
    socket.addEventListener('message', handleMessage as EventListener);
  };

  void connect();

  return {
    close() {
      manuallyClosed = true;

      if (socket) {
        detach();
        try {
          socket.close();
        } catch {
          // ignore errors from closing a dead socket
        }
        socket = null;
      }
    },
    reconnect() {
      manuallyClosed = false;

      if (socket) {
        detach();
        try {
          socket.close();
        } catch {
          // ignore close errors
        }
        socket = null;
      }

      void connect();
    },
    getReadyState() {
      return socket?.readyState ?? WebSocket.CLOSED;
    }
  };
}

export function fetchRealtimeSessions(query?: {
  status?: RealtimeSessionDto['status'];
  hostId?: string;
  matchId?: string;
  activeOnly?: boolean;
}) {
  const search = new URLSearchParams();

  if (query?.status) {
    search.set('status', query.status);
  }

  if (query?.hostId) {
    search.set('hostId', query.hostId);
  }

  if (query?.matchId) {
    search.set('matchId', query.matchId);
  }

  if (query?.activeOnly !== undefined) {
    search.set('activeOnly', String(query.activeOnly));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request<RealtimeSessionDto[]>(`/sessions${suffix}`);
}

export function fetchRealtimeSession(id: string) {
  return request<RealtimeSessionDto>(`/sessions/${id}`);
}

export function createRealtimeSession(payload: CreateRealtimeSessionPayload) {
  return request<RealtimeSessionDto>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function joinRealtimeSession(
  sessionId: string,
  payload: JoinRealtimeSessionPayload
) {
  return request<SessionParticipantDto>(`/sessions/${sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function leaveRealtimeSession(sessionId: string, participantId: string) {
  return request<{ success: boolean }>(`/sessions/${sessionId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ participantId })
  });
}

export function heartbeatRealtimeSession(
  sessionId: string,
  payload: { participantId?: string; timestamp?: string } = {}
) {
  return request<RealtimeSessionDto>(`/sessions/${sessionId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateRealtimeSessionStatus(
  sessionId: string,
  payload: UpdateRealtimeSessionStatusPayload
) {
  return request<RealtimeSessionDto>(`/sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteRealtimeSession(sessionId: string) {
  return request<void>(`/sessions/${sessionId}`, {
    method: 'DELETE'
  });
}

export function fetchInterviewAiInsights(matchId: string) {
  return request<InterviewAiInsightDto>(`/analytics/interviews/${matchId}/ai`);
}

export function fetchPlatformStats() {
  return request<PlatformStatsDto>('/analytics/overview');
}
