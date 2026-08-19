export type BillType = 'electricity' | 'gas' | 'water';

export type BillReadingSource = 'manual' | 'camera' | 'library';

export interface BillReading {
  id: string;
  billType: BillType;
  date: string; // Local calendar date, YYYY-MM-DD
  value: number;
  source: BillReadingSource;
  imageUri?: string;
  createdAt: number;
}

export interface BillMonthlyRate {
  billType: BillType;
  yearMonth: string; // YYYY-MM
  pricePerUnit: number;
  currency: string;
  updatedAt: number;
}

export const BILL_TYPES: Array<{
  type: BillType;
  title: string;
  icon: string;
  colorKey: 'warning' | 'secondary' | 'primary';
  unit: string;
}> = [
  { type: 'electricity', title: 'Electricity', icon: '⚡', colorKey: 'warning', unit: 'kWh' },
  { type: 'gas', title: 'Gas', icon: '🔥', colorKey: 'secondary', unit: 'm³' },
  { type: 'water', title: 'Water', icon: '💧', colorKey: 'primary', unit: 'm³' },
];

export function billTypeDetails(type: BillType) {
  return BILL_TYPES.find(item => item.type === type) || BILL_TYPES[0];
}
