import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';
import type { SessionBroadcastEvent } from '../../src/modules/realtime/bus.js';

interface SessionRecord {
  id: string;
  matchId: string | null;
  hostId: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  lastHeartbeat: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ParticipantRecord {
  id: string;
  sessionId: string;
  userId: string | null;
  role: string;
  joinedAt: Date;
  lastSeenAt: Date;
  leftAt: Date | null;
  connectionId: string | null;
  metadata?: Record<string, unknown> | null;
}

interface DatabaseState {
  sessions: Map<string, SessionRecord>;
  participants: Map<string, ParticipantRecord>;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function cloneParticipant(participant: ParticipantRecord): ParticipantRecord {
  return { ...participant, joinedAt: new Date(participant.joinedAt), lastSeenAt: new Date(participant.lastSeenAt), leftAt: participant.leftAt ? new Date(participant.leftAt) : null };
}

class InMemoryPrisma {
  readonly realtimeSession;
  readonly realtimeSessionParticipant;

  constructor(private readonly state: DatabaseState) {
    this.realtimeSession = {
      create: async ({ data, include }: any) => {
        const now = data.createdAt instanceof Date ? data.createdAt : new Date();
        const session: SessionRecord = {
          id: data.id ?? randomUUID(),
          matchId: data.matchId ?? null,
          hostId: data.hostId,
          status: data.status ?? 'SCHEDULED',
          startedAt: toDate(data.startedAt) ?? now,
          endedAt: toDate(data.endedAt),
          lastHeartbeat: toDate(data.lastHeartbeat),
          metadata: data.metadata ?? null,
          createdAt: now,
          updatedAt: now
        };
        this.state.sessions.set(session.id, session);
        return include?.participants ? this.withParticipants(session) : { ...session };
      },
      findUnique: async ({ where, include }: any) => {
        const session = where?.id ? this.state.sessions.get(where.id) : undefined;
        if (!session) {
          return null;
        }
        return include?.participants ? this.withParticipants(session) : { ...session };
      },
      findMany: async ({ where, include, orderBy }: any = {}) => {
        const results = Array.from(this.state.sessions.values()).filter((session) => matchesSession(session, where));
        if (orderBy?.createdAt === 'desc') {
          results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        return results.map((session) => (include?.participants ? this.withParticipants(session) : { ...session }));
      },
      update: async ({ where, data, include }: any) => {
        const session = where?.id ? this.state.sessions.get(where.id) : undefined;
        if (!session) {
          throw new Error('Session not found');
        }
        if (data.status !== undefined) {
          session.status = data.status;
        }
        if (data.matchId !== undefined) {
          session.matchId = data.matchId;
        }
        if ('lastHeartbeat' in data) {
          session.lastHeartbeat = toDate(data.lastHeartbeat);
        }
        if ('endedAt' in data) {
          session.endedAt = toDate(data.endedAt);
        }
        if ('metadata' in data) {
          session.metadata = data.metadata ?? null;
        }
        if (data.participants?.create) {
          const creations = Array.isArray(data.participants.create)
            ? data.participants.create
            : [data.participants.create];
          for (const entry of creations) {
            const participant: ParticipantRecord = {
              id: entry.id ?? randomUUID(),
              sessionId: session.id,
              userId: entry.userId ?? null,
              role: entry.role ?? 'OBSERVER',
              joinedAt: toDate(entry.joinedAt) ?? new Date(),
              lastSeenAt: toDate(entry.lastSeenAt) ?? new Date(),
              leftAt: toDate(entry.leftAt),
              connectionId: entry.connectionId ?? null,
              metadata: entry.metadata ?? null
            };
            this.state.participants.set(participant.id, participant);
          }
        }
        session.updatedAt = new Date();
        return include?.participants ? this.withParticipants(session) : { ...session };
      },
      delete: async ({ where, include }: any) => {
        const session = where?.id ? this.state.sessions.get(where.id) : undefined;
        if (!session) {
          throw new Error('Session not found');
        }
        const snapshot = include?.participants ? this.withParticipants(session) : { ...session };
        this.state.sessions.delete(session.id);
        for (const [id, participant] of this.state.participants.entries()) {
          if (participant.sessionId === session.id) {
            this.state.participants.delete(id);
          }
        }
        return snapshot;
      },
      count: async ({ where }: any = {}) => {
        return Array.from(this.state.sessions.values()).filter((session) => matchesSession(session, where)).length;
      },
      deleteMany: async () => {
        const count = this.state.sessions.size;
        this.state.sessions.clear();
        this.state.participants.clear();
        return { count };
      }
    };

    this.realtimeSessionParticipant = {
      findFirst: async ({ where }: any) => {
        for (const participant of this.state.participants.values()) {
          if (matchesParticipant(participant, where)) {
            return { ...participant };
          }
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        const participant = where?.id ? this.state.participants.get(where.id) : undefined;
        return participant ? { ...participant } : null;
      },
      update: async ({ where, data }: any) => {
        const participant = where?.id ? this.state.participants.get(where.id) : undefined;
        if (!participant) {
          throw new Error('Participant not found');
        }
        if ('lastSeenAt' in data) {
          participant.lastSeenAt = toDate(data.lastSeenAt) ?? participant.lastSeenAt;
        }
        if ('leftAt' in data) {
          participant.leftAt = toDate(data.leftAt);
        }
        return { ...participant };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const participant of this.state.participants.values()) {
          if (matchesParticipant(participant, where)) {
            if ('lastSeenAt' in data) {
              participant.lastSeenAt = toDate(data.lastSeenAt) ?? participant.lastSeenAt;
            }
            if ('leftAt' in data) {
              participant.leftAt = toDate(data.leftAt);
            }
            count += 1;
          }
        }
        return { count };
      },
      deleteMany: async () => {
        const count = this.state.participants.size;
        this.state.participants.clear();
        return { count };
      }
    };
  }

  async $transaction<T>(callback: (tx: InMemoryPrisma) => Promise<T>): Promise<T> {
    return callback(new InMemoryPrisma(this.state));
  }

  async $disconnect(): Promise<void> {
    // no-op for in-memory storage
  }

  reset() {
    this.state.sessions.clear();
    this.state.participants.clear();
  }

  private withParticipants(session: SessionRecord) {
    return {
      ...session,
      participants: this.getParticipants(session.id)
    };
  }

  private getParticipants(sessionId: string) {
    return Array.from(this.state.participants.values())
      .filter((participant) => participant.sessionId === sessionId)
      .map(cloneParticipant);
  }
}

function matchesSession(session: SessionRecord, where: any = {}): boolean {
  if (!where || Object.keys(where).length === 0) {
    return true;
  }

  if (where.hostId && session.hostId !== where.hostId) {
    return false;
  }

  if (where.matchId && session.matchId !== where.matchId) {
    return false;
  }

  if (where.status && session.status !== where.status) {
    return false;
  }

  if (where.lastHeartbeat?.gte) {
    const threshold = toDate(where.lastHeartbeat.gte);
    if (!threshold) {
      return false;
    }
    if (!session.lastHeartbeat || session.lastHeartbeat.getTime() < threshold.getTime()) {
      return false;
    }
  }

  if (Array.isArray(where.OR) && where.OR.length > 0) {
    return where.OR.some((clause) => matchesSession(session, clause));
  }

  return true;
}

function matchesParticipant(participant: ParticipantRecord, where: any = {}): boolean {
  if (!where || Object.keys(where).length === 0) {
    return true;
  }

  if (where.id && participant.id !== where.id) {
    return false;
  }

  if (where.sessionId && participant.sessionId !== where.sessionId) {
    return false;
  }

  return true;
}

const prismaMock = vi.hoisted(() => ({
  state: undefined as DatabaseState | undefined,
  instance: undefined as InMemoryPrisma | undefined
}));

function ensurePrismaInstance() {
  if (!prismaMock.instance || !prismaMock.state) {
    prismaMock.state = {
      sessions: new Map<string, SessionRecord>(),
      participants: new Map<string, ParticipantRecord>()
    };
    prismaMock.instance = new InMemoryPrisma(prismaMock.state);
  }
  return prismaMock.instance;
}

vi.mock('../../src/modules/prisma.js', () => ({
  __esModule: true,
  prisma: ensurePrismaInstance() as unknown as PrismaClient,
  __mockDb: { reset: () => ensurePrismaInstance().reset() }
}));

ensurePrismaInstance();

const prismaModulePromise = import('../../src/modules/prisma.js');
const realtimeModulePromise = import('../../src/modules/realtime-sessions.js');
const busModulePromise = import('../../src/modules/realtime/bus.js');

let prisma: PrismaClient;
let realtime: typeof import('../../src/modules/realtime-sessions.js');
let bus: typeof import('../../src/modules/realtime/bus.js');

beforeAll(async () => {
  ({ prisma } = await prismaModulePromise);
  realtime = await realtimeModulePromise;
  realtime.__setRealtimePrismaClient(prisma as unknown as any);
  bus = await busModulePromise;
});

afterAll(async () => {
  if (typeof prisma.$disconnect === 'function') {
    await prisma.$disconnect();
  }
});

beforeEach(async () => {
  await prisma.realtimeSessionParticipant.deleteMany();
  await prisma.realtimeSession.deleteMany();
});

afterEach(() => {
  bus.realtimeBus.removeAllListeners('sessions:update');
});

describe('realtime session storage', () => {
  it('persists created sessions and emits broadcast events', async () => {
    const events: SessionBroadcastEvent[] = [];
    const unsubscribe = bus.subscribeToSessionUpdates((event) => {
      events.push(event);
    });

    const session = await realtime.createRealtimeSession({
      hostId: 'host-1',
      metadata: { topic: 'architecture' }
    });
    unsubscribe();

    expect(session.metadata).toEqual({ topic: 'architecture' });
    expect(events.map((event) => event.action)).toContain('created');

    const stored = await prisma.realtimeSession.findUnique({ where: { id: session.id } });
    expect(stored).not.toBeNull();
    expect(stored?.hostId).toBe('host-1');

    const standalone = new InMemoryPrisma(prismaMock.state!);
    const persisted = await standalone.realtimeSession.findUnique({ where: { id: session.id } });
    expect(persisted).not.toBeNull();
  });

  it('creates participants and activates the session', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-2' });

    const updates: SessionBroadcastEvent[] = [];
    const unsubscribe = bus.subscribeToSessionUpdates((event) => updates.push(event));

    const participant = await realtime.joinRealtimeSession(session.id, {
      userId: 'user-1',
      role: 'CANDIDATE',
      metadata: { locale: 'en-US' }
    });
    unsubscribe();

    expect(participant).not.toBeNull();
    expect(participant?.role).toBe('CANDIDATE');
    expect(updates.some((event) => event.action === 'participant_joined')).toBe(true);

    const reloaded = await realtime.getRealtimeSessionById(session.id);
    expect(reloaded?.status).toBe('ACTIVE');
    expect(reloaded?.participants).toHaveLength(1);
    expect(reloaded?.participants[0]?.metadata).toEqual({ locale: 'en-US' });
  });

  it('updates heartbeat timestamps and participant presence', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-3' });
    const participant = await realtime.joinRealtimeSession(session.id, { userId: 'user-2' });
    expect(participant).not.toBeNull();

    const timestamp = new Date().toISOString();
    const updated = await realtime.heartbeatRealtimeSession(session.id, {
      participantId: participant?.id,
      timestamp
    });

    expect(updated?.lastHeartbeat).toBe(new Date(timestamp).toISOString());
    const storedParticipant = await prisma.realtimeSessionParticipant.findUnique({
      where: { id: participant!.id }
    });
    expect(storedParticipant?.lastSeenAt.toISOString()).toBe(new Date(timestamp).toISOString());
    expect(storedParticipant?.leftAt).toBeNull();
  });

  it('marks participants as left and emits updates', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-4' });
    const participant = await realtime.joinRealtimeSession(session.id, { userId: 'user-3' });
    expect(participant).not.toBeNull();

    const events: SessionBroadcastEvent[] = [];
    const unsubscribe = bus.subscribeToSessionUpdates((event) => events.push(event));

    const success = await realtime.leaveRealtimeSession(session.id, participant!.id);
    unsubscribe();

    expect(success).toBe(true);
    expect(events.some((event) => event.action === 'participant_left')).toBe(true);

    const storedParticipant = await prisma.realtimeSessionParticipant.findUnique({
      where: { id: participant!.id }
    });
    expect(storedParticipant?.leftAt).not.toBeNull();
  });

  it('updates session status and completion metadata', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-5' });
    await realtime.joinRealtimeSession(session.id, { userId: 'user-4' });

    const updated = await realtime.updateRealtimeSessionStatus(session.id, {
      status: 'ENDED',
      metadata: { summary: 'done' }
    });

    expect(updated?.status).toBe('ENDED');
    expect(updated?.metadata).toEqual({ summary: 'done' });
    expect(updated?.endedAt).not.toBeNull();
  });

  it('lists, counts and deletes sessions from persistent storage', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-6', matchId: 'match-1' });
    await realtime.joinRealtimeSession(session.id, { userId: 'user-5' });

    const activeCount = await realtime.getActiveSessionCount();
    expect(activeCount).toBe(1);

    const listed = await realtime.listRealtimeSessions({ hostId: 'host-6' });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.matchId).toBe('match-1');

    const snapshot = await realtime.getAllSessionsSnapshot();
    expect(snapshot.map((item) => item.id)).toContain(session.id);

    const removed = await realtime.removeRealtimeSession(session.id);
    expect(removed).toBe(true);

    const remaining = await prisma.realtimeSession.findMany();
    expect(remaining).toHaveLength(0);
  });

  it('restores sessions from storage for broadcasters', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-7' });
    await realtime.joinRealtimeSession(session.id, { userId: 'user-6' });

    const events: SessionBroadcastEvent[] = [];
    const unsubscribe = bus.subscribeToSessionUpdates((event) => events.push(event));
    await realtime.restoreRealtimeSessions();
    unsubscribe();

    expect(events.filter((event) => event.action === 'restored').map((event) => event.session.id)).toContain(
      session.id
    );
  });

  it('isolates broadcast payloads from consumer mutations', async () => {
    const events: SessionBroadcastEvent[] = [];
    const unsubscribe = bus.subscribeToSessionUpdates((event) => {
      events.push(event);

      if (event.session.metadata && typeof event.session.metadata === 'object') {
        const metadata = event.session.metadata as Record<string, any>;
        metadata.topic = 'mutated-topic';
        if (metadata.nested && typeof metadata.nested === 'object') {
          (metadata.nested as Record<string, any>).difficulty = 'mutated-difficulty';
        }
      }

      if (event.participant?.metadata && typeof event.participant.metadata === 'object') {
        const metadata = event.participant.metadata as Record<string, any>;
        metadata.level = 'mutated-level';
        if (metadata.nested && typeof metadata.nested === 'object') {
          (metadata.nested as Record<string, any>).skill = 'mutated-skill';
        }
      }
    });

    const session = await realtime.createRealtimeSession({
      hostId: 'host-9',
      metadata: { topic: 'architecture', nested: { difficulty: 'hard' } }
    });

    const participant = await realtime.joinRealtimeSession(session.id, {
      userId: 'user-8',
      metadata: { nested: { skill: 'expert' } }
    });

    unsubscribe();

    expect(events).toHaveLength(2);
    expect((events[0].session.metadata as Record<string, any>).topic).toBe('mutated-topic');
    expect(
      ((events[0].session.metadata as Record<string, any>).nested as Record<string, any>).difficulty
    ).toBe('mutated-difficulty');
    expect((events[1].participant?.metadata as Record<string, any>).level).toBe('mutated-level');
    expect(
      ((events[1].participant?.metadata as Record<string, any>).nested as Record<string, any>).skill
    ).toBe('mutated-skill');

    expect(session.metadata).toEqual({ topic: 'architecture', nested: { difficulty: 'hard' } });
    expect(session.metadata?.nested).toEqual({ difficulty: 'hard' });
    expect(participant?.metadata).toEqual({ nested: { skill: 'expert' } });
    expect(participant?.metadata?.nested).toEqual({ skill: 'expert' });
  });

  it('counts completed sessions separately from active ones', async () => {
    const session = await realtime.createRealtimeSession({ hostId: 'host-8' });
    await realtime.joinRealtimeSession(session.id, { userId: 'user-7' });
    await realtime.updateRealtimeSessionStatus(session.id, { status: 'ENDED' });

    const [active, completed] = await Promise.all([
      realtime.getActiveSessionCount(),
      realtime.getCompletedSessionCount()
    ]);

    expect(active).toBe(0);
    expect(completed).toBe(1);
  });
});
