import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Prisma, User, UserRole } from '@prisma/client';

import type { AppConfig } from './config.js';
import { prisma } from './prisma.js';

const EMAIL_VERIFICATION_TTL = '1d';
const PASSWORD_RESET_TTL = '1h';
const REFRESH_TOKEN_BYTE_LENGTH = 48;
const VERIFICATION_TOKEN_BYTE_LENGTH = 32;
const RESET_TOKEN_BYTE_LENGTH = 32;

const durationMultipliers: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

type TokenMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type AuditLogInput = {
  userId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};

type SignupResult = {
  user: AuthUser;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  emailVerificationToken: string;
  emailVerificationExpiresAt: Date;
};

type LoginResult = {
  user: AuthUser;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

type RefreshResult = {
  user: AuthUser;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

type PasswordResetRequestResult = {
  token: string | null;
  expiresAt: Date | null;
  userExists: boolean;
};

function toAuthUser(user: User & { emailVerifiedAt: Date | null }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

function parseDurationToMs(value: string): number {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) {
    throw new Error(`Invalid duration value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = durationMultipliers[unit];

  if (!multiplier) {
    throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return amount * multiplier;
}

function addDuration(value: string): Date {
  return new Date(Date.now() + parseDurationToMs(value));
}

function generateToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createAuditLog(entry: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata as any
    }
  });
}

async function issueRefreshToken(
  userId: string,
  config: AppConfig,
  metadata: TokenMetadata
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(REFRESH_TOKEN_BYTE_LENGTH);
  const tokenHash = hashToken(token);
  const expiresAt = addDuration(config.jwt.refreshTokenTtl);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      createdByIp: metadata.ipAddress,
      userAgent: metadata.userAgent
    }
  });

  return { token, expiresAt };
}

async function createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(VERIFICATION_TOKEN_BYTE_LENGTH);
  const tokenHash = hashToken(token);
  const expiresAt = addDuration(EMAIL_VERIFICATION_TTL);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { token, expiresAt };
}

async function createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(RESET_TOKEN_BYTE_LENGTH);
  const tokenHash = hashToken(token);
  const expiresAt = addDuration(PASSWORD_RESET_TTL);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function signupUser(
  email: string,
  password: string,
  role: UserRole,
  config: AppConfig,
  metadata: TokenMetadata
): Promise<SignupResult> {
  const normalizedEmail = email.toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, config.password.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role
      }
    });

    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await issueRefreshToken(
      user.id,
      config,
      metadata
    );

    const {
      token: emailVerificationToken,
      expiresAt: emailVerificationExpiresAt
    } = await createEmailVerificationToken(user.id);

    await createAuditLog({
      userId: user.id,
      action: 'auth.signup',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { role }
    });

    return {
      user: toAuthUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? null }),
      refreshToken,
      refreshTokenExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AuthError('Email already registered', 409);
    }

    throw error;
  }
}

export async function loginUser(
  email: string,
  password: string,
  config: AppConfig,
  metadata: TokenMetadata
): Promise<LoginResult> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new AuthError('Invalid credentials', 401);
  }

  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await issueRefreshToken(
    user.id,
    config,
    metadata
  );

  await createAuditLog({
    userId: user.id,
    action: 'auth.login',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });

  return {
    user: toAuthUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? null }),
    refreshToken,
    refreshTokenExpiresAt
  };
}

export async function refreshSession(
  token: string,
  config: AppConfig,
  metadata: TokenMetadata
): Promise<RefreshResult> {
  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!stored || !stored.user) {
    throw new AuthError('Invalid refresh token', 401);
  }

  if (stored.revokedAt) {
    throw new AuthError('Refresh token has been revoked', 401);
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new AuthError('Refresh token expired', 401);
  }

  const { token: newToken, expiresAt } = await issueRefreshToken(stored.user.id, config, metadata);
  const newTokenHash = hashToken(newToken);

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: {
      revokedAt: new Date(),
      revokedByIp: metadata.ipAddress,
      replacedByTokenHash: newTokenHash
    }
  });

  await createAuditLog({
    userId: stored.user.id,
    action: 'auth.refresh',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });

  return {
    user: toAuthUser({ ...stored.user, emailVerifiedAt: stored.user.emailVerifiedAt ?? null }),
    refreshToken: newToken,
    refreshTokenExpiresAt: expiresAt
  };
}

export async function requestPasswordReset(
  email: string,
  metadata: TokenMetadata
): Promise<PasswordResetRequestResult> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    await createAuditLog({
      action: 'auth.reset.request',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { email: normalizedEmail, userExists: false }
    });

    return { token: null, expiresAt: null, userExists: false };
  }

  const { token, expiresAt } = await createPasswordResetToken(user.id);

  await createAuditLog({
    userId: user.id,
    action: 'auth.reset.request',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    metadata: { email: normalizedEmail }
  });

  return { token, expiresAt, userExists: true };
}

export async function resetPassword(
  token: string,
  newPassword: string,
  config: AppConfig,
  metadata: TokenMetadata
): Promise<AuthUser> {
  const tokenHash = hashToken(token);
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!stored || !stored.user) {
    throw new AuthError('Invalid or expired reset token', 400);
  }

  if (stored.usedAt) {
    throw new AuthError('Reset token already used', 400);
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new AuthError('Reset token expired', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, config.password.saltRounds);

  const user = await prisma.user.update({
    where: { id: stored.user.id },
    data: {
      passwordHash
    }
  });

  await prisma.passwordResetToken.update({
    where: { id: stored.id },
    data: {
      usedAt: new Date()
    }
  });

  await prisma.refreshToken.updateMany({
    where: {
      userId: user.id,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedByIp: metadata.ipAddress
    }
  });

  await createAuditLog({
    userId: user.id,
    action: 'auth.reset.complete',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });

  return toAuthUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? null });
}

export async function verifyEmail(token: string, metadata: TokenMetadata): Promise<AuthUser> {
  const tokenHash = hashToken(token);
  const stored = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!stored || !stored.user) {
    throw new AuthError('Invalid or expired verification token', 400);
  }

  if (stored.verifiedAt) {
    return toAuthUser({ ...stored.user, emailVerifiedAt: stored.user.emailVerifiedAt ?? null });
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new AuthError('Verification token expired', 400);
  }

  const user = await prisma.user.update({
    where: { id: stored.user.id },
    data: {
      emailVerifiedAt: stored.user.emailVerifiedAt ?? new Date()
    }
  });

  await prisma.emailVerificationToken.update({
    where: { id: stored.id },
    data: {
      verifiedAt: new Date()
    }
  });

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
      verifiedAt: null,
      id: { not: stored.id }
    }
  });

  await createAuditLog({
    userId: user.id,
    action: 'auth.verify-email',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });

  return toAuthUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? null });
}

export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return null;
  }

  return toAuthUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? null });
}
