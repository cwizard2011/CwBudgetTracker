export type LoanType = 'owedByMe' | 'owedToMe';

export interface Payment {
  id: string;
  amount: number;
  date: number; // epoch millis
  notes?: string;
}

export interface Loan {
  id: string;
  counterpartName: string;
  type: LoanType;
  principal: number;
  balance: number;
  payments: Payment[];
  createdAt: number;
  updatedAt: number;
}
