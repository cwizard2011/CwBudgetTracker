import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import {
  BillMonthlyRate,
  BillReading,
  BillType,
  ELECTRICITY_REGISTERS,
  ElectricityRegister,
  ElectricityRegisterValues,
} from '../models/BillReading';

export interface ElectricityRegisterSummary {
  readings: BillReading[];
  latest?: BillReading;
  baseline?: BillReading;
  latestValue?: number;
  baselineValue?: number;
  usage: number;
}

export type ElectricityRegisterSummaries = Record<ElectricityRegister, ElectricityRegisterSummary>;

export interface BillMonthSummary {
  readings: BillReading[];
  latest?: BillReading;
  baseline?: BillReading;
  usage: number;
  /** Set when the selected month contains time-of-use electricity readings. */
  electricityRegisters?: ElectricityRegisterSummaries;
}

function sortReadings(readings: BillReading[]) {
  return [...readings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function cleanRegisterValues(values?: ElectricityRegisterValues): ElectricityRegisterValues | undefined {
  if (!values) return undefined;
  const clean: ElectricityRegisterValues = {};
  ELECTRICITY_REGISTERS.forEach(({ key }) => {
    if (isNonNegativeNumber(values[key])) clean[key] = values[key];
  });
  return Object.keys(clean).length ? clean : undefined;
}

/** Returns the aggregate cumulative value represented by a register snapshot. */
export function electricityRegisterTotal(values?: ElectricityRegisterValues): number | undefined {
  const clean = cleanRegisterValues(values);
  if (!clean) return undefined;
  return ELECTRICITY_REGISTERS.reduce((total, { key }) => total + (clean[key] || 0), 0);
}

/**
 * Keeps the legacy `value` field usable by older UI while preserving the
 * individual time-of-use registers for register-aware summaries.
 */
export function normalizeBillReading(reading: BillReading): BillReading {
  if (reading.billType !== 'electricity') return reading;
  const electricityRegisters = cleanRegisterValues(reading.electricityRegisters);
  const value = electricityRegisterTotal(electricityRegisters);
  if (!electricityRegisters || value === undefined) return reading;
  return { ...reading, value, electricityRegisters };
}

function normalizeBillRate(rate: BillMonthlyRate): BillMonthlyRate {
  if (rate.billType !== 'electricity') return rate;
  const electricityRegisterPrices = cleanRegisterValues(rate.electricityRegisterPrices);
  if (!electricityRegisterPrices) return rate;
  return { ...rate, electricityRegisterPrices };
}

export const billService = {
  async getReadings(type?: BillType): Promise<BillReading[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BILL_READINGS);
    const readings = raw ? (JSON.parse(raw) as BillReading[]).map(normalizeBillReading) : [];
    return sortReadings(type ? readings.filter(item => item.billType === type) : readings);
  },

  async saveReading(reading: BillReading): Promise<void> {
    const readings = await this.getReadings();
    const normalized = normalizeBillReading(reading);
    const index = readings.findIndex(item => item.id === normalized.id);
    if (index >= 0) readings[index] = normalized;
    else readings.push(normalized);
    await AsyncStorage.setItem(STORAGE_KEYS.BILL_READINGS, JSON.stringify(sortReadings(readings)));
  },

  async deleteReading(id: string): Promise<void> {
    const readings = await this.getReadings();
    await AsyncStorage.setItem(
      STORAGE_KEYS.BILL_READINGS,
      JSON.stringify(readings.filter(item => item.id !== id)),
    );
  },

  async getRates(type?: BillType): Promise<BillMonthlyRate[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BILL_RATES);
    const rates = raw ? (JSON.parse(raw) as BillMonthlyRate[]).map(normalizeBillRate) : [];
    return type ? rates.filter(item => item.billType === type) : rates;
  },

  async saveRate(rate: BillMonthlyRate): Promise<void> {
    const rates = await this.getRates();
    const normalized = normalizeBillRate(rate);
    const index = rates.findIndex(item => item.billType === normalized.billType && item.yearMonth === normalized.yearMonth);
    if (index >= 0) rates[index] = normalized;
    else rates.push(normalized);
    await AsyncStorage.setItem(STORAGE_KEYS.BILL_RATES, JSON.stringify(rates));
  },
};

function registerSummary(
  readings: BillReading[],
  yearMonth: string,
  register: ElectricityRegister,
): ElectricityRegisterSummary {
  const matching = sortReadings(readings.filter(item => (
    item.billType === 'electricity' && isNonNegativeNumber(item.electricityRegisters?.[register])
  )));
  const monthReadings = matching.filter(item => item.date.startsWith(yearMonth));
  const previous = matching.filter(item => item.date < `${yearMonth}-01`);
  const latest = monthReadings[monthReadings.length - 1];
  const baseline = previous[previous.length - 1] || monthReadings[0];
  const latestValue = latest?.electricityRegisters?.[register];
  const baselineValue = baseline?.electricityRegisters?.[register];
  const usage = isNonNegativeNumber(latestValue) && isNonNegativeNumber(baselineValue)
    ? Math.max(0, latestValue - baselineValue)
    : 0;
  return { readings: monthReadings, latest, baseline, latestValue, baselineValue, usage };
}

export function monthSummary(readings: BillReading[], yearMonth: string): BillMonthSummary {
  const monthReadings = sortReadings(readings.filter(item => item.date.startsWith(yearMonth)));
  const previous = sortReadings(readings.filter(item => item.date < `${yearMonth}-01`));
  const latest = monthReadings[monthReadings.length - 1];
  const baseline = previous[previous.length - 1] || monthReadings[0];
  const legacyUsage = latest && baseline ? Math.max(0, latest.value - baseline.value) : 0;
  // If a user changes meter setup, the latest snapshot determines which
  // summary mode is active so single-rate and three-register values are never
  // subtracted from one another.
  const hasTimeOfUseReading = latest?.billType === 'electricity'
    && cleanRegisterValues(latest.electricityRegisters) !== undefined;

  if (!hasTimeOfUseReading) {
    return { readings: monthReadings, latest, baseline, usage: legacyUsage };
  }

  const electricityRegisters = Object.fromEntries(ELECTRICITY_REGISTERS.map(({ key }) => [
    key,
    registerSummary(readings, yearMonth, key),
  ])) as ElectricityRegisterSummaries;
  const usage = ELECTRICITY_REGISTERS.reduce((total, { key }) => (
    total + electricityRegisters[key].usage
  ), 0);
  return { readings: monthReadings, latest, baseline, usage, electricityRegisters };
}

/** Calculates a legacy single price or time-of-use electricity estimate. */
export function estimatedBillCost(
  summary: BillMonthSummary,
  rate?: BillMonthlyRate,
): number | undefined {
  if (!rate || !isNonNegativeNumber(rate.pricePerUnit)) return undefined;
  if (rate.billType === 'electricity' && rate.electricityRegisterPrices && !summary.electricityRegisters) {
    // A single total cannot be split across time bands accurately.
    return undefined;
  }
  if (!summary.electricityRegisters || rate.billType !== 'electricity') {
    return summary.usage * rate.pricePerUnit;
  }
  return ELECTRICITY_REGISTERS.reduce((total, { key }) => {
    const registerPrice = rate.electricityRegisterPrices?.[key];
    const price = isNonNegativeNumber(registerPrice) ? registerPrice : rate.pricePerUnit;
    return total + summary.electricityRegisters![key].usage * price;
  }, 0);
}
