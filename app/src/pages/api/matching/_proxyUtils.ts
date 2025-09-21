import type { NextApiRequest } from 'next';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'OPTIONS']);

function getHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function createProxyHeaders(req: NextApiRequest) {
  const headers: Record<string, string> = {};
  const authorization = getHeaderValue(req.headers.authorization);

  if (authorization) {
    headers['Authorization'] = authorization;
    console.log('Forwarding auth header:', `${authorization.substring(0, 20)}...`);
  } else {
    console.log('No authorization header found in request:', Object.keys(req.headers));
  }

  const contentType = getHeaderValue(req.headers['content-type']);
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

export function getRequestBody(req: NextApiRequest, method: string) {
  if (METHODS_WITHOUT_BODY.has(method)) {
    return undefined;
  }

  const { body } = req;

  if (body === undefined || body === null) {
    return undefined;
  }

  return typeof body === 'string' ? body : JSON.stringify(body);
}
