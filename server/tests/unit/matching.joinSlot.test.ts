import { MatchStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transactionMock, emitSlotUpdateMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  emitSlotUpdateMock: vi.fn()
}));

vi.mock('@prisma/client', () => ({
  MatchStatus: {
    QUEUED: 'QUEUED',
    MATCHED: 'MATCHED',
    SCHEDULED: 'SCHEDULED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED'
  },
  SlotParticipantRole: {
    CANDIDATE: 'CANDIDATE',
    INTERVIEWER: 'INTERVIEWER',
    OBSERVER: 'OBSERVER'
  },
  Prisma: {
    DbNull: Symbol('DbNull')
  }
}));

vi.mock('../../src/modules/prisma.js', () => ({
  prisma: {
    $transaction: transactionMock
  }
}));

vi.mock('../../src/modules/realtime/bus.js', () => ({
  emitSlotUpdate: emitSlotUpdateMock
}));

// Import after mocks are in place
import { joinSlot } from '../../src/modules/matching.js';

function createBaseSlot() {
  const createdAt = new Date('2024-05-01T09:00:00.000Z');
  return {
    id: 'slot-1',
    interviewerId: 'int-1',
    start: new Date('2024-05-10T10:00:00.000Z'),
    end: new Date('2024-05-10T11:00:00.000Z'),
    isRecurring: false,
    capacity: 1,
    hostId: null,
    hostName: null,
    createdAt,
    language: '🇺🇸 English',
    interviewer: {
      id: 'int-1',
      userId: 'user-int-1',
      displayName: 'Interviewer One',
      timezone: 'UTC',
      experienceYears: 10,
      languages: ['English'],
      specializations: ['React'],
      bio: null,
      rating: 4.5,
      createdAt,
      updatedAt: createdAt
    },
    host: null,
    participants: [] as any[]
  };
}

const candidateProfile = {
  id: 'cand-1',
  userId: 'user-cand-1',
  displayName: 'Alice',
  timezone: 'UTC',
  experienceYears: 5,
  preferredRoles: ['Frontend Developer'],
  preferredLanguages: ['English'],
  focusAreas: ['React'],
  bio: null,
  createdAt: new Date('2024-01-01T08:00:00.000Z'),
  updatedAt: new Date('2024-01-01T08:00:00.000Z')
};

describe('joinSlot', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    emitSlotUpdateMock.mockReset();
  });

  it('creates a match request when candidate joins a slot', async () => {
    const baseSlot = createBaseSlot();
    const updatedSlot = {
      ...baseSlot,
      participants: [
        {
          id: 'participant-1',
          slotId: baseSlot.id,
          role: 'CANDIDATE',
          candidateId: candidateProfile.id,
          interviewerId: null,
          waitlistPosition: null,
          createdAt: new Date('2024-05-01T09:01:00.000Z'),
          candidate: candidateProfile,
          interviewer: null
        }
      ]
    };

    const matchRequestRecord = {
      id: 'req-1',
      candidateId: candidateProfile.id,
      targetRole: 'Frontend Developer',
      focusAreas: ['React'],
      preferredLanguages: ['English'],
      sessionFormat: 'CODING' as const,
      notes: 'Great candidate',
      status: MatchStatus.QUEUED,
      matchedAt: null,
      expiresAt: new Date('2024-05-12T09:00:00.000Z'),
      createdAt: new Date('2024-05-01T09:00:00.000Z'),
      updatedAt: new Date('2024-05-01T09:00:00.000Z'),
      result: null
    };

    const tx = {
      interviewerAvailability: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(baseSlot)
          .mockResolvedValueOnce(updatedSlot)
      },
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue(candidateProfile)
      },
      slotParticipant: {
        create: vi.fn().mockResolvedValue({ id: 'participant-1' })
      },
      matchRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(matchRequestRecord),
        update: vi.fn()
      }
    };

    transactionMock.mockImplementation(async (callback: any) => callback(tx));

    const result = await joinSlot('slot-1', {
      role: 'CANDIDATE',
      candidateId: candidateProfile.id,
      matchRequest: {
        targetRole: 'Frontend Developer',
        focusAreas: ['React'],
        preferredLanguages: ['English'],
        sessionFormat: 'CODING',
        notes: 'Great candidate'
      }
    });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'req-1',
      candidateId: candidateProfile.id,
      targetRole: 'Frontend Developer',
      focusAreas: ['React'],
      preferredLanguages: ['English'],
      sessionFormat: 'CODING',
      notes: 'Great candidate'
    });

    expect(tx.slotParticipant.create).toHaveBeenCalledTimes(1);
    expect(tx.matchRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        candidateId: candidateProfile.id,
        targetRole: 'Frontend Developer',
        focusAreas: ['React'],
        preferredLanguages: ['English'],
        sessionFormat: 'CODING',
        notes: 'Great candidate'
      }),
      include: expect.any(Object)
    });
    expect(emitSlotUpdateMock).toHaveBeenCalledWith({
      action: 'updated',
      slot: expect.objectContaining({ id: 'slot-1' })
    });
  });

  it('updates existing match request when candidate already joined', async () => {
    const slotWithCandidate = {
      ...createBaseSlot(),
      participants: [
        {
          id: 'participant-1',
          slotId: 'slot-1',
          role: 'CANDIDATE',
          candidateId: candidateProfile.id,
          interviewerId: null,
          waitlistPosition: null,
          createdAt: new Date('2024-05-01T09:01:00.000Z'),
          candidate: candidateProfile,
          interviewer: null
        }
      ]
    };

    const existingRequest = {
      id: 'req-2',
      candidateId: candidateProfile.id,
      targetRole: 'Old Role',
      focusAreas: ['Legacy'],
      preferredLanguages: ['German'],
      sessionFormat: 'SYSTEM_DESIGN' as const,
      notes: null,
      status: MatchStatus.QUEUED,
      matchedAt: null,
      expiresAt: new Date('2024-05-12T09:00:00.000Z'),
      createdAt: new Date('2024-05-01T09:00:00.000Z'),
      updatedAt: new Date('2024-05-01T09:00:00.000Z'),
      result: null
    };

    const updatedRequest = {
      ...existingRequest,
      targetRole: 'Frontend Developer',
      focusAreas: ['React'],
      preferredLanguages: ['English'],
      sessionFormat: 'CODING' as const,
      notes: 'Refreshed'
    };

    const tx = {
      interviewerAvailability: {
        findUnique: vi.fn().mockResolvedValue(slotWithCandidate)
      },
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue(candidateProfile)
      },
      slotParticipant: {
        create: vi.fn()
      },
      matchRequest: {
        findFirst: vi.fn().mockResolvedValue(existingRequest),
        update: vi.fn().mockResolvedValue(updatedRequest),
        create: vi.fn()
      }
    };

    transactionMock.mockImplementation(async (callback: any) => callback(tx));

    const result = await joinSlot('slot-1', {
      role: 'CANDIDATE',
      candidateId: candidateProfile.id,
      matchRequest: {
        targetRole: 'Frontend Developer',
        focusAreas: ['React'],
        preferredLanguages: ['English'],
        sessionFormat: 'CODING',
        notes: 'Refreshed'
      }
    });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'req-2',
      targetRole: 'Frontend Developer',
      focusAreas: ['React'],
      preferredLanguages: ['English'],
      sessionFormat: 'CODING',
      notes: 'Refreshed'
    });

    expect(tx.slotParticipant.create).not.toHaveBeenCalled();
    expect(tx.matchRequest.update).toHaveBeenCalledWith({
      where: { id: 'req-2' },
      data: expect.objectContaining({
        targetRole: 'Frontend Developer',
        focusAreas: ['React'],
        preferredLanguages: ['English'],
        sessionFormat: 'CODING',
        notes: 'Refreshed'
      }),
      include: expect.any(Object)
    });
    expect(emitSlotUpdateMock).toHaveBeenCalledWith({
      action: 'updated',
      slot: expect.objectContaining({ id: 'slot-1' })
    });
  });
});
