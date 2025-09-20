import { Prisma, UserRole } from '@prisma/client';

import type {
  CandidateProfileDto,
  CandidateProfileInput,
  CandidateProfileUpdateInput,
  PaginatedCandidatesDto
} from '../../../shared/src/types/user.js';
import { prisma } from './prisma.js';

const MAX_PAGE_SIZE = 100;

type CandidateProfileRecord = Prisma.CandidateProfileGetPayload<{}>;

type PaginatedParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

function mapCandidate(profile: CandidateProfileRecord): CandidateProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    timezone: profile.timezone,
    experienceYears: profile.experienceYears,
    preferredRoles: profile.preferredRoles,
    preferredLanguages: profile.preferredLanguages,
    focusAreas: profile.focusAreas,
    bio: profile.bio ?? undefined,
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

export async function listCandidateProfiles(params?: PaginatedParams): Promise<PaginatedCandidatesDto> {
  const { page, pageSize, skip } = buildPagination(params);
  const where: Prisma.CandidateProfileWhereInput = {};

  if (params?.search) {
    const search = params.search.trim();

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        {
          user: {
            email: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }
  }

  const [profiles, total] = await prisma.$transaction([
    prisma.candidateProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.candidateProfile.count({ where })
  ]);

  return {
    candidates: profiles.map(mapCandidate),
    total,
    page,
    pageSize
  };
}

export async function getCandidateProfileById(id: string): Promise<CandidateProfileDto | null> {
  const profile = await prisma.candidateProfile.findUnique({ where: { id } });
  return profile ? mapCandidate(profile) : null;
}

export async function getCandidateProfileByUserId(userId: string): Promise<CandidateProfileDto | null> {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  return profile ? mapCandidate(profile) : null;
}

export async function createCandidateProfile(payload: CandidateProfileInput): Promise<CandidateProfileDto> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      include: { candidateProfile: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.candidateProfile) {
      throw new Error('Candidate profile already exists for this user');
    }

    const profile = await tx.candidateProfile.create({
      data: {
        userId: payload.userId,
        displayName: payload.displayName,
        timezone: payload.timezone,
        experienceYears: payload.experienceYears,
        preferredRoles: payload.preferredRoles,
        preferredLanguages: payload.preferredLanguages,
        focusAreas: payload.focusAreas,
        bio: payload.bio ?? null
      }
    });

    if (user.role !== UserRole.CANDIDATE) {
      await tx.user.update({ where: { id: payload.userId }, data: { role: UserRole.CANDIDATE } });
    }

    return profile;
  });

  return mapCandidate(result);
}

export async function updateCandidateProfile(
  id: string,
  payload: CandidateProfileUpdateInput
): Promise<CandidateProfileDto> {
  const data: Prisma.CandidateProfileUpdateInput = {};

  if (payload.displayName !== undefined) {
    data.displayName = payload.displayName;
  }

  if (payload.timezone !== undefined) {
    data.timezone = payload.timezone;
  }

  if (payload.experienceYears !== undefined) {
    data.experienceYears = payload.experienceYears;
  }

  if (payload.preferredRoles !== undefined) {
    data.preferredRoles = payload.preferredRoles;
  }

  if (payload.preferredLanguages !== undefined) {
    data.preferredLanguages = payload.preferredLanguages;
  }

  if (payload.focusAreas !== undefined) {
    data.focusAreas = payload.focusAreas;
  }

  if (payload.bio !== undefined) {
    data.bio = payload.bio ?? null;
  }

  const profile = await prisma.candidateProfile.update({
    where: { id },
    data
  });

  return mapCandidate(profile);
}

export async function deleteCandidateProfile(id: string): Promise<void> {
  await prisma.candidateProfile.delete({ where: { id } });
}
