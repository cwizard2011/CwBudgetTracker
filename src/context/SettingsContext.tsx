import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDeviceCurrency, isSupportedCurrency } from '../config/currencies';
import { LocalStorage } from '../services/LocalStorage';

export type AppTheme = 'light' | 'dark' | 'darkDim' | 'darkGray' | 'system';

interface SettingsValue {
  theme: AppTheme;
  locale: string;
  currency: string;
  secondaryCurrency: string;
  billCurrency: string;
  setTheme: (t: AppTheme) => void;
  setLocale: (l: string) => void;
  setCurrency: (c: string) => void;
  setSecondaryCurrency: (c: string) => void;
  setBillCurrency: (c: string) => void;
}

const SettingsContext = createContext<SettingsValue>({} as SettingsValue);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('system');
  const [locale, setLocaleState] = useState<string>(Intl.DateTimeFormat().resolvedOptions().locale || 'en');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [secondaryCurrency, setSecondaryCurrencyState] = useState<string>('USD');
  const [billCurrency, setBillCurrencyState] = useState<string>(() => getDeviceCurrency('USD'));

  useEffect(() => {
    (async () => {
      const s = await LocalStorage.getSettings();
      if (s?.theme) setThemeState(s.theme);
      if (s?.locale) setLocaleState(s.locale);
      if (s?.currency) setCurrencyState(s.currency);
      if (s?.secondaryCurrency) setSecondaryCurrencyState(s.secondaryCurrency);
      setBillCurrencyState(isSupportedCurrency(s?.billCurrency)
        ? s.billCurrency
        : getDeviceCurrency(s?.currency || 'USD'));
    })();
  }, []);

  const persist = useCallback(async (next: Partial<{ theme: AppTheme; locale: string; currency: string; secondaryCurrency: string; billCurrency: string }>) => {
    await LocalStorage.saveSettings({ theme, locale, currency, secondaryCurrency, billCurrency, ...next });
  }, [billCurrency, currency, locale, secondaryCurrency, theme]);

  const value = useMemo<SettingsValue>(() => ({
    theme,
    locale,
    currency,
    secondaryCurrency,
    billCurrency,
    setTheme: (t: AppTheme) => { setThemeState(t); persist({ theme: t }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist theme failed:', e); }); },
    setLocale: (l: string) => { setLocaleState(l); persist({ locale: l }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist locale failed:', e); }); },
    setCurrency: (c: string) => { setCurrencyState(c); persist({ currency: c }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist currency failed:', e); }); },
    setSecondaryCurrency: (c: string) => { setSecondaryCurrencyState(c); persist({ secondaryCurrency: c }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist secondaryCurrency failed:', e); }); },
    setBillCurrency: (c: string) => { setBillCurrencyState(c); persist({ billCurrency: c }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist billCurrency failed:', e); }); },
  }), [theme, locale, currency, secondaryCurrency, billCurrency, persist]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
