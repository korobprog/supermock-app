import { beforeAll, afterAll, vi } from 'vitest';

const jsonNull = Symbol('JsonNull');
const dbNull = Symbol('DbNull');
const anyNull = Symbol('AnyNull');

vi.mock('@prisma/client', () => ({
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
}));

beforeAll(async () => {
  // bootstrap database connections, redis, etc.
});

afterAll(async () => {
  // close open connections
});
