import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

process.on('beforeExit', async () => {
  await prisma.$disconnect().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to disconnect Prisma client', error);
  });
});
