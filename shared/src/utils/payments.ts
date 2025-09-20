import { DEFAULT_PAYMENT_RULE, PAYMENT_ROUTING_RULES } from '../constants/payments.js';
import type {
  PaymentProviderProfile,
  PaymentRoutingOptions,
  PaymentRoutingResult,
  PaymentRoutingRule
} from '../types/payments.js';

function cloneProfile(profile: PaymentProviderProfile): PaymentProviderProfile {
  return {
    ...profile,
    supportedCurrencies: [...profile.supportedCurrencies],
    localMethods: [...profile.localMethods],
    notes: profile.notes ? [...profile.notes] : undefined
  };
}

function pickRuleForCountry(countryCode: string): PaymentRoutingRule {
  const normalized = countryCode.trim().toUpperCase();
  const rule = PAYMENT_ROUTING_RULES.find((entry) => entry.countries.includes(normalized));
  return rule ?? DEFAULT_PAYMENT_RULE;
}

function reorderByCurrency(
  rule: PaymentRoutingRule,
  preferredCurrency?: string
): { primary: PaymentProviderProfile; fallbacks: PaymentProviderProfile[] } {
  const clonedPrimary = cloneProfile(rule.primary);
  const clonedFallbacks = rule.fallbacks.map(cloneProfile);

  if (!preferredCurrency) {
    return { primary: clonedPrimary, fallbacks: clonedFallbacks };
  }

  const upperCurrency = preferredCurrency.toUpperCase();
  const ordered = [clonedPrimary, ...clonedFallbacks];
  const matching = ordered.find((profile) =>
    profile.supportedCurrencies.includes(upperCurrency)
  );

  if (!matching || matching.provider === clonedPrimary.provider) {
    return { primary: clonedPrimary, fallbacks: clonedFallbacks };
  }

  const reordered = [matching, ...ordered.filter((profile) => profile !== matching)];
  return { primary: reordered[0], fallbacks: reordered.slice(1) };
}

export function resolvePaymentRouting(
  countryCode: string,
  options: PaymentRoutingOptions = {}
): PaymentRoutingResult {
  const normalized = (countryCode ?? '').trim().toUpperCase();
  const allowHighRisk = options.allowHighRiskRegions ?? true;
  const selectedRule = pickRuleForCountry(normalized);
  const isBlockedHighRisk = Boolean(selectedRule.highRisk) && !allowHighRisk;
  const appliedRule = isBlockedHighRisk ? DEFAULT_PAYMENT_RULE : selectedRule;
  const { primary, fallbacks } = reorderByCurrency(appliedRule, options.preferredCurrency);

  return {
    matchedCountry: normalized || 'ZZ',
    region: selectedRule.region,
    defaultCurrency: appliedRule.defaultCurrency,
    complianceChecks: [...appliedRule.complianceChecks],
    highRisk: Boolean(selectedRule.highRisk),
    primary,
    fallbacks
  };
}

export function listSupportedPaymentCountries(): string[] {
  const countries = PAYMENT_ROUTING_RULES.flatMap((rule) => rule.countries);
  return Array.from(new Set(countries)).sort();
}
