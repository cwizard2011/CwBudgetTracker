import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from '../models/Budget';
import { Loan, LoanCounterparty } from '../models/Loan';

const KEY_BUDGETS = 'budgets';
const KEY_LOANS = 'loans';
const KEY_COUNTERPARTIES = 'loan_counterparties';
const KEY_PENDING_MUTATIONS = 'pending_mutations';
const KEY_SETTINGS = 'settings';

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
    return list.map(l => ({ ...l, loanDate: l.loanDate || l.createdAt }));
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
  static async getSettings(): Promise<{ theme: 'light'|'dark'|'darkDim'|'darkGray'|'system'; locale: string; currency: string } | null> {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    return raw ? JSON.parse(raw) : null;
  }

  static async saveSettings(value: { theme: 'light'|'dark'|'darkDim'|'darkGray'|'system'; locale: string; currency: string }) {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(value));
  }
}
