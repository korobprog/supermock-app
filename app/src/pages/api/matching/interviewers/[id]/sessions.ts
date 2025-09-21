import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, limit } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Interviewer ID is required' });
  }
  
  try {
    // Forward authentication headers from the client request
    const headers: Record<string, string> = {};
    
    // Forward Authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('Forwarding auth header:', req.headers.authorization.substring(0, 20) + '...');
    } else {
      console.log('No authorization header found in request:', Object.keys(req.headers));
    }
    
    const url = new URL(`${API_BASE_URL}/matching/interviewers/${id}/sessions`);
    if (limit) {
      url.searchParams.set('limit', String(limit));
    }
    
    const response = await fetch(url.toString(), {
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: errorText || `API request failed with status ${response.status}` 
      });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy API request' 
    });
  }
}
