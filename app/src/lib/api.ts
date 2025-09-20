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
  InterviewerSessionDto
} from '../../../shared/src/types/matching.js';
import type { OnboardingProfileDraftPayload, OnboardingProfileDraftResponse } from '@/types/onboarding';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
