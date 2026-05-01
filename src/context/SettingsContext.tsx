import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LocalStorage } from '../services/LocalStorage';

export type AppTheme = 'light' | 'dark' | 'darkDim' | 'darkGray' | 'system';

interface SettingsValue {
  theme: AppTheme;
  locale: string;
  currency: string;
  secondaryCurrency: string;
  setTheme: (t: AppTheme) => void;
  setLocale: (l: string) => void;
  setCurrency: (c: string) => void;
  setSecondaryCurrency: (c: string) => void;
}

const SettingsContext = createContext<SettingsValue>({} as SettingsValue);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('system');
  const [locale, setLocaleState] = useState<string>(Intl.DateTimeFormat().resolvedOptions().locale || 'en');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [secondaryCurrency, setSecondaryCurrencyState] = useState<string>('USD');

  useEffect(() => {
    (async () => {
      const s = await LocalStorage.getSettings();
      if (s?.theme) setThemeState(s.theme);
      if (s?.locale) setLocaleState(s.locale);
      if (s?.currency) setCurrencyState(s.currency);
      if (s?.secondaryCurrency) setSecondaryCurrencyState(s.secondaryCurrency);
    })();
  }, []);

  const persist = async (next: Partial<{ theme: AppTheme; locale: string; currency: string; secondaryCurrency: string }>) => {
    await LocalStorage.saveSettings({ theme, locale, currency, secondaryCurrency, ...next });
  };

  const value = useMemo<SettingsValue>(() => ({
    theme,
    locale,
    currency,
    secondaryCurrency,
    setTheme: (t: AppTheme) => { setThemeState(t); persist({ theme: t }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist theme failed:', e); }); },
    setLocale: (l: string) => { setLocaleState(l); persist({ locale: l }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist locale failed:', e); }); },
    setCurrency: (c: string) => { setCurrencyState(c); persist({ currency: c }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist currency failed:', e); }); },
    setSecondaryCurrency: (c: string) => { setSecondaryCurrencyState(c); persist({ secondaryCurrency: c }).catch(e => { if (__DEV__) console.error('[SettingsContext] persist secondaryCurrency failed:', e); }); },
  }), [theme, locale, currency, secondaryCurrency]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);


