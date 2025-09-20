import { OnboardingDraft, Prisma, UserRole } from '@prisma/client';

import type {
  OnboardingDraftDto,
  OnboardingDraftPayload,
  OnboardingDraftResponse,
  CompleteOnboardingPayload,
  CompleteOnboardingResponse
} from '../../../shared/src/types/user.js';
import { prisma } from './prisma.js';
import { getUserById } from './users.js';

const DEFAULT_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function computeExpiry(ttlMs = DEFAULT_DRAFT_TTL_MS) {
  return new Date(Date.now() + ttlMs);
}

function mapDraft(draft: OnboardingDraft): OnboardingDraftDto {
  const dataRecord = (draft.data as Record<string, unknown> | null) ?? null;
  const profile =
    dataRecord && typeof dataRecord.profile === 'object' && dataRecord.profile !== null
      ? (dataRecord.profile as Record<string, unknown>)
      : undefined;

  const focusAreas = Array.isArray(profile?.focusAreas)
    ? (profile!.focusAreas as string[])
    : undefined;
  const preferredRoles = Array.isArray(profile?.preferredRoles)
    ? (profile!.preferredRoles as string[])
    : undefined;

  return {
    id: draft.id,
    email: draft.email,
    locale: draft.locale as OnboardingDraftDto['locale'],
    languages: draft.languages as OnboardingDraftDto['languages'],
    timezone: draft.timezone,
    timezoneSource: draft.timezoneSource as OnboardingDraftDto['timezoneSource'],
    professionId: draft.professionId ?? null,
    customProfession: draft.customProfession ?? undefined,
    expertiseTools: draft.expertiseTools,
    data: dataRecord ?? undefined,
    role:
      typeof profile?.role === 'string'
        ? (profile.role as OnboardingDraftDto['role'])
        : undefined,
    displayName:
      typeof profile?.displayName === 'string' ? (profile.displayName as string) : undefined,
    experienceYears:
      typeof profile?.experienceYears === 'number'
        ? (profile.experienceYears as number)
        : undefined,
    focusAreas,
    preferredRoles,
    bio: typeof profile?.bio === 'string' ? (profile.bio as string) : undefined,
    expiresAt: draft.expiresAt?.toISOString(),
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString()
  };
}

function toJsonData(value?: Record<string, unknown>) {
  if (!value) {
    return Prisma.JsonNull;
  }

  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error('Onboarding draft data must be JSON-serializable');
  }

  return value as Prisma.JsonObject;
}

function sanitizeStringArray(values: readonly string[] | undefined, options?: { lowerCase?: boolean }) {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = options?.lowerCase ? trimmed.toLowerCase() : trimmed;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function buildUserProfilePayload(
  draft: OnboardingDraft,
  payload: CompleteOnboardingPayload
): Record<string, unknown> {
  const baseExpertise = sanitizeStringArray(payload.expertiseTools ?? draft.expertiseTools);

  return {
    locale: draft.locale,
    languages: payload.languages,
    timezone: payload.timezone || draft.timezone,
    timezoneSource: draft.timezoneSource,
    professionId: draft.professionId,
    customProfession: payload.customProfession ?? draft.customProfession ?? null,
    expertiseTools: baseExpertise,
    focusAreas: sanitizeStringArray(payload.focusAreas),
    preferredRoles: sanitizeStringArray(payload.preferredRoles),
    draftId: draft.id
  } satisfies Record<string, unknown>;
}

function buildDraftProfileData(
  draft: OnboardingDraft,
  payload: CompleteOnboardingPayload
): Record<string, unknown> {
  const existingData = (draft.data as Record<string, unknown> | null) ?? {};
  const existingProfile =
    typeof existingData.profile === 'object' && existingData.profile !== null
      ? (existingData.profile as Record<string, unknown>)
      : {};

  return {
    ...existingData,
    profile: {
      ...existingProfile,
      role: payload.role,
      displayName: payload.displayName,
      experienceYears: payload.experienceYears,
      focusAreas: sanitizeStringArray(payload.focusAreas),
      preferredRoles: sanitizeStringArray(payload.preferredRoles),
      bio: payload.bio ?? existingProfile.bio ?? null,
      expertiseTools: sanitizeStringArray(payload.expertiseTools ?? draft.expertiseTools)
    }
  } satisfies Record<string, unknown>;
}

function mergeDraftPayloadData(payload: OnboardingDraftPayload): Record<string, unknown> | undefined {
  const baseData = payload.data ? { ...payload.data } : {};
  const existingProfile =
    typeof baseData.profile === 'object' && baseData.profile !== null
      ? { ...(baseData.profile as Record<string, unknown>) }
      : {};

  if (payload.role) {
    existingProfile.role = payload.role;
  }

  if (payload.displayName) {
    existingProfile.displayName = payload.displayName;
  }

  if (typeof payload.experienceYears === 'number') {
    existingProfile.experienceYears = payload.experienceYears;
  }

  if (payload.focusAreas) {
    existingProfile.focusAreas = sanitizeStringArray(payload.focusAreas);
  }

  if (payload.preferredRoles) {
    existingProfile.preferredRoles = sanitizeStringArray(payload.preferredRoles);
  }

  if (payload.bio !== undefined) {
    existingProfile.bio = payload.bio;
  }

  if (payload.expertiseTools) {
    existingProfile.expertiseTools = sanitizeStringArray(payload.expertiseTools);
  }

  if (payload.customProfession) {
    existingProfile.customProfession = payload.customProfession;
  }

  if (Object.keys(existingProfile).length > 0) {
    baseData.profile = existingProfile;
  }

  return Object.keys(baseData).length > 0 ? baseData : undefined;
}

function toProfileJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error('User profile must be JSON-serializable');
  }

  return value as Prisma.InputJsonValue;
}

export async function saveOnboardingDraft(
  payload: OnboardingDraftPayload,
  options?: { ttlMs?: number }
): Promise<OnboardingDraftResponse> {
  const draftId = payload.id.trim();

  if (!draftId) {
    throw new Error('Draft id is required');
  }

  const email = payload.email.trim().toLowerCase();
  const expiresAt = computeExpiry(options?.ttlMs);
  const expertiseTools = sanitizeStringArray(payload.expertiseTools);
  const normalizedPayload: OnboardingDraftPayload = {
    ...payload,
    expertiseTools
  };
  const mergedData = mergeDraftPayloadData(normalizedPayload);

  const draft = await prisma.onboardingDraft.upsert({
    where: { id: draftId },
    update: {
      email,
      locale: normalizedPayload.locale,
      languages: normalizedPayload.languages,
      timezone: normalizedPayload.timezone,
      timezoneSource: normalizedPayload.timezoneSource,
      professionId: normalizedPayload.professionId,
      customProfession: normalizedPayload.customProfession ?? null,
      expertiseTools,
      data: toJsonData(mergedData),
      expiresAt
    },
    create: {
      id: draftId,
      email,
      locale: normalizedPayload.locale,
      languages: normalizedPayload.languages,
      timezone: normalizedPayload.timezone,
      timezoneSource: normalizedPayload.timezoneSource,
      professionId: normalizedPayload.professionId,
      customProfession: normalizedPayload.customProfession ?? null,
      expertiseTools,
      data: toJsonData(mergedData),
      expiresAt
    }
  });

  return {
    draftId: draft.id,
    savedAt: draft.updatedAt.toISOString(),
    expiresAt: draft.expiresAt?.toISOString()
  };
}

export async function getOnboardingDraft(id: string): Promise<OnboardingDraftDto | null> {
  const draft = await prisma.onboardingDraft.findUnique({ where: { id } });
  return draft ? mapDraft(draft) : null;
}

export async function deleteOnboardingDraft(id: string): Promise<void> {
  await prisma.onboardingDraft.delete({ where: { id } });
}

export async function finalizeOnboarding(
  payload: CompleteOnboardingPayload
): Promise<CompleteOnboardingResponse> {
  const draft = await prisma.onboardingDraft.findUnique({ where: { id: payload.draftId } });

  if (!draft) {
    throw new Error('Onboarding draft not found');
  }

  const normalizedFocusAreas = sanitizeStringArray(payload.focusAreas);
  const normalizedPreferredRoles = sanitizeStringArray(payload.preferredRoles);
  const normalizedLanguages = sanitizeStringArray(payload.languages);
  const normalizedExpertise = sanitizeStringArray(payload.expertiseTools ?? draft.expertiseTools);
  const timezone = payload.timezone || draft.timezone;

  const result = await prisma.$transaction(async (tx) => {
    const profilePayload = buildUserProfilePayload(draft, payload);

    const user = await tx.user.upsert({
      where: { id: payload.userId },
      update: {
        role: payload.role,
        email: draft.email.trim().toLowerCase(),
        profile: toProfileJson(profilePayload)
      },
      create: {
        id: payload.userId,
        email: draft.email.trim().toLowerCase(),
        role: payload.role,
        profile: toProfileJson(profilePayload)
      }
    });

    if (payload.role === UserRole.CANDIDATE) {
      await tx.candidateProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: payload.displayName,
          timezone,
          experienceYears: payload.experienceYears,
          preferredRoles: normalizedPreferredRoles,
          preferredLanguages: normalizedLanguages,
          focusAreas: normalizedFocusAreas,
          bio: payload.bio ?? null
        },
        create: {
          userId: user.id,
          displayName: payload.displayName,
          timezone,
          experienceYears: payload.experienceYears,
          preferredRoles: normalizedPreferredRoles,
          preferredLanguages: normalizedLanguages,
          focusAreas: normalizedFocusAreas,
          bio: payload.bio ?? null
        }
      });
    } else if (payload.role === UserRole.INTERVIEWER) {
      await tx.interviewerProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: payload.displayName,
          timezone,
          experienceYears: payload.experienceYears,
          languages: normalizedLanguages,
          specializations: normalizedFocusAreas,
          bio: payload.bio ?? null
        },
        create: {
          userId: user.id,
          displayName: payload.displayName,
          timezone,
          experienceYears: payload.experienceYears,
          languages: normalizedLanguages,
          specializations: normalizedFocusAreas,
          bio: payload.bio ?? null
        }
      });
    }

    await tx.onboardingDraft.update({
      where: { id: draft.id },
      data: {
        data: toJsonData(buildDraftProfileData(draft, payload)),
        expertiseTools: normalizedExpertise,
        expiresAt: new Date(Date.now() + DEFAULT_DRAFT_TTL_MS / 2)
      }
    });

    return user.id;
  });

  const user = await getUserById(result);

  if (!user) {
    throw new Error('Unable to load user after onboarding completion');
  }

  return {
    user,
    candidateProfile: user.candidateProfile,
    interviewerProfile: user.interviewerProfile
  };
}
