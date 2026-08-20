import { currencyFromLocale, getDeviceCurrency, isSupportedCurrency } from '../src/config/currencies';

describe('bill currency detection', () => {
  it.each([
    ['pt-PT', 'EUR'],
    ['en-NG', 'NGN'],
    ['en-GB', 'GBP'],
    ['zh-Hant-HK', 'HKD'],
    ['de_CH', 'CHF'],
  ])('maps %s to %s', (locale, expected) => {
    expect(currencyFromLocale(locale)).toBe(expected);
  });

  it('does not guess when a locale has no region', () => {
    expect(currencyFromLocale('en')).toBeUndefined();
    expect(currencyFromLocale('xx-ZZ')).toBeUndefined();
  });

  it('accepts only currencies offered by the app', () => {
    expect(isSupportedCurrency('EUR')).toBe(true);
    expect(isSupportedCurrency('XYZ')).toBe(false);
  });

  it('uses the supplied fallback when device locale detection is unavailable', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(getDeviceCurrency('CAD')).toBe('CAD');
    spy.mockRestore();
  });
});
