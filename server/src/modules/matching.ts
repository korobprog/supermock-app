import crypto from 'node:crypto';

import {
  MatchStatus,
  Prisma,
  SlotParticipantRole as PrismaSlotParticipantRole,
  type CandidateProfile,
  type InterviewerProfile,
  type InterviewerAvailability,
  type InterviewMatch,
  type InterviewSummary,
  type MatchRequest,
  type SlotParticipant
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
  InterviewerSessionDto,
  SlotDto,
  JoinSlotPayload,
  SlotParticipantRole as SlotParticipantRoleDto
} from '../../../shared/src/types/matching.js';
import { calculateMatchingScore } from '../../../shared/src/utils/scoring.js';
import { prisma } from './prisma.js';
import { emitSlotUpdate } from './realtime/bus.js';
import type { DailyCoService } from './daily-co.js';
import { emitMatchRequestCreated } from './matching-events.js';
import type { MatchSchedulingHooks } from './matching-notifications.js';
export type { MatchSchedulingHooks } from './matching-notifications.js';

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

function toCandidateSummary(candidate: CandidateProfile): CandidateSummaryDto {
  return {
    id: candidate.id,
    displayName: candidate.displayName,
    timezone: candidate.timezone,
    experienceYears: candidate.experienceYears,
    preferredRoles: candidate.preferredRoles,
    preferredLanguages: candidate.preferredLanguages
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
    roomId: result.roomId ?? null,
    roomToken: result.roomToken ?? null,
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

type ScheduleMatchOptions = {
  dailyCoService?: DailyCoService | null;
  hooks?: MatchSchedulingHooks;
};

const DAILY_ROOM_NAME_PREFIX = 'supermock-match';
const DAILY_ROOM_SUFFIX_BYTES = 4;
const DAILY_ROOM_DEFAULT_DURATION_MINUTES = 90;
const DAILY_TOKEN_EXTRA_MINUTES = 30;

function generateDailyRoomName(requestId: string): string {
  const sanitized = requestId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const suffix = crypto.randomBytes(DAILY_ROOM_SUFFIX_BYTES).toString('hex');
  const base = sanitized.slice(-10) || sanitized || 'session';
  return `${DAILY_ROOM_NAME_PREFIX}-${base}-${suffix}`.slice(0, 120);
}

function computeExpirationSeconds(baseDate: Date, offsetMinutes: number): number {
  const baseTimestamp = Math.max(baseDate.getTime(), Date.now());
  return Math.floor((baseTimestamp + offsetMinutes * 60 * 1000) / 1000);
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

  emitMatchRequestCreated(request.id);

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

  return candidates.map((candidate) => toCandidateSummary(candidate));
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
  payload: ScheduleMatchPayload,
  options: ScheduleMatchOptions = {}
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

  const existingRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId },
    include: {
      candidate: true
    }
  });
  if (!existingRequest) {
    return null;
  }

  const scheduledAt = availability.start;
  const dailyCoService = options.dailyCoService ?? null;

  const roomDetails: { roomUrl: string | null; roomId: string | null; roomToken: string | null } = {
    roomUrl: payload.roomUrl ?? null,
    roomId: null,
    roomToken: null
  };

  let createdRoomName: string | null = null;

  try {
    if (dailyCoService) {
      const roomName = generateDailyRoomName(requestId);
      const room = await dailyCoService.createRoom({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: computeExpirationSeconds(scheduledAt, DAILY_ROOM_DEFAULT_DURATION_MINUTES),
          eject_after_elapsed: DAILY_ROOM_DEFAULT_DURATION_MINUTES * 60,
          enable_knocking: false
        }
      });

      createdRoomName = room.name;
      roomDetails.roomUrl = room.url;
      roomDetails.roomId = room.id ?? room.name;

      const token = await dailyCoService.generateToken(room.name, {
        isOwner: true,
        exp: computeExpirationSeconds(
          scheduledAt,
          DAILY_ROOM_DEFAULT_DURATION_MINUTES + DAILY_TOKEN_EXTRA_MINUTES
        )
      });

      roomDetails.roomToken = token.token;
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      await tx.interviewMatch.upsert({
        where: { requestId },
        create: {
          requestId,
          interviewerId: availability.interviewerId,
          scheduledAt,
          roomUrl: roomDetails.roomUrl,
          roomId: roomDetails.roomId,
          roomToken: roomDetails.roomToken,
          status: MatchStatus.SCHEDULED,
          effectivenessScore: 0
        },
        update: {
          interviewerId: availability.interviewerId,
          scheduledAt,
          roomUrl: roomDetails.roomUrl,
          roomId: roomDetails.roomId,
          roomToken: roomDetails.roomToken,
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
      if (dailyCoService && createdRoomName) {
        await dailyCoService.deleteRoom(createdRoomName).catch(() => {});
      }
      return null;
    }

    const mapped = mapMatchRequest(updatedRequest);

    if (mapped.result && existingRequest.candidate && options.hooks?.onScheduled) {
      try {
        await options.hooks.onScheduled({
          request: mapped,
          candidate: existingRequest.candidate,
          interviewer: availability.interviewer,
          slot: { start: availability.start, end: availability.end }
        });
      } catch (hookError) {
        console.error('Failed to dispatch match scheduling hooks', hookError);
      }
    }

    return mapped;
  } catch (error) {
    if (dailyCoService && createdRoomName) {
      await dailyCoService.deleteRoom(createdRoomName).catch(() => {});
    }
    throw error;
  }
}

function mapAvailability(slot: InterviewerAvailability): AvailabilitySlotDto {
  return {
    id: slot.id,
    interviewerId: slot.interviewerId,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    isRecurring: slot.isRecurring,
    language: slot.language,
    createdAt: slot.createdAt.toISOString()
  };
}

type SlotWithRelations = InterviewerAvailability & {
  interviewer: InterviewerProfile;
  host?: InterviewerProfile | null;
  participants: (SlotParticipant & {
    candidate?: CandidateProfile | null;
    interviewer?: InterviewerProfile | null;
  })[];
};

function mapSlot(slot: SlotWithRelations): SlotDto {
  const hostProfile = slot.host ?? slot.interviewer;
  const hostSummary = toInterviewerSummary({ ...hostProfile, availability: [] });

  const participantDtos = slot.participants.map((participant) => ({
    id: participant.id,
    role: participant.role as SlotParticipantRoleDto,
    waitlistPosition: participant.waitlistPosition ?? null,
    joinedAt: participant.createdAt.toISOString(),
    candidate: participant.candidate
      ? toCandidateSummary(participant.candidate)
      : undefined,
    interviewer: participant.interviewer
      ? toInterviewerSummary({ ...participant.interviewer, availability: [] })
      : undefined
  }));

  return {
    id: slot.id,
    interviewerId: slot.interviewerId,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    isRecurring: slot.isRecurring,
    capacity: slot.capacity,
    createdAt: slot.createdAt.toISOString(),
    host: {
      profile: hostSummary,
      name: slot.hostName ?? hostSummary.displayName
    },
    participants: participantDtos,
    waitlistCount: participantDtos.filter((participant) => participant.waitlistPosition !== null).length
  };
}

const slotRelations: Prisma.InterviewerAvailabilityInclude = {
  interviewer: true,
  host: true,
  participants: {
    include: {
      candidate: true,
      interviewer: true
    },
    orderBy: [
      { waitlistPosition: 'asc' },
      { createdAt: 'asc' }
    ]
  }
};

export async function getSlotById(id: string): Promise<SlotDto | null> {
  const slot = await prisma.interviewerAvailability.findUnique({
    where: { id },
    include: slotRelations
  });

  if (!slot) {
    return null;
  }

  return mapSlot(slot as SlotWithRelations);
}

export async function joinSlot(
  slotId: string,
  payload: JoinSlotPayload
): Promise<SlotDto | null> {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.interviewerAvailability.findUnique({
      where: { id: slotId },
      include: slotRelations
    });

    if (!slot) {
      return null;
    }

    if (payload.candidateId && payload.interviewerId) {
      return null;
    }

    const slotWithRelations = slot as SlotWithRelations;

    let candidate: CandidateProfile | null = null;
    let interviewer: InterviewerProfile | null = null;

    if (payload.role === 'CANDIDATE') {
      if (!payload.candidateId) {
        return null;
      }

      const candidateProfile = await tx.candidateProfile.findUnique({
        where: { id: payload.candidateId }
      });

      if (!candidateProfile) {
        return null;
      }

      if (
        slotWithRelations.participants.some(
          (participant) => participant.candidateId === candidateProfile.id
        )
      ) {
        return mapSlot(slotWithRelations);
      }

      candidate = candidateProfile;
    } else if (payload.role === 'INTERVIEWER') {
      if (!payload.interviewerId) {
        return null;
      }

      const interviewerProfile = await tx.interviewerProfile.findUnique({
        where: { id: payload.interviewerId }
      });

      if (!interviewerProfile) {
        return null;
      }

      if (
        slotWithRelations.participants.some(
          (participant) => participant.interviewerId === interviewerProfile.id
        )
      ) {
        return mapSlot(slotWithRelations);
      }

      interviewer = interviewerProfile;
    } else if (payload.role === 'OBSERVER') {
      if (payload.candidateId) {
        const candidateProfile = await tx.candidateProfile.findUnique({
          where: { id: payload.candidateId }
        });

        if (!candidateProfile) {
          return null;
        }

        if (
          slotWithRelations.participants.some(
            (participant) => participant.candidateId === candidateProfile.id
          )
        ) {
          return mapSlot(slotWithRelations);
        }

        candidate = candidateProfile;
      }

      if (!candidate && payload.interviewerId) {
        const interviewerProfile = await tx.interviewerProfile.findUnique({
          where: { id: payload.interviewerId }
        });

        if (!interviewerProfile) {
          return null;
        }

        if (
          slotWithRelations.participants.some(
            (participant) => participant.interviewerId === interviewerProfile.id
          )
        ) {
          return mapSlot(slotWithRelations);
        }

        interviewer = interviewerProfile;
      }

      if (!candidate && !interviewer) {
        return null;
      }
    } else {
      return null;
    }

    const activeCount = slotWithRelations.participants.filter(
      (participant) => participant.waitlistPosition === null
    ).length;
    const waitlistCount = slotWithRelations.participants.filter(
      (participant) => participant.waitlistPosition !== null
    ).length;
    const waitlistPosition =
      activeCount >= slotWithRelations.capacity ? waitlistCount + 1 : null;

    await tx.slotParticipant.create({
      data: {
        slotId,
        role: payload.role as PrismaSlotParticipantRole,
        candidateId: candidate?.id ?? undefined,
        interviewerId: interviewer?.id ?? undefined,
        waitlistPosition
      }
    });

    const updatedSlot = await tx.interviewerAvailability.findUnique({
      where: { id: slotId },
      include: slotRelations
    });

    if (!updatedSlot) {
      return null;
    }

    return mapSlot(updatedSlot as SlotWithRelations);
  });
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
  console.log('Creating availability slot with payload:', payload);
  
  const interviewer = await prisma.interviewerProfile.findUnique({
    where: { id: payload.interviewerId }
  });

  console.log('Found interviewer:', interviewer ? 'Yes' : 'No');
  
  if (!interviewer) {
    console.log('Interviewer not found with ID:', payload.interviewerId);
    return null;
  }

  const start = new Date(payload.start);
  const end = new Date(payload.end);

  console.log('Parsed dates - Start:', start, 'End:', end);
  console.log('Start valid:', !Number.isNaN(start.getTime()), 'End valid:', !Number.isNaN(end.getTime()));

  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
    console.log('Invalid dates detected');
    return null;
  }

  if (end <= start) {
    console.log('End time is not after start time');
    return null;
  }

  const overlap = await prisma.interviewerAvailability.findFirst({
    where: {
      interviewerId: payload.interviewerId,
      AND: [
        {
          start: {
            lt: end
          }
        },
        {
          end: {
            gt: start
          }
        }
      ]
    }
  });

  console.log('Overlap check - Found overlap:', overlap ? 'Yes' : 'No');
  if (overlap) {
    console.log('Overlapping slot found:', overlap);
    return null;
  }

  console.log('Creating slot in database with language:', payload.language ?? '🇺🇸 English');
  const slot = await prisma.interviewerAvailability.create({
    data: {
      interviewerId: payload.interviewerId,
      start,
      end,
      isRecurring: payload.isRecurring ?? false,
      language: payload.language ?? '🇺🇸 English'
    }
  });

  console.log('Slot created successfully:', slot.id, 'with language:', slot.language);
  const mapped = mapAvailability(slot);
  emitSlotUpdate({ action: 'created', slot: mapped });

  return mapped;
}

export async function deleteInterviewerAvailability(id: string): Promise<boolean> {
  const existing = await prisma.interviewerAvailability.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.interviewerAvailability.delete({ where: { id } });

  emitSlotUpdate({ action: 'deleted', slot: mapAvailability(existing) });
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
