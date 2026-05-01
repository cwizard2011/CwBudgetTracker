import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from '../models/Budget';
import { Loan, LoanCounterparty } from '../models/Loan';
import { STORAGE_KEYS } from '../config/storageKeys';

const KEY_BUDGETS = STORAGE_KEYS.BUDGETS;
const KEY_LOANS = STORAGE_KEYS.LOANS;
const KEY_COUNTERPARTIES = STORAGE_KEYS.COUNTERPARTIES;
const KEY_PENDING_MUTATIONS = STORAGE_KEYS.PENDING_MUTATIONS;
const KEY_SETTINGS = STORAGE_KEYS.SETTINGS;

const isUtcMidnight = (date: Date) =>
  date.getUTCHours() === 0
  && date.getUTCMinutes() === 0
  && date.getUTCSeconds() === 0
  && date.getUTCMilliseconds() === 0;

const normalizeDateOnlyEpoch = (value: number): number => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  // Legacy date-only values were stored as UTC midnight; convert them to local midnight.
  if (isUtcMidnight(date)) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getTime();
  }
  return value;
};

export interface PendingMutation {
  collection: 'budgets' | 'loans';
  type: 'create' | 'update' | 'delete';
  payload: any;
}

export class LocalStorage {
  /* Budgets */
  static async getBudgets(): Promise<Budget[]> {
    const raw = await AsyncStorage.getItem(KEY_BUDGETS);
    return raw ? (JSON.parse(raw) as Budget[]) : [];
  }

  static async saveBudgets(budgets: Budget[]) {
    await AsyncStorage.setItem(KEY_BUDGETS, JSON.stringify(budgets));
  }

  /* Loans */
  static async getLoans(): Promise<Loan[]> {
    const raw = await AsyncStorage.getItem(KEY_LOANS);
    const list: Loan[] = raw ? (JSON.parse(raw) as Loan[]) : [];
    // migration: ensure loanDate exists
    return list.map(l => ({
      ...l,
      loanDate: normalizeDateOnlyEpoch(l.loanDate || l.createdAt),
      issuances: (l.issuances || []).map(i => ({ ...i, date: normalizeDateOnlyEpoch(i.date) })),
    }));
  }

  static async saveLoans(loans: Loan[]) {
    await AsyncStorage.setItem(KEY_LOANS, JSON.stringify(loans));
  }

  /* Loan Counterparties */
  static async getLoanCounterparties(): Promise<LoanCounterparty[]> {
    const raw = await AsyncStorage.getItem(KEY_COUNTERPARTIES);
    return raw ? (JSON.parse(raw) as LoanCounterparty[]) : [];
  }

  static async saveLoanCounterparties(data: LoanCounterparty[]) {
    await AsyncStorage.setItem(KEY_COUNTERPARTIES, JSON.stringify(data));
  }

  /* Pending mutations queued while offline */
  static async enqueueMutation(mutation: PendingMutation) {
    const pending = await LocalStorage.getPendingMutations();
    pending.push(mutation);
    await AsyncStorage.setItem(KEY_PENDING_MUTATIONS, JSON.stringify(pending));
  }

  static async getPendingMutations(): Promise<PendingMutation[]> {
    const raw = await AsyncStorage.getItem(KEY_PENDING_MUTATIONS);
    return raw ? (JSON.parse(raw) as PendingMutation[]) : [];
  }

  static async clearPendingMutations() {
    await AsyncStorage.removeItem(KEY_PENDING_MUTATIONS);
  }

  /* Settings */
  static async getSettings(): Promise<{ theme: 'light'|'dark'|'darkDim'|'darkGray'|'system'; locale: string; currency: string; secondaryCurrency?: string } | null> {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    return raw ? JSON.parse(raw) : null;
  }

  static async saveSettings(value: { theme: 'light'|'dark'|'darkDim'|'darkGray'|'system'; locale: string; currency: string; secondaryCurrency?: string }) {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(value));
  }
}
