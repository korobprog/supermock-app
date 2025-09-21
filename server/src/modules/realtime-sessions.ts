import { randomUUID } from 'node:crypto';

import {
  Prisma,
  RealtimeSessionStatus as PrismaRealtimeSessionStatus,
  type RealtimeSession,
  type RealtimeSessionParticipant,
  type SessionParticipantRole as PrismaSessionParticipantRole
} from '@prisma/client';

import type {
  CreateRealtimeSessionPayload,
  HeartbeatPayload,
  JoinRealtimeSessionPayload,
  RealtimeSessionDto,
  RealtimeSessionListQuery,
  SessionParticipantDto,
  UpdateRealtimeSessionStatusPayload
} from '../../../shared/src/types/realtime.js';
import { prisma } from './prisma.js';
import { emitSessionUpdate } from './realtime/bus.js';

const HEARTBEAT_GRACE_MS = 30_000;

type SessionWithParticipants = RealtimeSession & { participants: RealtimeSessionParticipant[] };

let realtimePrisma = prisma;

export function __setRealtimePrismaClient(client: typeof prisma) {
  realtimePrisma = client;
}

function toRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function toParticipantDto(participant: RealtimeSessionParticipant): SessionParticipantDto {
  return {
    id: participant.id,
    sessionId: participant.sessionId,
    userId: participant.userId ?? null,
    role: participant.role,
    joinedAt: participant.joinedAt.toISOString(),
    lastSeenAt: participant.lastSeenAt.toISOString(),
    leftAt: participant.leftAt ? participant.leftAt.toISOString() : null,
    connectionId: participant.connectionId ?? null,
    metadata: toRecord(participant.metadata)
  };
}

function toSessionDto(session: SessionWithParticipants): RealtimeSessionDto {
  return {
    id: session.id,
    matchId: session.matchId ?? null,
    hostId: session.hostId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    lastHeartbeat: session.lastHeartbeat ? session.lastHeartbeat.toISOString() : null,
    metadata: toRecord(session.metadata),
    participants: session.participants.map(toParticipantDto),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

export async function getRealtimeSessionById(id: string): Promise<RealtimeSessionDto | null> {
  const session = await realtimePrisma.realtimeSession.findUnique({
    where: { id },
    include: { participants: true }
  });
  return session ? toSessionDto(session) : null;
}

export async function listRealtimeSessions(
  query: RealtimeSessionListQuery
): Promise<RealtimeSessionDto[]> {
  const where: Prisma.RealtimeSessionWhereInput = {};

  if (query.status) {
    where.status = query.status as PrismaRealtimeSessionStatus;
  }

  if (query.hostId) {
    where.hostId = query.hostId;
  }

  if (query.matchId) {
    where.matchId = query.matchId;
  }

  if (query.activeOnly) {
    const graceDate = new Date(Date.now() - HEARTBEAT_GRACE_MS);
    where.OR = [
      { status: PrismaRealtimeSessionStatus.ACTIVE },
      { lastHeartbeat: { gte: graceDate } }
    ];
  }

  const sessions = await realtimePrisma.realtimeSession.findMany({
    where,
    include: { participants: true },
    orderBy: { createdAt: 'desc' }
  });

  return sessions.map(toSessionDto);
}

export async function createRealtimeSession(
  payload: CreateRealtimeSessionPayload
): Promise<RealtimeSessionDto> {
  const now = new Date();
  const sessionId = randomUUID();

  const session = await realtimePrisma.realtimeSession.create({
    data: {
      id: sessionId,
      matchId: payload.matchId ?? null,
      hostId: payload.hostId,
      status: (payload.status ?? 'SCHEDULED') as PrismaRealtimeSessionStatus,
      startedAt: now,
      metadata: (payload.metadata as Prisma.JsonValue) ?? undefined
    },
    include: { participants: true }
  });

  const dto = toSessionDto(session);
  emitSessionUpdate({ action: 'created', session: dto });
  return dto;
}

export async function joinRealtimeSession(
  sessionId: string,
  payload: JoinRealtimeSessionPayload
): Promise<SessionParticipantDto | null> {
  const result = await realtimePrisma.$transaction(async (tx) => {
    const session = await tx.realtimeSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return null;
    }

    const now = new Date();
    const participantId = randomUUID();

    const updatedSession = await tx.realtimeSession.update({
      where: { id: sessionId },
      data: {
        lastHeartbeat: now,
        status:
          session.status === PrismaRealtimeSessionStatus.SCHEDULED
            ? PrismaRealtimeSessionStatus.ACTIVE
            : session.status,
        participants: {
          create: {
            id: participantId,
            userId: payload.userId ?? null,
            role: (payload.role ?? 'OBSERVER') as PrismaSessionParticipantRole,
            joinedAt: now,
            lastSeenAt: now,
            connectionId: payload.connectionId ?? null,
            metadata: (payload.metadata as Prisma.JsonValue) ?? undefined
          }
        }
      },
      include: { participants: true }
    });

    const participant = updatedSession.participants.find((item) => item.id === participantId);
    if (!participant) {
      throw new Error('Failed to create session participant');
    }

    return { session: updatedSession, participant };
  });

  if (!result) {
    return null;
  }

  const participantDto = toParticipantDto(result.participant);
  emitSessionUpdate({
    action: 'participant_joined',
    session: toSessionDto(result.session),
    participant: participantDto
  });

  return participantDto;
}

export async function leaveRealtimeSession(
  sessionId: string,
  participantId: string
): Promise<boolean> {
  const result = await realtimePrisma.$transaction(async (tx) => {
    const participant = await tx.realtimeSessionParticipant.findFirst({
      where: { id: participantId, sessionId }
    });

    if (!participant) {
      return null;
    }

    const now = new Date();
    const updatedParticipant = await tx.realtimeSessionParticipant.update({
      where: { id: participantId },
      data: {
        lastSeenAt: now,
        leftAt: now
      }
    });

    const session = await tx.realtimeSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found while processing leave');
    }

    const updatedSession = await tx.realtimeSession.update({
      where: { id: sessionId },
      data: {
        status: session.status,
        lastHeartbeat: session.lastHeartbeat
      },
      include: { participants: true }
    });

    return { session: updatedSession, participant: updatedParticipant };
  });

  if (!result) {
    return false;
  }

  emitSessionUpdate({
    action: 'participant_left',
    session: toSessionDto(result.session),
    participant: toParticipantDto(result.participant)
  });

  return true;
}

export async function heartbeatRealtimeSession(
  sessionId: string,
  payload: HeartbeatPayload
): Promise<RealtimeSessionDto | null> {
  const session = await realtimePrisma.$transaction(async (tx) => {
    const existing = await tx.realtimeSession.findUnique({ where: { id: sessionId } });
    if (!existing) {
      return null;
    }

    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

    if (payload.participantId) {
      await tx.realtimeSessionParticipant.updateMany({
        where: { id: payload.participantId, sessionId },
        data: { lastSeenAt: timestamp, leftAt: null }
      });
    }

    return tx.realtimeSession.update({
      where: { id: sessionId },
      data: {
        lastHeartbeat: timestamp,
        status:
          existing.status === PrismaRealtimeSessionStatus.SCHEDULED
            ? PrismaRealtimeSessionStatus.ACTIVE
            : existing.status
      },
      include: { participants: true }
    });
  });

  if (!session) {
    return null;
  }

  const dto = toSessionDto(session);
  emitSessionUpdate({ action: 'heartbeat', session: dto });
  return dto;
}

export async function updateRealtimeSessionStatus(
  sessionId: string,
  payload: UpdateRealtimeSessionStatusPayload
): Promise<RealtimeSessionDto | null> {
  const session = await realtimePrisma.$transaction(async (tx) => {
    const existing = await tx.realtimeSession.findUnique({ where: { id: sessionId } });
    if (!existing) {
      return null;
    }

    const endedAt = payload.endedAt ? new Date(payload.endedAt) : existing.endedAt;
    const shouldFinalize = payload.status === 'ENDED';

    return tx.realtimeSession.update({
      where: { id: sessionId },
      data: {
        status: payload.status as PrismaRealtimeSessionStatus,
        endedAt: shouldFinalize && !payload.endedAt ? new Date() : endedAt,
        metadata:
          payload.metadata !== undefined
            ? (payload.metadata as Prisma.JsonValue)
            : existing.metadata,
        lastHeartbeat: shouldFinalize ? null : existing.lastHeartbeat
      },
      include: { participants: true }
    });
  });

  if (!session) {
    return null;
  }

  const dto = toSessionDto(session);
  emitSessionUpdate({ action: 'updated', session: dto });
  return dto;
}

export async function removeRealtimeSession(sessionId: string): Promise<boolean> {
  let session: SessionWithParticipants;
  try {
    session = await realtimePrisma.realtimeSession.delete({
      where: { id: sessionId },
      include: { participants: true }
    });
  } catch (error) {
    return false;
  }

  emitSessionUpdate({ action: 'deleted', session: toSessionDto(session) });
  return true;
}

export async function getActiveSessionCount(): Promise<number> {
  const graceDate = new Date(Date.now() - HEARTBEAT_GRACE_MS);
  return realtimePrisma.realtimeSession.count({
    where: {
      OR: [
        { status: PrismaRealtimeSessionStatus.ACTIVE },
        { lastHeartbeat: { gte: graceDate } }
      ]
    }
  });
}

export async function getCompletedSessionCount(): Promise<number> {
  return realtimePrisma.realtimeSession.count({
    where: { status: PrismaRealtimeSessionStatus.ENDED }
  });
}

export async function getAllSessionsSnapshot(): Promise<RealtimeSessionDto[]> {
  const sessions = await realtimePrisma.realtimeSession.findMany({
    include: { participants: true },
    orderBy: { createdAt: 'desc' }
  });
  return sessions.map(toSessionDto);
}

export async function restoreRealtimeSessions(): Promise<void> {
  const sessions = await realtimePrisma.realtimeSession.findMany({
    include: { participants: true }
  });

  for (const session of sessions) {
    emitSessionUpdate({ action: 'restored', session: toSessionDto(session) });
  }
}
