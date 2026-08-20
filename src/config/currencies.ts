export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
  'BRL', 'MXN', 'KES', 'ZAR', 'GHS', 'EGP', 'SAR', 'AED', 'SGD', 'HKD',
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

const REGION_CURRENCY: Record<string, SupportedCurrency> = {
  AD: 'EUR', AE: 'AED', AT: 'EUR', AU: 'AUD', BE: 'EUR', BR: 'BRL',
  CA: 'CAD', CH: 'CHF', CN: 'CNY', CY: 'EUR', DE: 'EUR', EE: 'EUR',
  EG: 'EGP', ES: 'EUR', FI: 'EUR', FR: 'EUR', GB: 'GBP', GH: 'GHS',
  GR: 'EUR', HK: 'HKD', HR: 'EUR', IE: 'EUR', IN: 'INR', IT: 'EUR',
  JP: 'JPY', KE: 'KES', LI: 'CHF', LT: 'EUR', LU: 'EUR', LV: 'EUR',
  MC: 'EUR', ME: 'EUR', MT: 'EUR', MX: 'MXN', NG: 'NGN', NL: 'EUR',
  PT: 'EUR', SA: 'SAR', SG: 'SGD', SI: 'EUR', SK: 'EUR', SM: 'EUR',
  US: 'USD', VA: 'EUR', XK: 'EUR', ZA: 'ZAR',
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string'
    && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Returns a currency only when the locale contains a recognizable region. */
export function currencyFromLocale(locale?: string): SupportedCurrency | undefined {
  if (!locale) return undefined;
  const parts = locale.replace(/_/g, '-').split('-');
  const region = parts.slice(1).find(part => /^[A-Za-z]{2}$/.test(part));
  return region ? REGION_CURRENCY[region.toUpperCase()] : undefined;
}

/**
 * Uses the device's regional locale, which is more appropriate for a bill than
 * the user's current GPS position and does not require a location permission.
 */
export function getDeviceCurrency(fallback: string = 'USD'): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return currencyFromLocale(locale) || fallback;
  } catch {
    return fallback;
  }
}
