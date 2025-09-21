import type {
  CreateMatchRequestPayload,
  CandidateSummaryDto,
  InterviewerSummaryDto,
  MatchOverviewDto,
  MatchPreviewDto,
  MatchRequestWithResultDto,
  ScheduleMatchPayload,
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
  RealtimeSessionDto,
  SessionParticipantDto,
  UpdateRealtimeSessionStatusPayload
} from '../../../shared/src/types/realtime.js';
import type { CompleteOnboardingPayload, CompleteOnboardingResponse } from '../../../shared/src/types/user.js';
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
