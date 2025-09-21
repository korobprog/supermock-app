export const PAYMENT_PROVIDERS = [
  'STRIPE',
  'PADDLE',
  'PAYPAL',
  'PAYEER',
  'YOOMONEY',
  'TINKOFF',
  'RAZORPAY',
  'PAGSEGURO',
  'FLUTTERWAVE',
  'MERCADOPAGO'
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type SettlementSpeed = 'instant' | 't+1' | 't+2' | 't+3+';

export interface PaymentProviderProfile {
  provider: PaymentProvider;
  displayName: string;
  supportedCurrencies: string[];
  supportsRecurring: boolean;
  payoutSpeed: SettlementSpeed;
  localMethods: string[];
  notes?: string[];
}

export interface PaymentRoutingRule {
  region: string;
  countries: string[];
  defaultCurrency: string;
  primary: PaymentProviderProfile;
  fallbacks: PaymentProviderProfile[];
  complianceChecks: string[];
  highRisk?: boolean;
}

export interface PaymentRoutingResult {
  matchedCountry: string;
  region: string;
  defaultCurrency: string;
  primary: PaymentProviderProfile;
  fallbacks: PaymentProviderProfile[];
  complianceChecks: string[];
  highRisk: boolean;
}

export interface PaymentRoutingOptions {
  preferredCurrency?: string;
  allowHighRiskRegions?: boolean;
}
