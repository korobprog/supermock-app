import type { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  deleteOnboardingDraft,
  getOnboardingDraft,
  saveOnboardingDraft,
  finalizeOnboarding
} from '../modules/onboarding.js';

const supportedLanguages = ['en', 'ru', 'es', 'fr', 'de', 'zh'] as const;

const saveOnboardingSchema = z.object({
  id: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(supportedLanguages),
  languages: z.array(z.enum(supportedLanguages)).min(1),
  timezone: z.string().min(1),
  timezoneSource: z.enum(['auto', 'manual']),
  professionId: z.string().trim().min(1).nullable().optional(),
  customProfession: z.string().trim().optional(),
  expertiseTools: z.array(z.string().trim()).default([]),
  data: z.record(z.any()).optional(),
  role: z.nativeEnum(UserRole).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  focusAreas: z.array(z.string().trim()).optional(),
  preferredRoles: z.array(z.string().trim()).optional(),
  bio: z.string().trim().max(2000).optional()
});

const draftIdParamsSchema = z.object({
  id: z.string().min(1)
});

async function handleSave(body: unknown) {
  const payload = saveOnboardingSchema.parse(body);
  return saveOnboardingDraft({
    id: payload.id,
    email: payload.email,
    locale: payload.locale,
    languages: payload.languages,
    timezone: payload.timezone,
    timezoneSource: payload.timezoneSource,
    professionId: payload.professionId ?? null,
    customProfession: payload.customProfession,
    expertiseTools: payload.expertiseTools,
    data: payload.data,
    role: payload.role,
    displayName: payload.displayName,
    experienceYears: payload.experienceYears,
    focusAreas: payload.focusAreas,
    preferredRoles: payload.preferredRoles,
    bio: payload.bio
  });
}

const completeOnboardingSchema = z.object({
  draftId: z.string().min(1),
  userId: z.string().min(1),
  role: z.nativeEnum(UserRole),
  displayName: z.string().trim().min(3).max(120),
  experienceYears: z.number().int().min(0).max(60),
  timezone: z.string().min(1),
  languages: z.array(z.enum(supportedLanguages)).min(1),
  focusAreas: z.array(z.string().trim()).default([]),
  preferredRoles: z.array(z.string().trim()).default([]),
  bio: z.string().trim().max(2000).optional(),
  expertiseTools: z.array(z.string().trim()).default([]),
  customProfession: z.string().trim().optional()
});

export function registerOnboardingRoutes(app: FastifyInstance) {
  app.post('/onboarding/profile/draft', async (request) => {
    return handleSave(request.body);
  });

  app.post('/onboarding/save', async (request) => {
    return handleSave(request.body);
  });

  app.get('/onboarding/profile/draft/:id', async (request, reply) => {
    const { id } = draftIdParamsSchema.parse(request.params);
    const draft = await getOnboardingDraft(id);

    if (!draft) {
      reply.code(404);
      throw new Error('Draft not found');
    }

    return draft;
  });

  app.delete('/onboarding/profile/draft/:id', async (request, reply) => {
    const { id } = draftIdParamsSchema.parse(request.params);

    await deleteOnboardingDraft(id);

    reply.code(204);
    return null;
  });

  app.post('/onboarding/complete', async (request) => {
    const payload = completeOnboardingSchema.parse(request.body);

    return finalizeOnboarding({
      draftId: payload.draftId,
      userId: payload.userId,
      role: payload.role,
      displayName: payload.displayName,
      experienceYears: payload.experienceYears,
      timezone: payload.timezone,
      languages: payload.languages,
      focusAreas: payload.focusAreas,
      preferredRoles: payload.preferredRoles,
      bio: payload.bio,
      expertiseTools: payload.expertiseTools,
      customProfession: payload.customProfession
    });
  });
}
