import { gunzipSync } from 'node:zlib';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUserById: vi.fn(),
  deleteUser: vi.fn(),
  getUserCredentials: vi.fn(),
  verifyAccountDeletionChallenge: vi.fn(),
  listAllNotificationsForUser: vi.fn(),
  authenticate: vi.fn()
}));

vi.mock('@prisma/client', () => ({
  UserRole: {
    CANDIDATE: 'CANDIDATE',
    INTERVIEWER: 'INTERVIEWER',
    ADMIN: 'ADMIN'
  }
}));

vi.mock('../../src/modules/users.js', () => ({
  createUser: mocks.createUser,
  deleteUser: mocks.deleteUser,
  getUserById: mocks.getUserById,
  getUserCredentials: mocks.getUserCredentials,
  listUsers: mocks.listUsers,
  updateUser: mocks.updateUser,
  verifyAccountDeletionChallenge: mocks.verifyAccountDeletionChallenge,
  AccountDeletionError: class AccountDeletionError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
      super(message);
      this.statusCode = statusCode;
    }
  }
}));

vi.mock('../../src/modules/notifications.js', () => ({
  listAllNotificationsForUser: mocks.listAllNotificationsForUser,
  listNotifications: vi.fn(),
  createNotification: vi.fn(),
  markNotificationsAsRead: vi.fn()
}));

vi.mock('../../src/utils/auth.js', () => ({
  authenticate: mocks.authenticate,
  authorizeRoles: () => async (request: any) => {
    request.user = { id: 'admin-user', role: 'ADMIN' };
  }
}));

import { registerUserRoutes } from '../../src/routes/users.route.js';

const baseUser = {
  id: 'user_1',
  email: 'user@example.com',
  role: 'CANDIDATE',
  emailVerifiedAt: null,
  profile: null,
  avatarUrl: undefined,
  candidateProfile: null,
  interviewerProfile: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

const sampleNotification = {
  id: 'notif_1',
  userId: 'user_1',
  type: 'system.notice',
  channel: null,
  payload: undefined,
  readAt: null,
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  metadata: undefined
};

describe('user data management routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    Object.values(mocks).forEach((mockFn) => {
      mockFn.mockReset();
    });

    mocks.authenticate.mockImplementation(async (request: any) => {
      request.user = { id: 'user_1', role: 'CANDIDATE' };
    });

    mocks.listAllNotificationsForUser.mockResolvedValue([]);

    app = fastify();
    registerUserRoutes(app, { passwordSaltRounds: 10 });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('exports sanitized user data as JSON', async () => {
    mocks.getUserById.mockResolvedValue({ ...baseUser } as any);
    mocks.listAllNotificationsForUser.mockResolvedValue([{ ...sampleNotification } as any]);

    const response = await app.inject({
      method: 'GET',
      url: '/users/user_1/export'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body.user.id).toBe('user_1');
    expect(body.notifications).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('exports gzipped archive when requested', async () => {
    mocks.getUserById.mockResolvedValue({ ...baseUser } as any);
    mocks.listAllNotificationsForUser.mockResolvedValue([{ ...sampleNotification } as any]);

    const response = await app.inject({
      method: 'GET',
      url: '/users/user_1/export?format=zip'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/gzip');

    const rawPayload = (response as any).rawPayload as Buffer | undefined;
    const buffer = rawPayload ?? Buffer.from(response.body, 'binary');
    const parsed = JSON.parse(gunzipSync(buffer).toString('utf-8'));

    expect(parsed.user.id).toBe('user_1');
    expect(parsed.notifications).toHaveLength(1);
    expect(JSON.stringify(parsed)).not.toContain('passwordHash');
  });

  it('deletes user after validating challenge', async () => {
    mocks.getUserById.mockResolvedValue({ ...baseUser } as any);
    mocks.getUserCredentials.mockResolvedValue({ id: 'user_1', passwordHash: 'hashed-value' });
    mocks.verifyAccountDeletionChallenge.mockResolvedValue('password');
    mocks.deleteUser.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/users/user_1',
      payload: { password: 'secret-pass' },
      headers: { 'content-type': 'application/json' }
    });

    expect(response.statusCode).toBe(204);
    expect(mocks.verifyAccountDeletionChallenge).toHaveBeenCalledWith(
      { id: 'user_1', passwordHash: 'hashed-value' },
      { password: 'secret-pass', token: undefined }
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith('user_1');
  });
});
