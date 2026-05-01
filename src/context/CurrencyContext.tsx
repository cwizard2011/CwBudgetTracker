import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ExchangeRatesCache, currencyService } from '../services/CurrencyService';
import { useSettings } from './SettingsContext';

interface CurrencyContextValue {
  rates: Record<string, number> | null;
  ratesFetchedAt: number | null;
  // The currency currently used for display on Budget/Loan screens (toggled by user)
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;
  // Convert an amount stored in the main currency to the display currency
  convert: (amount: number, fromCurrency?: string) => number;
  // Whether rates are available for conversion
  hasRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({} as CurrencyContextValue);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currency, secondaryCurrency } = useSettings();
  const [cache, setCache] = useState<ExchangeRatesCache | null>(null);
  // displayCurrency follows the main currency by default; switches to secondary when toggled
  const [displayCurrency, setDisplayCurrency] = useState<string>(currency);

  // Keep displayCurrency in sync when the primary currency changes in settings
  useEffect(() => {
    setDisplayCurrency(currency);
  }, [currency]);

  useEffect(() => {
    let removed = false;
    // Load cached rates immediately
    currencyService.getCachedRates().then(c => {
      if (!removed && c) setCache(c);
    });
    // Listen for new fetches
    const remove = currencyService.addListener(c => {
      if (!removed) setCache(c);
    });
    return () => { removed = true; remove(); };
  }, []);

  const convert = useCallback(
    (amount: number, fromCurrency?: string): number => {
      const from = fromCurrency ?? currency;
      if (!cache?.rates || from === displayCurrency) return amount;
      return currencyService.convert(amount, from, displayCurrency, cache.rates);
    },
    [cache, currency, displayCurrency],
  );

  const value = useMemo<CurrencyContextValue>(() => ({
    rates: cache?.rates ?? null,
    ratesFetchedAt: cache?.fetchedAt ?? null,
    displayCurrency,
    setDisplayCurrency,
    convert,
    hasRates: !!cache?.rates,
  }), [cache, displayCurrency, convert]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);

// Convenience: returns the two currencies for the toggle pill (main ↔ secondary)
export function useCurrencyToggle() {
  const { currency, secondaryCurrency } = useSettings();
  const { displayCurrency, setDisplayCurrency, convert, hasRates } = useCurrency();
  const effectiveSecondary = secondaryCurrency || 'USD';
  const isOnPrimary = displayCurrency === currency;

  const toggle = useCallback(() => {
    setDisplayCurrency(isOnPrimary ? effectiveSecondary : currency);
  }, [isOnPrimary, currency, effectiveSecondary, setDisplayCurrency]);

  return { primaryCurrency: currency, secondaryCurrency: effectiveSecondary, displayCurrency, toggle, isOnPrimary, convert, hasRates };
}
