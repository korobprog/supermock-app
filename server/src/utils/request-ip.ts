import type { FastifyRequest } from 'fastify';

type HeaderValue = string | string[] | undefined;

function extractFirst(value: HeaderValue): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = extractFirst(entry);
      if (result) {
        return result;
      }
    }
    return null;
  }

  const first = value.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

export function getRequestIp(request: FastifyRequest): string {
  const forwardedFor = extractFirst(request.headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = extractFirst(request.headers['x-real-ip']);
  if (realIp) {
    return realIp;
  }

  const remoteAddress = typeof request.socket?.remoteAddress === 'string' ? request.socket.remoteAddress : null;
  if (remoteAddress) {
    return remoteAddress;
  }

  return request.ip;
}
