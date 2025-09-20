import bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';

import type {
  CandidateProfileDto,
  PaginatedUsersDto,
  UpdateUserInput,
  UserDto,
  CreateUserInput
} from '../../../shared/src/types/user.js';
import { prisma } from './prisma.js';

const MAX_PAGE_SIZE = 100;

type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    candidateProfile: true;
    interviewerProfile: true;
  };
}>;

type CandidateProfileRecord = Prisma.CandidateProfileGetPayload<{}>;
type InterviewerProfileRecord = Prisma.InterviewerProfileGetPayload<{}>;

type ListUsersParams = {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  search?: string;
};

function mapCandidateProfile(profile: CandidateProfileRecord | null | undefined): CandidateProfileDto | null {
  if (!profile) {
    return null;
  }

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

function mapInterviewerProfile(profile: InterviewerProfileRecord | null | undefined) {
  if (!profile) {
    return null;
  }

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

function toRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function mapUser(user: UserWithProfiles): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    profile: toRecord(user.profile),
    avatarUrl: user.avatarUrl ?? undefined,
    candidateProfile: mapCandidateProfile(user.candidateProfile),
    interviewerProfile: mapInterviewerProfile(user.interviewerProfile),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function sanitizeProfile(
  profile: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (profile === undefined) {
    return undefined;
  }

  if (profile === null) {
    return Prisma.JsonNull;
  }

  try {
    JSON.stringify(profile);
  } catch (error) {
    throw new Error('Profile must be a JSON-serializable object');
  }

  return profile as Prisma.InputJsonValue;
}

function buildPagination(params?: ListUsersParams) {
  const page = Math.max(params?.page ?? 1, 1);
  const rawPageSize = params?.pageSize ?? 20;
  const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

function buildFilters(params?: ListUsersParams): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (params?.role) {
    where.role = params.role;
  }

  if (params?.search) {
    const search = params.search.trim();

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          candidateProfile: {
            displayName: { contains: search, mode: 'insensitive' }
          }
        },
        {
          interviewerProfile: {
            displayName: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }
  }

  return where;
}

export async function listUsers(params?: ListUsersParams): Promise<PaginatedUsersDto> {
  const { page, pageSize, skip } = buildPagination(params);
  const where = buildFilters(params);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: {
        candidateProfile: true,
        interviewerProfile: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.user.count({ where })
  ]);

  return {
    users: users.map(mapUser),
    total,
    page,
    pageSize
  };
}

export async function getUserById(id: string): Promise<UserDto | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      candidateProfile: true,
      interviewerProfile: true
    }
  });

  return user ? mapUser(user) : null;
}

export async function createUser(input: CreateUserInput): Promise<UserDto> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const data: Prisma.UserCreateInput = {
    email: normalizedEmail,
    role: input.role,
    profile: sanitizeProfile(input.profile) ?? undefined,
    avatarUrl: input.avatarUrl ?? null
  };

  if (input.password) {
    const saltRounds = input.passwordSaltRounds ?? 12;
    data.passwordHash = await bcrypt.hash(input.password, saltRounds);
  }

  const user = await prisma.user.create({
    data,
    include: {
      candidateProfile: true,
      interviewerProfile: true
    }
  });

  return mapUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserDto> {
  const data: Prisma.UserUpdateInput = {};

  if (input.email !== undefined) {
    data.email = input.email.trim().toLowerCase();
  }

  if (input.role !== undefined) {
    data.role = input.role;
  }

  if (input.profile !== undefined) {
    data.profile = sanitizeProfile(input.profile);
  }

  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl;
  }

  if (input.password) {
    const saltRounds = input.passwordSaltRounds ?? 12;
    data.passwordHash = await bcrypt.hash(input.password, saltRounds);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: {
      candidateProfile: true,
      interviewerProfile: true
    }
  });

  return mapUser(user);
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export type {
  ListUsersParams
};
