import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  getPaymentRouting,
  getSupportedPaymentCountries
} from '../modules/payments.js';

const querySchema = z.object({
  country: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Za-z]{3}$/)
    .optional(),
  allowHighRisk: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
});

export function registerPaymentRoutes(app: FastifyInstance) {
  app.get('/payments/providers', async (request) => {
    const parsed = querySchema.parse(request.query);
    const allowHighRisk =
      typeof parsed.allowHighRisk === 'string'
        ? parsed.allowHighRisk === 'true'
        : parsed.allowHighRisk;

    const routing = getPaymentRouting(parsed.country ?? '', {
      preferredCurrency: parsed.currency,
      allowHighRiskRegions: allowHighRisk
    });

    return {
      country: routing.matchedCountry,
      region: routing.region,
      defaultCurrency: routing.defaultCurrency,
      highRisk: routing.highRisk,
      compliance: routing.complianceChecks,
      primary: routing.primary,
      fallbacks: routing.fallbacks,
      supportedCountries: getSupportedPaymentCountries()
    };
  });
}
