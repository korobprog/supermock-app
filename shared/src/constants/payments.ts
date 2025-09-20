import type {
  PaymentProvider,
  PaymentProviderProfile,
  PaymentRoutingRule
} from '../types/payments.js';

type ProviderBase = Omit<PaymentProviderProfile, 'provider'>;

const PROVIDER_LIBRARY: Record<PaymentProvider, ProviderBase> = {
  STRIPE: {
    displayName: 'Stripe Billing',
    supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'SGD'],
    supportsRecurring: true,
    payoutSpeed: 't+2',
    localMethods: ['Карты (Visa/Mastercard)', 'ACH debit', 'SEPA', 'Apple Pay', 'Google Pay'],
    notes: ['3DSecure активирован по умолчанию', 'Поддержка налоговых расчётов в 40+ юрисдикциях']
  },
  PADDLE: {
    displayName: 'Paddle Billing',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD'],
    supportsRecurring: true,
    payoutSpeed: 't+3+',
    localMethods: ['Карты', 'PayPal', 'Wire Transfer'],
    notes: ['Merchant of record', 'Берёт на себя расчёт налогов и выписывание счетов']
  },
  PAYPAL: {
    displayName: 'PayPal Commerce Platform',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
    supportsRecurring: true,
    payoutSpeed: 'instant',
    localMethods: ['PayPal balance', 'Карты'],
    notes: ['Подходит как резервный провайдер', 'Мгновенный выпуск инвойсов']
  },
  PAYEER: {
    displayName: 'Payeer for CIS',
    supportedCurrencies: ['USD', 'EUR', 'RUB', 'KZT', 'BYN'],
    supportsRecurring: false,
    payoutSpeed: 't+1',
    localMethods: ['Баланс Payeer', 'Местные карты', 'Крипто-кошельки'],
    notes: ['Подходит для платежей из РФ/СНГ', 'Есть антифрод встроенный']
  },
  YOOMONEY: {
    displayName: 'YooMoney (ex. Yandex.Money)',
    supportedCurrencies: ['RUB'],
    supportsRecurring: false,
    payoutSpeed: 't+1',
    localMethods: ['YooMoney кошелёк', 'SBP', 'МИР'],
    notes: ['Требуется подтверждённый кошелёк', 'Поддерживает P2P возвраты']
  },
  TINKOFF: {
    displayName: 'Tinkoff Merchant',
    supportedCurrencies: ['RUB'],
    supportsRecurring: true,
    payoutSpeed: 't+1',
    localMethods: ['МИР', 'Visa/Mastercard (локальные)', 'SBP'],
    notes: ['Нужна российская юр-структура', 'Поддерживается подписочная модель']
  },
  RAZORPAY: {
    displayName: 'Razorpay India',
    supportedCurrencies: ['INR', 'USD'],
    supportsRecurring: true,
    payoutSpeed: 't+2',
    localMethods: ['UPI', 'NetBanking', 'Cards', 'Wallets'],
    notes: ['Авто-3DS', 'Поддержка eMandate для подписок']
  },
  PAGSEGURO: {
    displayName: 'PagSeguro Brazil',
    supportedCurrencies: ['BRL'],
    supportsRecurring: true,
    payoutSpeed: 't+3+',
    localMethods: ['Boleto', 'PIX', 'Карты'],
    notes: ['Нужна локальная документация', 'Популярен среди бразильских пользователей']
  },
  FLUTTERWAVE: {
    displayName: 'Flutterwave Africa',
    supportedCurrencies: ['NGN', 'KES', 'ZAR', 'USD'],
    supportsRecurring: true,
    payoutSpeed: 't+1',
    localMethods: ['M-Pesa', 'Bank Transfer', 'Карты'],
    notes: ['Выводы на мобильные кошельки', 'Поддержка локальных африканских валют']
  },
  MERCADOPAGO: {
    displayName: 'MercadoPago LatAm',
    supportedCurrencies: ['MXN', 'ARS', 'CLP', 'COP', 'PEN'],
    supportsRecurring: true,
    payoutSpeed: 't+2',
    localMethods: ['Spei', 'PSE', 'Карты', 'QR'],
    notes: ['Глубокая локализация под Латинскую Америку', 'Гарантирует высокие approve rates']
  }
};

function createProviderProfile(
  provider: PaymentProvider,
  overrides: Partial<ProviderBase> = {}
): PaymentProviderProfile {
  const base = PROVIDER_LIBRARY[provider];
  return {
    provider,
    displayName: overrides.displayName ?? base.displayName,
    supportedCurrencies: overrides.supportedCurrencies ?? [...base.supportedCurrencies],
    supportsRecurring: overrides.supportsRecurring ?? base.supportsRecurring,
    payoutSpeed: overrides.payoutSpeed ?? base.payoutSpeed,
    localMethods: overrides.localMethods ?? [...base.localMethods],
    notes: overrides.notes ? [...overrides.notes] : base.notes ? [...base.notes] : undefined
  };
}

export const PAYMENT_ROUTING_RULES: PaymentRoutingRule[] = [
  {
    region: 'North America',
    countries: ['US', 'CA'],
    defaultCurrency: 'USD',
    primary: createProviderProfile('STRIPE'),
    fallbacks: [createProviderProfile('PAYPAL'), createProviderProfile('PADDLE')],
    complianceChecks: ['Stripe Radar rules', 'IRS tax reporting (1099-K)'],
    highRisk: false
  },
  {
    region: 'United Kingdom & Ireland',
    countries: ['GB', 'IE'],
    defaultCurrency: 'GBP',
    primary: createProviderProfile('STRIPE', {
      supportedCurrencies: ['GBP', 'EUR', 'USD'],
      notes: ['Включить UK open banking', 'SCA обязательна для карт']
    }),
    fallbacks: [createProviderProfile('PADDLE')],
    complianceChecks: ['Strong Customer Authentication', 'VAT MOSS']
  },
  {
    region: 'European Union',
    countries: ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'FI', 'SE', 'DK', 'NO'],
    defaultCurrency: 'EUR',
    primary: createProviderProfile('STRIPE', {
      supportedCurrencies: ['EUR', 'USD', 'GBP'],
      localMethods: ['SEPA', 'iDEAL', 'Bancontact', 'Карты']
    }),
    fallbacks: [createProviderProfile('PADDLE')],
    complianceChecks: ['PSD2 SCA', 'VAT OSS registration']
  },
  {
    region: 'India',
    countries: ['IN'],
    defaultCurrency: 'INR',
    primary: createProviderProfile('RAZORPAY'),
    fallbacks: [
      createProviderProfile('STRIPE', {
        supportedCurrencies: ['INR', 'USD'],
        notes: ['Поддержка UPI через Stripe Financial Connections']
      })
    ],
    complianceChecks: ['RBI eMandate', 'UPI transaction limits']
  },
  {
    region: 'Brazil',
    countries: ['BR'],
    defaultCurrency: 'BRL',
    primary: createProviderProfile('PAGSEGURO'),
    fallbacks: [
      createProviderProfile('STRIPE', { supportedCurrencies: ['BRL', 'USD'], localMethods: ['PIX', 'Карты'] })
    ],
    complianceChecks: ['PIX settlement compliance', 'Cadastro Nacional da Pessoa Jurídica (CNPJ)']
  },
  {
    region: 'Latin America (North)',
    countries: ['MX', 'CO', 'CL', 'PE'],
    defaultCurrency: 'MXN',
    primary: createProviderProfile('MERCADOPAGO'),
    fallbacks: [createProviderProfile('PADDLE')],
    complianceChecks: ['KYC в каждой стране', 'Декларация по IVA']
  },
  {
    region: 'Africa',
    countries: ['NG', 'KE', 'GH', 'ZA'],
    defaultCurrency: 'NGN',
    primary: createProviderProfile('FLUTTERWAVE'),
    fallbacks: [createProviderProfile('PAYPAL')],
    complianceChecks: ['CBN лицензия для нигерийских транзакций', 'M-Pesa бизнес-аккаунт']
  },
  {
    region: 'CIS & Friendly markets',
    countries: ['RU', 'BY', 'KZ', 'AM', 'KG'],
    defaultCurrency: 'RUB',
    primary: createProviderProfile('PAYEER'),
    fallbacks: [createProviderProfile('YOOMONEY'), createProviderProfile('TINKOFF')],
    complianceChecks: ['Проверка по санкционным спискам', 'KYC на каждого получателя'],
    highRisk: true
  },
  {
    region: 'Middle East',
    countries: ['AE', 'SA'],
    defaultCurrency: 'AED',
    primary: createProviderProfile('STRIPE', {
      supportedCurrencies: ['AED', 'USD'],
      notes: ['Подключить local acquiring через Stripe MENA']
    }),
    fallbacks: [createProviderProfile('PADDLE')],
    complianceChecks: ['SAMA guidelines', 'FX controls для USD платежей']
  }
];

export const DEFAULT_PAYMENT_RULE: PaymentRoutingRule = {
  region: 'Global fallback',
  countries: [],
  defaultCurrency: 'USD',
  primary: createProviderProfile('PADDLE'),
  fallbacks: [createProviderProfile('PAYPAL')],
  complianceChecks: ['Базовая KYC в админке', 'Ведение журнала транзакций']
};
