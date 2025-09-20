import type {
  PaymentRoutingOptions,
  PaymentRoutingResult
} from '../../../shared/src/types/payments.js';
import {
  listSupportedPaymentCountries,
  resolvePaymentRouting
} from '../../../shared/src/utils/payments.js';

export function getPaymentRouting(
  countryCode: string,
  options: PaymentRoutingOptions = {}
): PaymentRoutingResult {
  return resolvePaymentRouting(countryCode, options);
}

export function getSupportedPaymentCountries(): string[] {
  return listSupportedPaymentCountries();
}
