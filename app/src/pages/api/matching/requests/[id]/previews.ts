import type { NextApiRequest, NextApiResponse } from 'next';

import { API_BASE_URL, createProxyHeaders, getRequestBody } from '../../_proxyUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method ?? 'GET';
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Request ID is required' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/matching/requests/${id}/previews`, {
      method,
      headers: createProxyHeaders(req),
      body: getRequestBody(req, method)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: errorText || `API request failed with status ${response.status}`
      });
    }

    if (response.status === 204) {
      return res.status(204).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({
      error: 'Failed to proxy API request'
    });
  }
}
