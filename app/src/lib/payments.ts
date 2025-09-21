import { resolvePaymentRouting } from '../../../shared/src/utils/payments.js';
import type {
  PaymentProvider,
  PaymentProviderProfile,
  PaymentRoutingResult
} from '../../../shared/src/types/payments.js';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES
} from '../../../shared/src/types/user.js';
import type {
  SubscriptionPlan,
  SubscriptionStatus,
  UserProfileRecord,
  UserSubscriptionPreferences
} from '../../../shared/src/types/user.js';

const DEFAULT_SUBSCRIPTION_COUNTRY = 'RU';
const DEFAULT_ROUTING = resolvePaymentRouting(DEFAULT_SUBSCRIPTION_COUNTRY);

export const DEFAULT_USER_SUBSCRIPTION: UserSubscriptionPreferences = {
  plan: SUBSCRIPTION_PLANS[0],
  status: SUBSCRIPTION_STATUSES[0],
  country: DEFAULT_SUBSCRIPTION_COUNTRY,
  currency: DEFAULT_ROUTING.defaultCurrency,
  provider: DEFAULT_ROUTING.primary.provider
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlan(value: unknown): SubscriptionPlan {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    const match = SUBSCRIPTION_PLANS.find((plan) => plan === upper);
    if (match) {
      return match;
    }
  }

  return DEFAULT_USER_SUBSCRIPTION.plan;
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    const match = SUBSCRIPTION_STATUSES.find((status) => status === lower);
    if (match) {
      return match;
    }
  }

  return DEFAULT_USER_SUBSCRIPTION.status;
}

function normalizeCountry(value: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim().slice(0, 2).toUpperCase();
    if (normalized.length === 2) {
      return normalized;
    }
  }

  return DEFAULT_USER_SUBSCRIPTION.country;
}

function normalizeCurrency(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized.length >= 3) {
      return normalized.slice(0, 3);
    }
  }

  return fallback;
}

function normalizeProvider(
  value: unknown,
  allowed: PaymentProvider[],
  fallback: PaymentProvider
): PaymentProvider {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    const match = allowed.find((provider) => provider === normalized);
    if (match) {
      return match;
    }
  }

  return fallback;
}

function normalizeComplianceAcknowledged(
  value: unknown,
  checklist: string[]
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && checklist.includes(item))
    )
  );

  return normalized.length > 0 ? normalized : undefined;
}

function deriveSubscription(
  rawSubscription: unknown
): { subscription: UserSubscriptionPreferences; routing: PaymentRoutingResult } {
  const record = isRecord(rawSubscription) ? rawSubscription : undefined;
  const plan = normalizePlan(record?.plan);
  const status = normalizeStatus(record?.status);
  const country = normalizeCountry(record?.country);
  const preferredCurrency =
    typeof record?.currency === 'string' ? record.currency.trim().toUpperCase() : undefined;
  const routing = resolvePaymentRouting(country, { preferredCurrency });
  const currency = normalizeCurrency(preferredCurrency, routing.defaultCurrency);
  const allowedProviders: PaymentProvider[] = [
    routing.primary.provider,
    ...routing.fallbacks.map((profile) => profile.provider)
  ];
  const provider = normalizeProvider(record?.provider, allowedProviders, routing.primary.provider);
  const complianceAcknowledged = normalizeComplianceAcknowledged(
    record?.complianceAcknowledged,
    routing.complianceChecks
  );
  const requestedInvoiceAt =
    typeof record?.requestedInvoiceAt === 'string' ? record.requestedInvoiceAt : undefined;

  const subscription: UserSubscriptionPreferences = {
    plan,
    status,
    country,
    currency,
    provider
  };

  if (complianceAcknowledged) {
    subscription.complianceAcknowledged = complianceAcknowledged;
  }

  if (requestedInvoiceAt) {
    subscription.requestedInvoiceAt = requestedInvoiceAt;
  }

  return { subscription, routing };
}

export interface BillingChecklistItem {
  label: string;
  acknowledged: boolean;
}

export interface BillingProviderCard {
  provider: PaymentProviderProfile;
  recommendedProvider: PaymentProviderProfile;
  fallbacks: PaymentProviderProfile[];
  currency: string;
  localMethods: string[];
  notes: string[];
  availableCurrencies: string[];
  complianceChecklist: BillingChecklistItem[];
  allComplianceAcknowledged: boolean;
  isRecommended: boolean;
  matchedCountry: string;
  region: string;
  highRisk: boolean;
}

export interface ResolvedUserBilling {
  subscription: UserSubscriptionPreferences;
  routing: PaymentRoutingResult;
  providerCard: BillingProviderCard;
}

function buildAvailableCurrencies(
  routing: PaymentRoutingResult,
  provider: PaymentProviderProfile,
  subscriptionCurrency?: string
): string[] {
  const currencies = new Set<string>();
  const addCurrencies = (items?: string[]) => {
    items?.forEach((currency) => currencies.add(currency));
  };

  addCurrencies(provider.supportedCurrencies);
  addCurrencies(routing.primary.supportedCurrencies);
  routing.fallbacks.forEach((profile) => addCurrencies(profile.supportedCurrencies));

  if (routing.defaultCurrency) {
    currencies.add(routing.defaultCurrency);
  }

  if (subscriptionCurrency) {
    currencies.add(subscriptionCurrency);
  }

  return Array.from(currencies);
}

function buildProviderCard(
  subscription: UserSubscriptionPreferences,
  routing: PaymentRoutingResult
): BillingProviderCard {
  const providers = [routing.primary, ...routing.fallbacks];
  const providerProfile =
    providers.find((profile) => profile.provider === subscription.provider) ?? routing.primary;
  const acknowledgedSet = new Set(subscription.complianceAcknowledged ?? []);
  const complianceChecklist = routing.complianceChecks.map((item) => ({
    label: item,
    acknowledged: acknowledgedSet.has(item)
  }));

  const allComplianceAcknowledged = complianceChecklist.every((item) => item.acknowledged);
  const availableCurrencies = buildAvailableCurrencies(
    routing,
    providerProfile,
    subscription.currency
  );

  return {
    provider: providerProfile,
    recommendedProvider: routing.primary,
    fallbacks: routing.fallbacks,
    currency: subscription.currency ?? routing.defaultCurrency,
    localMethods: providerProfile.localMethods,
    notes: providerProfile.notes ?? [],
    availableCurrencies,
    complianceChecklist,
    allComplianceAcknowledged,
    isRecommended: providerProfile.provider === routing.primary.provider,
    matchedCountry: routing.matchedCountry,
    region: routing.region,
    highRisk: routing.highRisk
  };
}

export function resolveUserBilling(
  profile: UserProfileRecord | Record<string, unknown> | null | undefined
): ResolvedUserBilling {
  const record = isRecord(profile) ? profile : undefined;
  const rawSubscription = record && isRecord(record.subscription) ? record.subscription : undefined;

  const { subscription, routing } = deriveSubscription(rawSubscription);
  const providerCard = buildProviderCard(subscription, routing);

  return {
    subscription,
    routing,
    providerCard
  };
}
