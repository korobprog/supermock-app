import { beforeAll, afterAll, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    $disconnect = vi.fn().mockResolvedValue(undefined);
    $transaction = vi.fn(async () => Promise.resolve([]));
    $use = vi.fn();
    $on = vi.fn();
  }

  const createEnum = (values: string[]) => {
    return values.reduce<Record<string, string>>((acc, value) => {
      acc[value] = value;
      return acc;
    }, {});
  };

  return {
    PrismaClient: PrismaClientMock,
    Prisma: {
      DbNull: Symbol('DbNull'),
      JsonNull: Symbol('JsonNull'),
      Null: Symbol('Null')
    },
    UserRole: createEnum(['CANDIDATE', 'INTERVIEWER', 'ADMIN']),
    MatchStatus: createEnum(['QUEUED', 'MATCHED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'EXPIRED']),
    SlotParticipantRole: createEnum(['CANDIDATE', 'INTERVIEWER', 'OBSERVER']),
    SessionFormat: createEnum(['SYSTEM_DESIGN', 'CODING', 'BEHAVIORAL', 'MIXED'])
  };
});

beforeAll(async () => {
  // bootstrap database connections, redis, etc.
});

afterAll(async () => {
  // close open connections
});
