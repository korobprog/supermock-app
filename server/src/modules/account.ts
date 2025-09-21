import type { Prisma } from '@prisma/client';

import type {
  AccountSecurityOverviewDto,
  AuditLogEntryDto,
  AuthSessionDto
} from '../../../shared/src/types/auth.js';
import { prisma } from './prisma.js';

type RefreshTokenRecord = Prisma.RefreshTokenGetPayload<{}>;
type AuditLogRecord = Prisma.AuditLogGetPayload<{}>;

type SessionMetadata = {
  ipAddress?: string;
  userAgent?: string;
  actorUserId?: string;
};

function mapSession(record: RefreshTokenRecord): AuthSessionDto {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    ipAddress: record.createdByIp ?? undefined,
    userAgent: record.userAgent ?? undefined,
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null
  };
}

function mapAuditLog(record: AuditLogRecord): AuditLogEntryDto {
  return {
    id: record.id,
    action: record.action,
    createdAt: record.createdAt.toISOString(),
    ipAddress: record.ipAddress ?? undefined,
    userAgent: record.userAgent ?? undefined
  };
}

export async function listAccountSecurity(
  userId: string,
  options?: { sessionLimit?: number; auditLimit?: number }
): Promise<AccountSecurityOverviewDto> {
  const sessionLimit = options?.sessionLimit ?? 20;
  const auditLimit = options?.auditLimit ?? 20;

  const [sessions, auditLogs] = await prisma.$transaction([
    prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: sessionLimit
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: auditLimit
    })
  ]);

  return {
    sessions: sessions.map(mapSession),
    auditLogs: auditLogs.map(mapAuditLog)
  };
}

export async function findSessionById(id: string) {
  return prisma.refreshToken.findUnique({ where: { id } });
}

export async function revokeSessionById(
  sessionId: string,
  metadata: SessionMetadata
): Promise<AuthSessionDto> {
  const existing = await prisma.refreshToken.findUnique({ where: { id: sessionId } });

  if (!existing) {
    throw new Error('Session not found');
  }

  if (!existing.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedByIp: metadata.ipAddress ?? existing.revokedByIp ?? null
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: existing.userId,
        action: 'auth.session.revoke',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata:
          metadata.actorUserId && metadata.actorUserId !== existing.userId
            ? ({ actorUserId: metadata.actorUserId } as Prisma.InputJsonValue)
            : undefined
      }
    });
  }

  const refreshed = await prisma.refreshToken.findUnique({ where: { id: sessionId } });

  if (!refreshed) {
    throw new Error('Session not found');
  }

  return mapSession(refreshed);
}
