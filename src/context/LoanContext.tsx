import React, { createContext, useContext, useEffect, useState } from 'react';
import uuid from 'react-native-uuid';
import { Loan, Payment } from '../models/Loan';
import { LocalStorage } from '../services/LocalStorage';
import { syncService } from '../services/SyncService';

interface LoanContextValue {
  loans: Loan[];
  addLoan: (counterpartName: string, type: Loan['type'], principal: number) => Promise<void>;
  recordPayment: (loanId: string, amount: number, notes?: string) => Promise<void>;
  deleteLoan: (loanId: string) => Promise<void>;
}

const LoanContext = createContext<LoanContextValue>({} as LoanContextValue);

export const LoanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useState<Loan[]>([]);

  /* Load from local storage at mount */
  useEffect(() => {
    const load = async () => {
      const stored = await LocalStorage.getLoans();
      setLoans(stored);
    };
    load();
  }, []);

  const persistAndQueue = async (nextLoans: Loan[]) => {
    setLoans(nextLoans);
    await LocalStorage.saveLoans(nextLoans);
  };

  /* Add new loan */
  const addLoan: LoanContextValue['addLoan'] = async (counterpartName, type, principal) => {
    const now = Date.now();
    const newLoan: Loan = {
      id: uuid.v4().toString(),
      counterpartName,
      type,
      principal,
      balance: principal,
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [...loans, newLoan];
    await persistAndQueue(next);
    await LocalStorage.enqueueMutation({ collection: 'loans', type: 'create', payload: newLoan });
    syncService.start();
  };

  /* Record a payment */
  const recordPayment: LoanContextValue['recordPayment'] = async (loanId, amount, notes) => {
    if (amount <= 0) return;
    const next = loans.map(l => {
      if (l.id !== loanId) return l;
      const payment: Payment = { id: uuid.v4().toString(), amount, date: Date.now(), notes };
      const newBalance = Math.max(0, l.balance - amount);
      return { ...l, payments: [...l.payments, payment], balance: newBalance, updatedAt: Date.now() };
    });
    const updatedLoan = next.find(l => l.id === loanId);
    await persistAndQueue(next);
    if (updatedLoan) {
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'update', payload: updatedLoan });
    }
  };

  /* Delete loan */
  const deleteLoan: LoanContextValue['deleteLoan'] = async loanId => {
    const next = loans.filter(l => l.id !== loanId);
    const deleted = loans.find(l => l.id === loanId);
    await persistAndQueue(next);
    if (deleted) {
      await LocalStorage.enqueueMutation({ collection: 'loans', type: 'delete', payload: deleted });
    }
  };

  return (
    <LoanContext.Provider value={{ loans, addLoan, recordPayment, deleteLoan }}>
      {children}
    </LoanContext.Provider>
  );
};

export const useLoans = () => useContext(LoanContext);