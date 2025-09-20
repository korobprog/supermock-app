import { describe, expect, it } from 'vitest';

import { getPaymentRouting } from '../../src/modules/payments.js';

describe('payments routing', () => {
  it('prefers Stripe for US customers', () => {
    const routing = getPaymentRouting('US');
    expect(routing.primary.provider).toBe('STRIPE');
    expect(routing.fallbacks.map((profile) => profile.provider)).toContain('PAYPAL');
  });

  it('returns local provider for India', () => {
    const routing = getPaymentRouting('IN');
    expect(routing.primary.provider).toBe('RAZORPAY');
    expect(routing.primary.supportedCurrencies).toContain('INR');
  });

  it('falls back to default when high risk not allowed', () => {
    const routing = getPaymentRouting('RU', { allowHighRiskRegions: false });
    expect(routing.primary.provider).toBe('PADDLE');
    expect(routing.highRisk).toBe(true);
  });

  it('reorders providers for preferred currency', () => {
    const routing = getPaymentRouting('BR', { preferredCurrency: 'USD' });
    expect(routing.primary.supportedCurrencies).toContain('USD');
  });
});
