import {
  MatchStatus,
  PrismaClient,
  SessionFormat,
  UserRole
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Хешируем пароли для тестовых пользователей
  const candidatePasswordHash = await bcrypt.hash('supermock', 12);
  const interviewerPasswordHash = await bcrypt.hash('supermock', 12);

  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@supermock.io' },
    update: {},
    create: {
      email: 'candidate@supermock.io',
      passwordHash: candidatePasswordHash,
      emailVerifiedAt: new Date(),
      role: UserRole.CANDIDATE,
      profile: { locale: 'en', level: 'Junior' }
    }
  });

  const interviewerUser = await prisma.user.upsert({
    where: { email: 'interviewer@supermock.io' },
    update: {},
    create: {
      email: 'interviewer@supermock.io',
      passwordHash: interviewerPasswordHash,
      emailVerifiedAt: new Date(),
      role: UserRole.INTERVIEWER,
      profile: { locale: 'en', level: 'Senior' }
    }
  });

  const candidateProfile = await prisma.candidateProfile.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      displayName: 'Alex Candidate',
      timezone: 'Europe/Moscow',
      experienceYears: 2,
      preferredRoles: ['Frontend Engineer'],
      preferredLanguages: ['English', 'Русский'],
      focusAreas: ['React', 'TypeScript'],
      bio: 'Junior frontend engineer focusing on React and TypeScript.'
    }
  });

  const interviewerProfile = await prisma.interviewerProfile.upsert({
    where: { userId: interviewerUser.id },
    update: {},
    create: {
      userId: interviewerUser.id,
      displayName: 'Maria Interviewer',
      timezone: 'Europe/Berlin',
      experienceYears: 7,
      languages: ['English', 'Deutsch'],
      specializations: ['Frontend Architecture', 'System Design'],
      bio: 'Staff engineer with 7+ years interviewing frontend candidates.',
      rating: 4.8
    }
  });

  const availabilityStart = new Date();
  availabilityStart.setUTCHours(availabilityStart.getUTCHours() + 24, 0, 0, 0);
  const availabilityEnd = new Date(availabilityStart);
  availabilityEnd.setUTCHours(availabilityStart.getUTCHours() + 1);

  await prisma.interviewerAvailability.upsert({
    where: { id: `${interviewerProfile.id}-default-slot` },
    update: {},
    create: {
      id: `${interviewerProfile.id}-default-slot`,
      interviewerId: interviewerProfile.id,
      start: availabilityStart,
      end: availabilityEnd,
      isRecurring: false
    }
  });

  const matchRequest = await prisma.matchRequest.create({
    data: {
      candidateId: candidateProfile.id,
      targetRole: 'Frontend Engineer',
      focusAreas: ['React', 'System Design'],
      preferredLanguages: ['English'],
      sessionFormat: SessionFormat.CODING,
      notes: 'Looking for a live coding mock focused on React patterns.'
    }
  });

  await prisma.interviewMatch.create({
    data: {
      requestId: matchRequest.id,
      interviewerId: interviewerProfile.id,
      effectivenessScore: 82,
      scheduledAt: availabilityStart,
      roomUrl: 'https://meet.supermock.local/rooms/frontend-001',
      roomId: 'room-frontend-001',
      roomToken: 'token-frontend-001',
      status: MatchStatus.SCHEDULED
    }
  });

  const completedRequest = await prisma.matchRequest.create({
    data: {
      candidateId: candidateProfile.id,
      targetRole: 'Frontend Engineer',
      focusAreas: ['React', 'Testing'],
      preferredLanguages: ['English'],
      sessionFormat: SessionFormat.BEHAVIORAL,
      notes: 'Follow-up mock to review communication skills.',
      status: MatchStatus.COMPLETED,
      matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
    }
  });

  await prisma.interviewMatch.create({
    data: {
      requestId: completedRequest.id,
      interviewerId: interviewerProfile.id,
      effectivenessScore: 88,
      scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      roomId: 'room-frontend-historical',
      status: MatchStatus.COMPLETED,
      summary: {
        create: {
          interviewerNotes: 'Great communication, strong examples. Work on STAR structure consistency.',
          candidateNotes: 'Appreciated specific advice on storytelling.',
          rating: 4,
          strengths: ['Communication', 'Self-reflection'],
          improvements: ['STAR structure', 'Ending with action items']
        }
      }
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
