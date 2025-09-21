import type { NextApiRequest, NextApiResponse } from 'next';

export default async function invoicesStubHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      message:
        'Stub endpoint. Use POST to request an invoice once YooMoney webhooks are connected.',
      plannedWebhook: '/api/payments/yoomoney/webhook'
    });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const { subscription, userId } = req.body ?? {};

  res.status(202).json({
    message: 'Invoice request queued (stub). Billing webhooks will be wired once YooMoney integration lands.',
    subscription,
    userId,
    webhookEndpoint: '/api/payments/yoomoney/webhook'
  });
}
