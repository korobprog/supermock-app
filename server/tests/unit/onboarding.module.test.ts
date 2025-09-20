import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsert, findUnique, deleteMock } = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUnique: vi.fn(),
  deleteMock: vi.fn()
}));

vi.mock('../../src/modules/prisma.js', () => ({
  prisma: {
    onboardingDraft: {
      upsert,
      findUnique,
      delete: deleteMock
    }
  }
}));

import {
  deleteOnboardingDraft,
  getOnboardingDraft,
  saveOnboardingDraft
} from '../../src/modules/onboarding.js';

const baseDraft = {
  id: 'draft-1',
  email: 'user@example.com',
  locale: 'en',
  languages: ['en'],
  timezone: 'UTC',
  timezoneSource: 'auto',
  professionId: null,
  customProfession: null,
  expertiseTools: ['jest'],
  data: { notes: 'hello' },
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('onboarding module', () => {
  beforeEach(() => {
    upsert.mockReset();
    findUnique.mockReset();
    deleteMock.mockReset();
  });

  it('saves onboarding draft and returns metadata', async () => {
    upsert.mockResolvedValue({ ...baseDraft });

    const result = await saveOnboardingDraft({
      id: baseDraft.id,
      email: baseDraft.email,
      locale: 'en',
      languages: ['en'],
      timezone: baseDraft.timezone,
      timezoneSource: 'auto',
      professionId: null,
      customProfession: undefined,
      expertiseTools: baseDraft.expertiseTools,
      data: baseDraft.data
    }, { ttlMs: 5000 });

    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0][0];
    expect(args.where).toEqual({ id: baseDraft.id });
    expect(args.create.email).toBe(baseDraft.email);
    expect(args.update.email).toBe(baseDraft.email);
    expect(result).toEqual({
      draftId: baseDraft.id,
      savedAt: baseDraft.updatedAt.toISOString(),
      expiresAt: baseDraft.expiresAt.toISOString()
    });
  });

  it('returns mapped draft when found', async () => {
    findUnique.mockResolvedValue({ ...baseDraft });

    const draft = await getOnboardingDraft(baseDraft.id);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: baseDraft.id } });
    expect(draft).toMatchObject({
      id: baseDraft.id,
      expertiseTools: baseDraft.expertiseTools,
      data: baseDraft.data
    });
  });

  it('deletes draft by id', async () => {
    await deleteOnboardingDraft(baseDraft.id);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: baseDraft.id } });
  });
});
