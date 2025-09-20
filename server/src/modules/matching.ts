import {
  MatchStatus,
  Prisma,
  type InterviewerProfile,
  type InterviewerAvailability,
  type InterviewMatch,
  type InterviewSummary,
  type MatchRequest
} from '@prisma/client';

import type {
  CreateMatchRequestPayload,
  MatchOverviewDto,
  MatchPreviewDto,
  MatchRequestDto,
  MatchRequestWithResultDto,
  MatchResultDto,
  InterviewerSummaryDto,
  CandidateSummaryDto,
  ScheduleMatchPayload,
  AvailabilitySlotDto,
  CreateAvailabilityPayload,
  CompleteMatchPayload,
  CompletedSessionDto,
  InterviewerSessionDto
} from '../../../shared/src/types/matching.js';
import { calculateMatchingScore } from '../../../shared/src/utils/scoring.js';
import { prisma } from './prisma.js';

function toInterviewerSummary(
  interviewer: InterviewerProfile & { availability?: InterviewerAvailability[] }
): InterviewerSummaryDto {
  return {
    id: interviewer.id,
    displayName: interviewer.displayName,
    timezone: interviewer.timezone,
    experienceYears: interviewer.experienceYears,
    languages: interviewer.languages,
    specializations: interviewer.specializations,
    rating: interviewer.rating
  };
}

function mapMatchResult(
  result: InterviewMatch & {
    interviewer: InterviewerProfile & { availability: InterviewerAvailability[] };
    summary?: InterviewSummary | null;
  }
): MatchResultDto {
  return {
    id: result.id,
    status: result.status,
    scheduledAt: result.scheduledAt?.toISOString() ?? null,
    roomUrl: result.roomUrl ?? null,
    effectivenessScore: result.effectivenessScore,
    interviewer: toInterviewerSummary(result.interviewer),
    completedAt: result.completedAt?.toISOString() ?? null,
    summary: result.summary
      ? {
          interviewerNotes: result.summary.interviewerNotes,
          candidateNotes: result.summary.candidateNotes ?? undefined,
          rating: result.summary.rating,
          strengths: result.summary.strengths,
          improvements: result.summary.improvements,
          aiHighlights: result.summary.aiHighlights as Record<string, unknown> | undefined
        }
      : null
  };
}

function mapMatchRequest(
  request: MatchRequest & {
    result?: (InterviewMatch & {
      interviewer: InterviewerProfile & { availability: InterviewerAvailability[] };
      summary?: InterviewSummary | null;
    }) | null;
  }
): MatchRequestWithResultDto {
  const base: MatchRequestDto = {
    id: request.id,
    candidateId: request.candidateId,
    targetRole: request.targetRole,
    focusAreas: request.focusAreas,
    preferredLanguages: request.preferredLanguages,
    sessionFormat: request.sessionFormat,
    notes: request.notes ?? undefined,
    status: request.status,
    matchedAt: request.matchedAt?.toISOString() ?? null,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  };

  if (request.result) {
    return {
      ...base,
      result: mapMatchResult(request.result)
    };
  }

  return {
    ...base,
    result: null
  };
}

export async function getMatchOverview(): Promise<MatchOverviewDto> {
  const [queuedRequests, scheduledMatches, completedMatches] = await prisma.$transaction([
    prisma.matchRequest.count({ where: { status: MatchStatus.QUEUED } }),
    prisma.interviewMatch.count({ where: { status: MatchStatus.SCHEDULED } }),
    prisma.interviewMatch.count({ where: { status: MatchStatus.COMPLETED } })
  ]);

  return {
    queuedRequests,
    scheduledMatches,
    completedMatches
  };
}

export async function createMatchRequest(
  payload: CreateMatchRequestPayload
): Promise<MatchRequestWithResultDto | null> {
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: payload.candidateId }
  });

  if (!candidate) {
    return null;
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48 hours

  const request = await prisma.matchRequest.create({
    data: {
      candidateId: payload.candidateId,
      targetRole: payload.targetRole,
      focusAreas: payload.focusAreas,
      preferredLanguages: payload.preferredLanguages,
      sessionFormat: payload.sessionFormat,
      notes: payload.notes,
      expiresAt
    }
  });

  return mapMatchRequest(request);
}

export async function getMatchRequestById(
  id: string
): Promise<MatchRequestWithResultDto | null> {
  const request = await prisma.matchRequest.findUnique({
    where: { id },
    include: {
      result: {
        include: {
          interviewer: {
            include: {
              availability: true
            }
          },
          summary: true
        }
      }
    }
  });

  if (!request) {
    return null;
  }

  return mapMatchRequest(request);
}

export async function getMatchPreviews(
  requestId: string
): Promise<MatchPreviewDto[] | null> {
  const request = await prisma.matchRequest.findUnique({
    where: { id: requestId },
    include: {
      candidate: true
    }
  });

  if (!request) {
    return null;
  }

  const interviewers = await prisma.interviewerProfile.findMany({
    include: {
      availability: {
        orderBy: { start: 'asc' },
        take: 3
      }
    },
    orderBy: {
      rating: 'desc'
    },
    take: 5
  });

  const candidateTimezone = request.candidate.timezone;
  const candidateFocus = request.focusAreas;

  return interviewers.map((interviewer) => {
    const sharedFocusCount = interviewer.specializations.filter((spec) =>
      candidateFocus.includes(spec)
    ).length;
    const techStackOverlap =
      candidateFocus.length > 0 ? sharedFocusCount / candidateFocus.length : 0;

    const score = calculateMatchingScore({
      professionMatched: interviewer.specializations
        .map((spec) => spec.toLowerCase())
        .includes(request.targetRole.toLowerCase()),
      techStackOverlap,
      languageMatched: interviewer.languages.some((language) =>
        request.preferredLanguages.includes(language)
      ),
      levelMatched: interviewer.experienceYears >= request.candidate.experienceYears + 2,
      timezoneMatched: interviewer.timezone === candidateTimezone
    });

    return {
      interviewer: toInterviewerSummary(interviewer),
      score,
      availability: interviewer.availability.map((slot) => ({
        id: slot.id,
        start: slot.start.toISOString(),
        end: slot.end.toISOString()
      }))
    };
  });
}

export async function listCandidateSummaries(): Promise<CandidateSummaryDto[]> {
  const candidates = await prisma.candidateProfile.findMany({
    orderBy: { createdAt: 'asc' }
  });

  return candidates.map((candidate) => ({
    id: candidate.id,
    displayName: candidate.displayName,
    timezone: candidate.timezone,
    experienceYears: candidate.experienceYears,
    preferredRoles: candidate.preferredRoles,
    preferredLanguages: candidate.preferredLanguages
  }));
}

export async function listInterviewers(): Promise<InterviewerSummaryDto[]> {
  const interviewers = await prisma.interviewerProfile.findMany({
    orderBy: { displayName: 'asc' }
  });

  return interviewers.map((profile) =>
    toInterviewerSummary({
      ...profile,
      availability: []
    })
  );
}

export async function scheduleMatch(
  requestId: string,
  payload: ScheduleMatchPayload
): Promise<MatchRequestWithResultDto | null> {
  const availability = await prisma.interviewerAvailability.findUnique({
    where: { id: payload.availabilityId },
    include: {
      interviewer: {
        include: {
          availability: true
        }
      }
    }
  });

  if (!availability) {
    return null;
  }

  const existingRequest = await prisma.matchRequest.findUnique({ where: { id: requestId } });
  if (!existingRequest) {
    return null;
  }

  const scheduledAt = availability.start;

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await tx.interviewMatch.upsert({
      where: { requestId },
      create: {
        requestId,
        interviewerId: availability.interviewerId,
        scheduledAt,
        roomUrl: payload.roomUrl ?? null,
        status: MatchStatus.SCHEDULED,
        effectivenessScore: 0
      },
      update: {
        interviewerId: availability.interviewerId,
        scheduledAt,
        roomUrl: payload.roomUrl ?? null,
        status: MatchStatus.SCHEDULED
      }
    });

    await tx.matchRequest.update({
      where: { id: requestId },
      data: {
        status: MatchStatus.SCHEDULED,
        matchedAt: new Date()
      }
    });

    await tx.interviewerAvailability.delete({ where: { id: availability.id } });

    return tx.matchRequest.findUnique({
      where: { id: requestId },
      include: {
        result: {
          include: {
            interviewer: {
              include: {
                availability: true
              }
            },
            summary: true
          }
        }
      }
    });
  });

  if (!updatedRequest) {
    return null;
  }

  return mapMatchRequest(updatedRequest);
}

function mapAvailability(slot: InterviewerAvailability): AvailabilitySlotDto {
  return {
    id: slot.id,
    interviewerId: slot.interviewerId,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    isRecurring: slot.isRecurring,
    createdAt: slot.createdAt.toISOString()
  };
}

export async function listInterviewerAvailability(interviewerId: string): Promise<AvailabilitySlotDto[]> {
  const slots = await prisma.interviewerAvailability.findMany({
    where: { interviewerId },
    orderBy: { start: 'asc' }
  });

  return slots.map(mapAvailability);
}

export async function createInterviewerAvailability(
  payload: CreateAvailabilityPayload
): Promise<AvailabilitySlotDto | null> {
  const interviewer = await prisma.interviewerProfile.findUnique({
    where: { id: payload.interviewerId }
  });

  if (!interviewer) {
    return null;
  }

  const start = new Date(payload.start);
  const end = new Date(payload.end);

  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end <= start) {
    return null;
  }

  const overlap = await prisma.interviewerAvailability.findFirst({
    where: {
      interviewerId: payload.interviewerId,
      OR: [
        {
          start: {
            lt: end
          },
          end: {
            gt: start
          }
        }
      ]
    }
  });

  if (overlap) {
    return null;
  }

  const slot = await prisma.interviewerAvailability.create({
    data: {
      interviewerId: payload.interviewerId,
      start,
      end,
      isRecurring: payload.isRecurring ?? false
    }
  });

  return mapAvailability(slot);
}

export async function deleteInterviewerAvailability(id: string): Promise<boolean> {
  const existing = await prisma.interviewerAvailability.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.interviewerAvailability.delete({ where: { id } });
  return true;
}

export async function completeMatch(
  matchId: string,
  payload: CompleteMatchPayload
): Promise<MatchRequestWithResultDto | null> {
  const match = await prisma.interviewMatch.findUnique({
    where: { id: matchId },
    include: {
      request: true
    }
  });

  if (!match) {
    return null;
  }

  const completedAt = new Date();

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await tx.interviewMatch.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        effectivenessScore: payload.effectivenessScore,
        completedAt,
        summary: {
          upsert: {
            create: {
              interviewerNotes: payload.interviewerNotes,
              candidateNotes: payload.candidateNotes,
              strengths: payload.strengths ?? [],
              improvements: payload.improvements ?? [],
              rating:
                payload.rating ?? Math.min(5, Math.max(0, Math.round(payload.effectivenessScore / 20))),
              aiHighlights: payload.aiHighlights
                ? (payload.aiHighlights as Prisma.InputJsonValue)
                : Prisma.DbNull
            },
            update: {
              interviewerNotes: payload.interviewerNotes,
              candidateNotes: payload.candidateNotes,
              strengths: payload.strengths ?? [],
              improvements: payload.improvements ?? [],
              rating:
                payload.rating ?? Math.min(5, Math.max(0, Math.round(payload.effectivenessScore / 20))),
              aiHighlights: payload.aiHighlights
                ? (payload.aiHighlights as Prisma.InputJsonValue)
                : Prisma.DbNull
            }
          }
        },
        request: {
          update: {
            status: MatchStatus.COMPLETED
          }
        }
      }
    });

    return tx.matchRequest.findUnique({
      where: { id: match.requestId },
      include: {
        result: {
          include: {
            interviewer: {
              include: {
                availability: true
              }
            },
            summary: true
          }
        }
      }
    });
  });

  if (!updatedRequest) {
    return null;
  }

  return mapMatchRequest(updatedRequest);
}

export async function listRecentSessions(limit = 10): Promise<CompletedSessionDto[]> {
  const matches = await prisma.interviewMatch.findMany({
    where: {
      status: MatchStatus.COMPLETED
    },
    orderBy: {
      completedAt: 'desc'
    },
    take: limit,
    include: {
      interviewer: true,
      summary: true,
      request: true
    }
  });

  return matches.map((match) => ({
    id: match.id,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    completedAt: match.completedAt?.toISOString() ?? new Date().toISOString(),
    effectivenessScore: match.effectivenessScore,
    candidateId: match.request.candidateId,
    interviewer: toInterviewerSummary({ ...match.interviewer, availability: [] }),
    summary: match.summary
      ? {
          interviewerNotes: match.summary.interviewerNotes,
          candidateNotes: match.summary.candidateNotes ?? undefined,
          rating: match.summary.rating,
          strengths: match.summary.strengths,
          improvements: match.summary.improvements,
          aiHighlights: match.summary.aiHighlights as Record<string, unknown> | undefined
        }
      : null
  }));
}

export async function getInterviewerSessions(interviewerId: string, limit = 10): Promise<InterviewerSessionDto[]> {
  const matches = await prisma.interviewMatch.findMany({
    where: {
      interviewerId,
      status: {
        in: [MatchStatus.SCHEDULED, MatchStatus.COMPLETED]
      }
    },
    orderBy: {
      scheduledAt: 'desc'
    },
    take: limit,
    include: {
      summary: true,
      request: true
    }
  });

  return matches.map((match) => ({
    id: match.id,
    status: match.status,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    completedAt: match.completedAt?.toISOString() ?? null,
    effectivenessScore: match.effectivenessScore,
    candidateId: match.request.candidateId,
    targetRole: match.request.targetRole,
    focusAreas: match.request.focusAreas,
    preferredLanguages: match.request.preferredLanguages,
    summary: match.summary
      ? {
          interviewerNotes: match.summary.interviewerNotes,
          candidateNotes: match.summary.candidateNotes ?? undefined,
          rating: match.summary.rating,
          strengths: match.summary.strengths,
          improvements: match.summary.improvements,
          aiHighlights: match.summary.aiHighlights as Record<string, unknown> | undefined
        }
      : null
  }));
}
