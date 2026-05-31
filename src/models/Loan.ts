export type LoanType = 'owedByMe' | 'owedToMe';

export interface Payment {
  id: string;
  amount: number;
  date: number; // epoch millis
  notes?: string;
}

export interface Issuance {
  id: string;
  amount: number;
  date: number; // epoch millis
  notes?: string;
}

export interface Loan {
  id: string;
  counterpartName: string;
  counterpartId?: string;
  type: LoanType;
  principal: number;
  balance: number;
  payments: Payment[];
  issuances?: Issuance[];
  loanDate: number; // epoch millis (user-chosen)
  notes?: string;
  /** ISO 4217 currency code the amounts were entered in (e.g. 'USD', 'NGN'). Defaults to the user's primary currency for legacy records. */
  currency?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoanCounterparty {
  id: string;
  name: string;
  lastUsedAt: number;
}
