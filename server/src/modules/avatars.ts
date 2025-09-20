import { promises as fs } from 'node:fs';
import path from 'node:path';

import { prisma } from './prisma.js';

const SUPPORTED_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const AVATAR_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');

function detectMediaType(data: string, explicit?: string) {
  if (explicit) {
    return explicit;
  }

  const match = data.match(/^data:(?<type>[^;]+);base64,/);

  if (match?.groups?.type) {
    return match.groups.type;
  }

  return 'image/png';
}

function ensureSupportedMediaType(mediaType: string) {
  if (!SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }
}

function stripDataUrlPrefix(value: string) {
  const [, base64] = value.split('base64,');
  return base64 ?? value;
}

function extensionFromMediaType(mediaType: string) {
  switch (mediaType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

async function ensureDirectory() {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
}

function resolveAvatarPath(filename: string) {
  return path.join(AVATAR_DIR, filename);
}

function buildRelativePath(filename: string) {
  return path.join('uploads', 'avatars', filename);
}

function isInsideAvatarDir(filePath: string) {
  const relative = path.relative(AVATAR_DIR, filePath);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export type SaveAvatarInput = {
  userId: string;
  data: string;
  mediaType?: string;
};

export type AvatarPayload = {
  mediaType: string;
  data: string;
};

export async function saveUserAvatar({ userId, data, mediaType }: SaveAvatarInput): Promise<string> {
  const resolvedMediaType = detectMediaType(data, mediaType);
  ensureSupportedMediaType(resolvedMediaType);

  const base64 = stripDataUrlPrefix(data);
  const buffer = Buffer.from(base64, 'base64');
  const extension = extensionFromMediaType(resolvedMediaType);
  const filename = `${userId}-${Date.now()}.${extension}`;

  await ensureDirectory();

  const absolutePath = resolveAvatarPath(filename);
  await fs.writeFile(absolutePath, buffer);

  const relativePath = buildRelativePath(filename);

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  });

  if (!existing) {
    await fs.unlink(absolutePath).catch(() => undefined);
    throw new Error('User not found');
  }

  if (existing.avatarUrl) {
    const previousPath = path.resolve(process.cwd(), existing.avatarUrl);

    if (isInsideAvatarDir(previousPath)) {
      await fs.unlink(previousPath).catch(() => undefined);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: relativePath }
  });

  return relativePath;
}

export async function getUserAvatar(userId: string): Promise<AvatarPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  });

  if (!user?.avatarUrl) {
    return null;
  }

  const absolutePath = path.resolve(process.cwd(), user.avatarUrl);

  try {
    const buffer = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).slice(1).toLowerCase();
    const mediaType = extension === 'png'
      ? 'image/png'
      : extension === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

    return {
      mediaType,
      data: buffer.toString('base64')
    };
  } catch (error) {
    return null;
  }
}

export async function deleteUserAvatar(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  });

  if (!user?.avatarUrl) {
    return;
  }

  const absolutePath = path.resolve(process.cwd(), user.avatarUrl);

  if (isInsideAvatarDir(absolutePath)) {
    await fs.unlink(absolutePath).catch(() => undefined);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null }
  });
}
