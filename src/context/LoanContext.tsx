import React, { createContext, useContext, useEffect, useState } from 'react';
import uuid from 'react-native-uuid';
import { Issuance, Loan, LoanCounterparty, Payment } from '../models/Loan';
import { LocalStorage } from '../services/LocalStorage';
import { syncService } from '../services/SyncService';

interface LoanContextValue {
  loans: Loan[];
  counterparties: LoanCounterparty[];
  addLoan: (
    counterpart: { id?: string; name: string },
    type: Loan['type'],
    principal: number,
    loanDate: number,
    options?: { saveCounterparty?: boolean; notes?: string }
  ) => Promise<void>;
  addCounterparty: (name: string) => Promise<string>;
  recordPayment: (loanId: string, amount: number, notes?: string, dateOverrideMs?: number) => Promise<void>;
  deleteLoan: (loanId: string) => Promise<void>;
  updateLoanBasic: (loanId: string, fields: { counterpartName?: string; principal?: number }) => Promise<void>;
}

const LoanContext = createContext<LoanContextValue>({} as LoanContextValue);

export const LoanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [counterparties, setCounterparties] = useState<LoanCounterparty[]>([]);

  /* Load from local storage at mount */
  useEffect(() => {
    const load = async () => {
      const stored = await LocalStorage.getLoans();
      setLoans(stored);
      const cps = await LocalStorage.getLoanCounterparties();
      setCounterparties(cps);
    };
    load();
  }, []);

  const persistAndQueueLoans = async (nextLoans: Loan[]) => {
    setLoans(nextLoans);
    await LocalStorage.saveLoans(nextLoans);
  };

  const persistCounterparties = async (next: LoanCounterparty[]) => {
    setCounterparties(next);
    await LocalStorage.saveLoanCounterparties(next);
  };

  /* Add new loan */
  const addLoan: LoanContextValue['addLoan'] = async (counterpart, type, principal, loanDate, options) => {
    const now = Date.now();
    const name = counterpart.name.trim();
    if (!name || principal <= 0) return;
    let counterpartId = counterpart.id;
    let nextCounterparties = counterparties.slice();
    if (!counterpartId && options?.saveCounterparty) {
      const id = (uuid.v4() as string).toString();
      const cp: LoanCounterparty = { id, name, lastUsedAt: now };
      nextCounterparties = [{ ...cp }, ...nextCounterparties.filter(c => c.name !== name)];
      await persistCounterparties(nextCounterparties);
      counterpartId = id;
    }
    if (counterpartId) {
      nextCounterparties = nextCounterparties.map(c => c.id === counterpartId ? { ...c, lastUsedAt: now } : c);
      await persistCounterparties(nextCounterparties);
    }
    // Try to find existing loan for same counterpart and type
    const existingIndex = loans.findIndex(l => l.counterpartName.toLowerCase() === name.toLowerCase() && l.type === type);
    let next: Loan[];
    if (existingIndex >= 0 && !options?.saveCounterparty) {
      // Merge into existing record
      const existing = loans[existingIndex];
      const issuance: Issuance = { id: uuid.v4().toString(), amount: principal, date: loanDate, notes: options?.notes };
      const updated: Loan = {
        ...existing,
        principal: (existing.principal || 0) + principal,
        balance: (existing.balance || 0) + principal,
        issuances: [...(existing.issuances || []), issuance],
        updatedAt: now,
      };
      next = loans.slice();
      next[existingIndex] = updated;
      await persistAndQueueLoans(next);
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'update', payload: updated });
    } else {
      // Create new record
      const newLoan: Loan = {
        id: uuid.v4().toString(),
        counterpartName: name,
        counterpartId,
        type,
        principal,
        balance: principal,
        payments: [],
        issuances: [{ id: uuid.v4().toString(), amount: principal, date: loanDate, notes: options?.notes }],
        loanDate,
        notes: options?.notes,
        createdAt: now,
        updatedAt: now,
      };
      next = [...loans, newLoan];
      await persistAndQueueLoans(next);
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'create', payload: newLoan });
    }
    syncService.start();
  };

  /* Record a payment */
  const recordPayment: LoanContextValue['recordPayment'] = async (loanId, amount, notes, dateOverrideMs) => {
    if (amount <= 0) return;
    const next = loans.map(l => {
      if (l.id !== loanId) return l;
      const payment: Payment = { id: uuid.v4().toString(), amount, date: dateOverrideMs ?? Date.now(), notes };
      const newBalance = Math.max(0, l.balance - amount);
      return { ...l, payments: [...l.payments, payment], balance: newBalance, updatedAt: Date.now() };
    });
    const updatedLoan = next.find(l => l.id === loanId);
    await persistAndQueueLoans(next);
    if (updatedLoan) {
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'update', payload: updatedLoan });
    }
  };

  /* Delete loan */
  const deleteLoan: LoanContextValue['deleteLoan'] = async loanId => {
    const next = loans.filter(l => l.id !== loanId);
    const deleted = loans.find(l => l.id === loanId);
    await persistAndQueueLoans(next);
    if (deleted) {
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'delete', payload: deleted });
    }
  };

  /* Update basic fields: name and principal (adjusts balance by delta) */
  const updateLoanBasic: LoanContextValue['updateLoanBasic'] = async (loanId, fields) => {
    const next = loans.map(l => {
      if (l.id !== loanId) return l;
      const updated: Loan = { ...l };
      if (typeof fields.counterpartName === 'string' && fields.counterpartName.trim()) {
        updated.counterpartName = fields.counterpartName.trim();
      }
      if (typeof fields.principal === 'number' && !isNaN(fields.principal)) {
        const delta = fields.principal - (l.principal || 0);
        updated.principal = fields.principal;
        updated.balance = Math.max(0, (l.balance || 0) + delta);
        // track issuance change if positive delta
        if (delta > 0) {
          const issuance: Issuance = { id: uuid.v4().toString(), amount: delta, date: Date.now() };
          updated.issuances = [...(l.issuances || []), issuance];
        }
      }
      updated.updatedAt = Date.now();
      return updated;
    });
    const updatedLoan = next.find(l => l.id === loanId);
    await persistAndQueueLoans(next);
    if (updatedLoan) {
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'update', payload: updatedLoan });
    }
  };

  return (
    <LoanContext.Provider value={{ loans, counterparties, addLoan, addCounterparty: async (name: string) => {
      const id = (uuid.v4() as string).toString();
      const now = Date.now();
      const cp: LoanCounterparty = { id, name: name.trim(), lastUsedAt: now };
      const next = [cp, ...counterparties.filter(c => c.name !== cp.name)];
      await persistCounterparties(next);
      return id;
    }, recordPayment, deleteLoan, updateLoanBasic }}>
      {children}
    </LoanContext.Provider>
  );
};

export const useLoans = () => useContext(LoanContext);