import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'candidate@supermock.io' },
    update: {},
    create: {
      email: 'candidate@supermock.io',
      role: UserRole.CANDIDATE,
      profile: { locale: 'en', level: 'Junior' }
    }
  });

  await prisma.user.upsert({
    where: { email: 'interviewer@supermock.io' },
    update: {},
    create: {
      email: 'interviewer@supermock.io',
      role: UserRole.INTERVIEWER,
      profile: { locale: 'en', level: 'Senior' }
    }
  });
}

main()
  .catch((error) => {
    console.error('Failed to seed database', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
