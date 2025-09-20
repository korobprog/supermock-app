import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { create, findMany, findUnique, update } = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn()
}));

vi.mock('../../src/modules/prisma.js', () => ({
  prisma: {
    userInvitation: {
      create,
      findMany,
      findUnique,
      update
    }
  }
}));

import {
  acceptInvitation,
  createInvitation,
  listInvitations
} from '../../src/modules/invitations.js';

const baseInvitation = {
  id: 'inv_1',
  email: 'candidate@example.com',
  role: 'CANDIDATE',
  token: 'token123',
  invitedById: 'admin',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  acceptedAt: null,
  revokedAt: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('invitations module', () => {
  beforeEach(() => {
    create.mockReset();
    findMany.mockReset();
    findUnique.mockReset();
    update.mockReset();
    vi.spyOn(crypto, 'randomBytes').mockImplementation(() => Buffer.from('fixed-token'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates invitation with normalized email', async () => {
    create.mockResolvedValue({ ...baseInvitation, token: 'fixed-token', email: 'candidate@example.com' });

    const result = await createInvitation({
      email: 'Candidate@Example.com',
      role: 'CANDIDATE',
      invitedById: 'admin'
    });

    expect(create).toHaveBeenCalledTimes(1);
    const args = create.mock.calls[0][0];
    expect(args.data.email).toBe('candidate@example.com');
    expect(result.token).toBe('fixed-token');
  });

  it('lists invitations and maps payload', async () => {
    findMany.mockResolvedValue([{ ...baseInvitation }]);

    const invitations = await listInvitations({});

    expect(findMany).toHaveBeenCalled();
    expect(invitations).toHaveLength(1);
    expect(invitations[0]).toMatchObject({ id: baseInvitation.id, email: baseInvitation.email });
  });

  it('accepts invitation by token', async () => {
    findUnique.mockResolvedValue({ ...baseInvitation });
    update.mockResolvedValue({ ...baseInvitation, acceptedAt: new Date(), metadata: { acceptedByUserId: 'user_1' } });

    const result = await acceptInvitation(baseInvitation.token, 'user_1');

    expect(update).toHaveBeenCalled();
    expect(result.acceptedAt).toBeDefined();
  });
});
