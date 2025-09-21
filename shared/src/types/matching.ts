import type { MatchingScore } from '../utils/scoring.js';

export type SessionFormat = 'SYSTEM_DESIGN' | 'CODING' | 'BEHAVIORAL' | 'MIXED';

export interface CreateMatchRequestPayload {
  candidateId: string;
  targetRole: string;
  focusAreas: string[];
  preferredLanguages: string[];
  sessionFormat: SessionFormat;
  notes?: string;
}

export interface MatchRequestDto extends CreateMatchRequestPayload {
  id: string;
  status: string;
  matchedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResultDto {
  id: string;
  status: string;
  scheduledAt?: string | null;
  roomUrl?: string | null;
  roomId?: string | null;
  effectivenessScore: number;
  interviewer: InterviewerSummaryDto;
  completedAt?: string | null;
  summary?: InterviewSummaryDto | null;
}

export interface MatchRequestWithResultDto extends MatchRequestDto {
  result?: MatchResultDto | null;
}

export interface ScheduleMatchPayload {
  availabilityId: string;
  roomUrl?: string;
}

export interface MatchTokenResponse {
  token: string;
}

export interface CompleteMatchPayload {
  effectivenessScore: number;
  interviewerNotes: string;
  candidateNotes?: string;
  strengths?: string[];
  improvements?: string[];
  rating?: number;
  aiHighlights?: Record<string, unknown>;
}

export interface InterviewerSummaryDto {
  id: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  languages: string[];
  specializations: string[];
  rating: number;
}

export interface CandidateSummaryDto {
  id: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  preferredRoles: string[];
  preferredLanguages: string[];
}

export interface MatchPreviewDto {
  interviewer: InterviewerSummaryDto;
  score: MatchingScore;
  availability: {
    id: string;
    start: string;
    end: string;
  }[];
}

export interface MatchOverviewDto {
  queuedRequests: number;
  scheduledMatches: number;
  completedMatches: number;
}

export interface AvailabilitySlotDto {
  id: string;
  interviewerId: string;
  start: string;
  end: string;
  isRecurring: boolean;
  language?: string;
  createdAt: string;
}

export type SlotParticipantRole = 'CANDIDATE' | 'INTERVIEWER' | 'OBSERVER';

export interface SlotParticipantDto {
  id: string;
  role: SlotParticipantRole;
  waitlistPosition: number | null;
  joinedAt: string;
  candidate?: CandidateSummaryDto;
  interviewer?: InterviewerSummaryDto;
}

export interface SlotHostDto {
  profile: InterviewerSummaryDto;
  name: string;
}

export interface SlotDto {
  id: string;
  interviewerId: string;
  start: string;
  end: string;
  isRecurring: boolean;
  capacity: number;
  createdAt: string;
  host: SlotHostDto;
  participants: SlotParticipantDto[];
  waitlistCount: number;
}

export type JoinSlotMatchRequestPayload = Omit<CreateMatchRequestPayload, 'candidateId'>;

export interface JoinSlotPayload {
  role: SlotParticipantRole;
  candidateId?: string;
  interviewerId?: string;
  matchRequest?: JoinSlotMatchRequestPayload;
}

export interface CreateAvailabilityPayload {
  interviewerId: string;
  start: string; // ISO string
  end: string; // ISO string
  isRecurring?: boolean;
  language?: string;
}

export interface InterviewSummaryDto {
  interviewerNotes: string;
  candidateNotes?: string;
  rating: number;
  strengths: string[];
  improvements: string[];
  aiHighlights?: Record<string, unknown>;
}

export interface CompletedSessionDto {
  id: string;
  scheduledAt?: string | null;
  completedAt: string;
  effectivenessScore: number;
  candidateId: string;
  interviewer: InterviewerSummaryDto;
  summary?: InterviewSummaryDto | null;
}

export interface InterviewerSessionDto {
  id: string;
  status: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  effectivenessScore: number;
  candidateId: string;
  targetRole: string;
  focusAreas: string[];
  preferredLanguages: string[];
  summary?: InterviewSummaryDto | null;
}
