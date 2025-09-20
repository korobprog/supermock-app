import { Prisma, UserRole } from '@prisma/client';

import type {
  InterviewerProfileDto,
  InterviewerProfileInput,
  InterviewerProfileUpdateInput,
  PaginatedInterviewersDto
} from '../../../shared/src/types/user.js';
import { prisma } from './prisma.js';

const MAX_PAGE_SIZE = 100;

type InterviewerProfileRecord = Prisma.InterviewerProfileGetPayload<{}>;

type PaginatedParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  minRating?: number;
};

function mapInterviewer(profile: InterviewerProfileRecord): InterviewerProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    timezone: profile.timezone,
    experienceYears: profile.experienceYears,
    languages: profile.languages,
    specializations: profile.specializations,
    bio: profile.bio ?? undefined,
    rating: profile.rating,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function buildPagination(params?: PaginatedParams) {
  const page = Math.max(params?.page ?? 1, 1);
  const rawPageSize = params?.pageSize ?? 20;
  const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

export async function listInterviewerProfiles(params?: PaginatedParams): Promise<PaginatedInterviewersDto> {
  const { page, pageSize, skip } = buildPagination(params);
  const where: Prisma.InterviewerProfileWhereInput = {};

  if (params?.search) {
    const search = params.search.trim();

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { languages: { has: search } },
        { specializations: { has: search } },
        {
          user: {
            email: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }
  }

  if (typeof params?.minRating === 'number') {
    where.rating = { gte: params.minRating };
  }

  const [profiles, total] = await prisma.$transaction([
    prisma.interviewerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.interviewerProfile.count({ where })
  ]);

  return {
    interviewers: profiles.map(mapInterviewer),
    total,
    page,
    pageSize
  };
}

export async function getInterviewerProfileById(id: string): Promise<InterviewerProfileDto | null> {
  const profile = await prisma.interviewerProfile.findUnique({ where: { id } });
  return profile ? mapInterviewer(profile) : null;
}

export async function getInterviewerProfileByUserId(userId: string): Promise<InterviewerProfileDto | null> {
  const profile = await prisma.interviewerProfile.findUnique({ where: { userId } });
  return profile ? mapInterviewer(profile) : null;
}

export async function createInterviewerProfile(payload: InterviewerProfileInput): Promise<InterviewerProfileDto> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      include: { interviewerProfile: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.interviewerProfile) {
      throw new Error('Interviewer profile already exists for this user');
    }

    const profile = await tx.interviewerProfile.create({
      data: {
        userId: payload.userId,
        displayName: payload.displayName,
        timezone: payload.timezone,
        experienceYears: payload.experienceYears,
        languages: payload.languages,
        specializations: payload.specializations,
        bio: payload.bio ?? null
      }
    });

    if (user.role !== UserRole.INTERVIEWER) {
      await tx.user.update({ where: { id: payload.userId }, data: { role: UserRole.INTERVIEWER } });
    }

    return profile;
  });

  return mapInterviewer(result);
}

export async function updateInterviewerProfile(
  id: string,
  payload: InterviewerProfileUpdateInput
): Promise<InterviewerProfileDto> {
  const data: Prisma.InterviewerProfileUpdateInput = {};

  if (payload.displayName !== undefined) {
    data.displayName = payload.displayName;
  }

  if (payload.timezone !== undefined) {
    data.timezone = payload.timezone;
  }

  if (payload.experienceYears !== undefined) {
    data.experienceYears = payload.experienceYears;
  }

  if (payload.languages !== undefined) {
    data.languages = payload.languages;
  }

  if (payload.specializations !== undefined) {
    data.specializations = payload.specializations;
  }

  if (payload.bio !== undefined) {
    data.bio = payload.bio ?? null;
  }

  if (payload.rating !== undefined) {
    data.rating = payload.rating;
  }

  const profile = await prisma.interviewerProfile.update({
    where: { id },
    data
  });

  return mapInterviewer(profile);
}

export async function deleteInterviewerProfile(id: string): Promise<void> {
  await prisma.interviewerProfile.delete({ where: { id } });
}
