import crypto from 'node:crypto';
import { Prisma, UserRole } from '@prisma/client';

import type {
  CreateInvitationInput,
  InvitationDto,
  ListInvitationsParams
} from '../../../shared/src/types/user.js';
import { prisma } from './prisma.js';

const DEFAULT_INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function generateToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function mapInvitation(invitation: Prisma.UserInvitationGetPayload<{}>): InvitationDto {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    invitedById: invitation.invitedById ?? undefined,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString(),
    revokedAt: invitation.revokedAt?.toISOString(),
    metadata: (invitation.metadata as Record<string, unknown> | null) ?? undefined,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString()
  };
}

function toJsonMetadata(value?: Record<string, unknown>) {
  if (!value) {
    return Prisma.JsonNull;
  }

  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error('Metadata must be JSON-serializable');
  }

  return value as Prisma.JsonObject;
}

export async function createInvitation(input: CreateInvitationInput): Promise<InvitationDto> {
  const email = input.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_INVITATION_TTL_MS));

  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      role: input.role,
      token: generateToken(),
      invitedById: input.invitedById ?? null,
      expiresAt,
      metadata: toJsonMetadata(input.metadata)
    }
  });

  return mapInvitation(invitation);
}

export async function listInvitations(params?: ListInvitationsParams): Promise<InvitationDto[]> {
  const where: Prisma.UserInvitationWhereInput = {};

  if (params?.status === 'pending') {
    where.AND = [
      { acceptedAt: null },
      { revokedAt: null },
      { expiresAt: { gt: new Date() } }
    ];
  }

  if (params?.status === 'accepted') {
    where.acceptedAt = { not: null };
  }

  if (params?.status === 'revoked') {
    where.revokedAt = { not: null };
  }

  if (params?.email) {
    where.email = params.email.trim().toLowerCase();
  }

  if (params?.role) {
    where.role = params.role as UserRole;
  }

  const invitations = await prisma.userInvitation.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return invitations.map(mapInvitation);
}

export async function getInvitationByToken(token: string): Promise<InvitationDto | null> {
  const invitation = await prisma.userInvitation.findUnique({ where: { token } });
  return invitation ? mapInvitation(invitation) : null;
}

export async function acceptInvitation(
  token: string,
  acceptedByUserId?: string
): Promise<InvitationDto> {
  const invitation = await prisma.userInvitation.findUnique({ where: { token } });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.revokedAt) {
    throw new Error('Invitation has been revoked');
  }

  if (invitation.expiresAt <= new Date()) {
    throw new Error('Invitation has expired');
  }

  if (invitation.acceptedAt) {
    return mapInvitation(invitation);
  }

  const metadata = (invitation.metadata as Record<string, unknown> | undefined) ?? {};

  const updated = await prisma.userInvitation.update({
    where: { token },
    data: {
      acceptedAt: new Date(),
      metadata: {
        ...metadata,
        acceptedByUserId: acceptedByUserId ?? null
      }
    }
  });

  return mapInvitation(updated);
}

export async function revokeInvitation(id: string, revokedByUserId?: string): Promise<InvitationDto> {
  const invitation = await prisma.userInvitation.findUnique({ where: { id } });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.revokedAt) {
    return mapInvitation(invitation);
  }

  const metadata = (invitation.metadata as Record<string, unknown> | undefined) ?? {};

  const updated = await prisma.userInvitation.update({
    where: { id },
    data: {
      revokedAt: new Date(),
      metadata: {
        ...metadata,
        revokedByUserId: revokedByUserId ?? null
      }
    }
  });

  return mapInvitation(updated);
}
