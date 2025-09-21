import { PrismaClient } from '@prisma/client';

// Mock jest for testing
const jest = {
  fn: () => ({
    mockResolvedValue: () => {},
    mockRejectedValue: () => {},
    mockReturnValue: () => {},
    mockImplementation: () => {},
    reset: () => {},
  })
};

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Mock database for testing
export const __mockDb = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  candidateProfile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  interviewerProfile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailVerificationToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  userInvitation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  onboardingDraft: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  reset: () => {
    // Reset all mocks
    Object.values(__mockDb).forEach((model: any) => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach((method: any) => {
          if (method && typeof method.reset === 'function') {
            method.reset();
          }
        });
      }
    });
  },
};

process.on('beforeExit', async () => {
  await prisma.$disconnect().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to disconnect Prisma client', error);
  });
});
