import { beforeAll, afterAll, vi } from 'vitest';

const jsonNull = Symbol('JsonNull');
const dbNull = Symbol('DbNull');
const anyNull = Symbol('AnyNull');

vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    $disconnect = vi.fn().mockResolvedValue(undefined);
    $transaction = vi.fn(async () => Promise.resolve([]));
    $use = vi.fn();
    $on = vi.fn();
  }

  const RealtimeSessionStatus = {
    SCHEDULED: 'SCHEDULED',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED'
  };

  const SessionParticipantRole = {
    HOST: 'HOST',
    INTERVIEWER: 'INTERVIEWER',
    CANDIDATE: 'CANDIDATE',
    OBSERVER: 'OBSERVER'
  };

  // Create aliases for the imported names
  const PrismaRealtimeSessionStatus = RealtimeSessionStatus;
  const PrismaSessionParticipantRole = SessionParticipantRole;

  return {
    PrismaClient: PrismaClientMock,
    RealtimeSessionStatus,
    SessionParticipantRole,
    UserRole: {
      CANDIDATE: 'CANDIDATE',
      INTERVIEWER: 'INTERVIEWER',
      ADMIN: 'ADMIN'
    },
    MatchStatus: {
      QUEUED: 'QUEUED',
      MATCHED: 'MATCHED',
      SCHEDULED: 'SCHEDULED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED'
    },
    SessionFormat: {
      SYSTEM_DESIGN: 'SYSTEM_DESIGN',
      CODING: 'CODING',
      BEHAVIORAL: 'BEHAVIORAL',
      MIXED: 'MIXED'
    },
    SlotParticipantRole: {
      CANDIDATE: 'CANDIDATE',
      INTERVIEWER: 'INTERVIEWER',
      OBSERVER: 'OBSERVER'
    },
    PrismaRealtimeSessionStatus,
    PrismaSessionParticipantRole,
    Prisma: {
      JsonNull: jsonNull,
      DbNull: dbNull,
      AnyNull: anyNull,
      NullTypes: {
        JsonNull: jsonNull,
        DbNull: dbNull,
        AnyNull: anyNull
      },
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string;
        constructor(message: string, options: { code: string }) {
          super(message);
          this.code = options.code;
        }
      }
    }
  };
});

beforeAll(async () => {
  // bootstrap database connections, redis, etc.
});

afterAll(async () => {
  // close open connections
});
