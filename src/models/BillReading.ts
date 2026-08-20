export type BillType = 'electricity' | 'gas' | 'water';

export type BillReadingSource = 'manual' | 'camera' | 'library';

/**
 * Time-of-use registers exposed by three-rate electricity meters.
 *
 * A reading without `electricityRegisters` remains a regular single-tariff
 * reading. Keeping the register map optional makes all existing stored
 * readings backwards compatible.
 */
export type ElectricityRegister = 'offPeak' | 'peak' | 'midPeak';

export type ElectricityRegisterValues = Partial<Record<ElectricityRegister, number>>;

export const ELECTRICITY_REGISTERS: ReadonlyArray<{
  key: ElectricityRegister;
  title: string;
}> = [
  { key: 'offPeak', title: 'Off-peak hours' },
  { key: 'peak', title: 'Peak hours' },
  { key: 'midPeak', title: 'Mid-peak hours' },
];

export interface BillReading {
  id: string;
  billType: BillType;
  date: string; // Local calendar date, YYYY-MM-DD
  /** Aggregate register value; for time-of-use readings this is their sum. */
  value: number;
  /** Present only when an electricity meter is tracked by tariff period. */
  electricityRegisters?: ElectricityRegisterValues;
  source: BillReadingSource;
  imageUri?: string;
  createdAt: number;
}

export interface BillMonthlyRate {
  billType: BillType;
  yearMonth: string; // YYYY-MM
  pricePerUnit: number;
  /** Optional tariff-specific prices; missing periods use pricePerUnit. */
  electricityRegisterPrices?: ElectricityRegisterValues;
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
