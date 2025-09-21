import type { UserRole } from './user.js';

export type AuthUserDto = {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};

export type AuthSessionDto = {
  id: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  revokedAt?: string | null;
};

export type AuditLogEntryDto = {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AccountSecurityOverviewDto = {
  sessions: AuthSessionDto[];
  auditLogs: AuditLogEntryDto[];
};
