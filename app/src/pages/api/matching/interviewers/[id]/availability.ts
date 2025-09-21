import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
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
    
    // Forward other relevant headers
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    
    if (req.method === 'GET') {
      // Get availability
      const response = await fetch(`${API_BASE_URL}/matching/interviewers/${id}/availability`, {
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
    } else if (req.method === 'POST') {
      // Create availability slot
      const response = await fetch(`${API_BASE_URL}/matching/interviewers/${id}/availability`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
          error: errorText || `API request failed with status ${response.status}` 
        });
      }
      
      const data = await response.json();
      return res.status(201).json(data);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy API request' 
    });
  }
}
