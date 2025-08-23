import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LocalStorage } from '../services/LocalStorage';

export type AppTheme = 'light' | 'dark' | 'darkDim' | 'darkGray' | 'system';

interface SettingsValue {
  theme: AppTheme;
  locale: string;
  currency: string;
  setTheme: (t: AppTheme) => void;
  setLocale: (l: string) => void;
  setCurrency: (c: string) => void;
}

const SettingsContext = createContext<SettingsValue>({} as SettingsValue);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('system');
  const [locale, setLocaleState] = useState<string>(Intl.DateTimeFormat().resolvedOptions().locale || 'en');
  const [currency, setCurrencyState] = useState<string>('USD');

  useEffect(() => {
    (async () => {
      const s = await LocalStorage.getSettings();
      if (s?.theme) setThemeState(s.theme);
      if (s?.locale) setLocaleState(s.locale);
      if (s?.currency) setCurrencyState(s.currency);
    })();
  }, []);

  const persist = async (next: Partial<{ theme: AppTheme; locale: string; currency: string }>) => {
    await LocalStorage.saveSettings({ theme, locale, currency, ...next });
  };

  const value = useMemo<SettingsValue>(() => ({
    theme,
    locale,
    currency,
    setTheme: (t: AppTheme) => { setThemeState(t); persist({ theme: t }); },
    setLocale: (l: string) => { setLocaleState(l); persist({ locale: l }); },
    setCurrency: (c: string) => { setCurrencyState(c); persist({ currency: c }); },
  }), [theme, locale, currency]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);


