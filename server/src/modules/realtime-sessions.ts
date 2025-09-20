import { randomUUID } from 'node:crypto';

import type {
  CreateRealtimeSessionPayload,
  HeartbeatPayload,
  JoinRealtimeSessionPayload,
  RealtimeSessionDto,
  RealtimeSessionListQuery,
  SessionParticipantDto,
  SessionParticipantRole,
  UpdateRealtimeSessionStatusPayload,
  RealtimeSessionStatus
} from '../../../shared/src/types/realtime.js';
import { emitSessionUpdate } from './realtime/bus.js';

const HEARTBEAT_GRACE_MS = 30_000;

interface InternalParticipant {
  id: string;
  sessionId: string;
  userId?: string | null;
  role: SessionParticipantRole;
  joinedAt: Date;
  lastSeenAt: Date;
  leftAt?: Date | null;
  connectionId?: string | null;
  metadata?: Record<string, unknown>;
}

interface InternalSession {
  id: string;
  matchId?: string | null;
  hostId: string;
  status: RealtimeSessionStatus;
  startedAt: Date;
  endedAt?: Date | null;
  lastHeartbeat?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  participants: Map<string, InternalParticipant>;
}

const sessions = new Map<string, InternalSession>();

function cloneParticipant(participant: InternalParticipant): SessionParticipantDto {
  return {
    id: participant.id,
    sessionId: participant.sessionId,
    userId: participant.userId ?? null,
    role: participant.role,
    joinedAt: participant.joinedAt.toISOString(),
    lastSeenAt: participant.lastSeenAt.toISOString(),
    leftAt: participant.leftAt ? participant.leftAt.toISOString() : null,
    connectionId: participant.connectionId ?? null,
    metadata: participant.metadata
  };
}

function cloneSession(session: InternalSession): RealtimeSessionDto {
  return {
    id: session.id,
    matchId: session.matchId ?? null,
    hostId: session.hostId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    lastHeartbeat: session.lastHeartbeat ? session.lastHeartbeat.toISOString() : null,
    metadata: session.metadata,
    participants: Array.from(session.participants.values()).map(cloneParticipant),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

function ensureSessionExists(id: string) {
  const session = sessions.get(id);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
}

function updateSessionTimestamp(session: InternalSession) {
  session.updatedAt = new Date();
}

export async function getRealtimeSessionById(id: string): Promise<RealtimeSessionDto | null> {
  const session = sessions.get(id);
  return session ? cloneSession(session) : null;
}

export async function listRealtimeSessions(
  query: RealtimeSessionListQuery
): Promise<RealtimeSessionDto[]> {
  const now = Date.now();
  const result: RealtimeSessionDto[] = [];

  sessions.forEach((session) => {
    if (query.status && session.status !== query.status) {
      return;
    }

    if (query.hostId && session.hostId !== query.hostId) {
      return;
    }

    if (query.matchId && session.matchId !== query.matchId) {
      return;
    }

    if (query.activeOnly) {
      const lastBeat = session.lastHeartbeat?.getTime() ?? 0;
      if (session.status !== 'ACTIVE' && now - lastBeat > HEARTBEAT_GRACE_MS) {
        return;
      }
    }

    result.push(cloneSession(session));
  });

  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRealtimeSession(
  payload: CreateRealtimeSessionPayload
): Promise<RealtimeSessionDto> {
  const now = new Date();
  const id = randomUUID();

  const session: InternalSession = {
    id,
    matchId: payload.matchId ?? null,
    hostId: payload.hostId,
    status: payload.status ?? 'SCHEDULED',
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    metadata: payload.metadata,
    participants: new Map<string, InternalParticipant>()
  };

  sessions.set(id, session);
  const dto = cloneSession(session);
  emitSessionUpdate({ action: 'created', session: dto });
  return dto;
}

export async function joinRealtimeSession(
  sessionId: string,
  payload: JoinRealtimeSessionPayload
): Promise<SessionParticipantDto | null> {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const now = new Date();
  const participant: InternalParticipant = {
    id: randomUUID(),
    sessionId,
    userId: payload.userId ?? null,
    role: payload.role ?? 'OBSERVER',
    joinedAt: now,
    lastSeenAt: now,
    connectionId: payload.connectionId ?? null,
    metadata: payload.metadata
  };

  session.participants.set(participant.id, participant);
  session.lastHeartbeat = now;
  session.status = session.status === 'SCHEDULED' ? 'ACTIVE' : session.status;
  updateSessionTimestamp(session);

  const dto = cloneParticipant(participant);
  emitSessionUpdate({ action: 'participant_joined', session: cloneSession(session), participant: dto });
  return dto;
}

export async function leaveRealtimeSession(
  sessionId: string,
  participantId: string
): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  const participant = session.participants.get(participantId);
  if (!participant) {
    return false;
  }

  const now = new Date();
  participant.leftAt = now;
  participant.lastSeenAt = now;
  updateSessionTimestamp(session);

  emitSessionUpdate({ action: 'participant_left', session: cloneSession(session), participant: cloneParticipant(participant) });
  return true;
}

export async function heartbeatRealtimeSession(
  sessionId: string,
  payload: HeartbeatPayload
): Promise<RealtimeSessionDto | null> {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  session.lastHeartbeat = timestamp;
  session.status = session.status === 'SCHEDULED' ? 'ACTIVE' : session.status;
  updateSessionTimestamp(session);

  if (payload.participantId) {
    const participant = session.participants.get(payload.participantId);
    if (participant) {
      participant.lastSeenAt = timestamp;
      participant.leftAt = null;
    }
  }

  const dto = cloneSession(session);
  emitSessionUpdate({ action: 'heartbeat', session: dto });
  return dto;
}

export async function updateRealtimeSessionStatus(
  sessionId: string,
  payload: UpdateRealtimeSessionStatusPayload
): Promise<RealtimeSessionDto | null> {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  session.status = payload.status;
  session.endedAt = payload.endedAt ? new Date(payload.endedAt) : payload.status === 'ENDED' ? new Date() : session.endedAt;
  session.metadata = payload.metadata ?? session.metadata;
  if (payload.status === 'ENDED') {
    session.lastHeartbeat = new Date();
  }
  updateSessionTimestamp(session);

  const dto = cloneSession(session);
  emitSessionUpdate({ action: 'updated', session: dto });
  return dto;
}

export async function removeRealtimeSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  sessions.delete(sessionId);
  emitSessionUpdate({ action: 'deleted', session: cloneSession(session) });
  return true;
}

export function getActiveSessionCount(): number {
  const now = Date.now();
  let count = 0;
  sessions.forEach((session) => {
    const lastBeat = session.lastHeartbeat?.getTime() ?? 0;
    if (session.status === 'ACTIVE' || now - lastBeat <= HEARTBEAT_GRACE_MS) {
      count += 1;
    }
  });
  return count;
}

export function getCompletedSessionCount(): number {
  let count = 0;
  sessions.forEach((session) => {
    if (session.status === 'ENDED') {
      count += 1;
    }
  });
  return count;
}

export function getAllSessionsSnapshot(): RealtimeSessionDto[] {
  return Array.from(sessions.values()).map(cloneSession);
}
