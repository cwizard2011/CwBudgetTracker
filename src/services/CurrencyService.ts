import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';

// Primary: open.er-api.com — free, no key, updates daily, USD-based rates
// Fallback: frankfurter.app — open-source ECB data, also free and no key
const PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_URL = 'https://api.frankfurter.app/latest?base=USD';

export interface ExchangeRatesCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number; // epoch ms
}

const NINE_AM_GMT_MS = 9 * 60 * 60 * 1000;

function nextNineAmGMT(): number {
  const now = Date.now();
  const todayMidnightGMT = now - (now % 86400000);
  const todayNineAm = todayMidnightGMT + NINE_AM_GMT_MS;
  return todayNineAm > now ? todayNineAm : todayNineAm + 86400000;
}

async function fetchFromPrimary(): Promise<Record<string, number>> {
  const resp = await fetch(PRIMARY_URL);
  if (!resp.ok) throw new Error(`open.er-api status ${resp.status}`);
  const data = await resp.json();
  if (data.result !== 'success' || !data.rates) throw new Error('open.er-api: bad response shape');
  return data.rates as Record<string, number>;
}

async function fetchFromFallback(): Promise<Record<string, number>> {
  const resp = await fetch(FALLBACK_URL);
  if (!resp.ok) throw new Error(`frankfurter.app status ${resp.status}`);
  const data = await resp.json();
  if (!data.rates) throw new Error('frankfurter.app: bad response shape');
  // frankfurter does not include USD itself (it is the base); add it
  return { USD: 1, ...data.rates } as Record<string, number>;
}

class CurrencyService {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _listeners: Array<(cache: ExchangeRatesCache) => void> = [];

  addListener(fn: (cache: ExchangeRatesCache) => void) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  private _notify(cache: ExchangeRatesCache) {
    this._listeners.forEach(fn => fn(cache));
  }

  async getCachedRates(): Promise<ExchangeRatesCache | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
      return raw ? (JSON.parse(raw) as ExchangeRatesCache) : null;
    } catch {
      return null;
    }
  }

  async fetchAndCacheRates(): Promise<ExchangeRatesCache> {
    let rates: Record<string, number>;
    try {
      rates = await fetchFromPrimary();
    } catch (primaryErr) {
      if (__DEV__) console.warn('[CurrencyService] Primary API failed, trying fallback:', primaryErr);
      rates = await fetchFromFallback();
    }

    const cache: ExchangeRatesCache = {
      base: 'USD',
      rates,
      fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(cache));
    this._notify(cache);
    return cache;
  }

  // Call on app start: fetch if today's data is missing, then schedule daily 9am refresh.
  async initAndSchedule(): Promise<ExchangeRatesCache | null> {
    const cached = await this.getCachedRates();
    const needsFetch = !cached || !this._isTodayGMT(cached.fetchedAt);
    let result = cached;
    if (needsFetch) {
      try {
        result = await this.fetchAndCacheRates();
      } catch (e) {
        if (__DEV__) console.warn('[CurrencyService] All fetch sources failed:', e);
      }
    }
    this._scheduleNext();
    return result;
  }

  private _isTodayGMT(epochMs: number): boolean {
    const now = Date.now();
    const todayMidnightGMT = now - (now % 86400000);
    return epochMs >= todayMidnightGMT;
  }

  private _scheduleNext() {
    if (this._timer) clearTimeout(this._timer);
    const delay = nextNineAmGMT() - Date.now();
    this._timer = setTimeout(async () => {
      try {
        await this.fetchAndCacheRates();
      } catch (e) {
        if (__DEV__) console.warn('[CurrencyService] Scheduled fetch failed:', e);
      }
      this._scheduleNext();
    }, delay);
  }

  stop() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  // Convert amount from one currency to another using USD-base rates.
  convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
    if (from === to) return amount;
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) return amount;
    return (amount / fromRate) * toRate;
  }
}

export const currencyService = new CurrencyService();
