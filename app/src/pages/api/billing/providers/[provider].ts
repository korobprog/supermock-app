import type { NextApiRequest, NextApiResponse } from 'next';

export default function providerStubHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const provider = String(req.query.provider ?? '').toUpperCase();

  res.status(501).json({
    provider,
    message: 'Billing provider integration is not implemented yet. Track upcoming webhook handlers in docs/tudo_yoom.md.',
    plannedWebhook: '/api/payments/yoomoney/webhook'
  });
}
