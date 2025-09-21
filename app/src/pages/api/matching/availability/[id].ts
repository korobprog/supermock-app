import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid slot ID' });
  }

  try {
    const headers: Record<string, string> = {};
    
    // Only set Content-Type for requests with a body
    if (req.body && Object.keys(req.body).length > 0) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}/matching/availability/${id}`, {
      method: req.method,
      headers,
      ...(req.body && Object.keys(req.body).length > 0 && { body: JSON.stringify(req.body) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Request failed' });
    }

    // For DELETE requests, return 204 No Content
    if (req.method === 'DELETE') {
      return res.status(204).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
