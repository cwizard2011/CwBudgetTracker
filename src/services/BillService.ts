import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import { BillMonthlyRate, BillReading, BillType } from '../models/BillReading';

function sortReadings(readings: BillReading[]) {
  return [...readings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export const billService = {
  async getReadings(type?: BillType): Promise<BillReading[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BILL_READINGS);
    const readings = raw ? JSON.parse(raw) as BillReading[] : [];
    return sortReadings(type ? readings.filter(item => item.billType === type) : readings);
  },

  async saveReading(reading: BillReading): Promise<void> {
    const readings = await this.getReadings();
    const index = readings.findIndex(item => item.id === reading.id);
    if (index >= 0) readings[index] = reading;
    else readings.push(reading);
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
    const rates = raw ? JSON.parse(raw) as BillMonthlyRate[] : [];
    return type ? rates.filter(item => item.billType === type) : rates;
  },

  async saveRate(rate: BillMonthlyRate): Promise<void> {
    const rates = await this.getRates();
    const index = rates.findIndex(item => item.billType === rate.billType && item.yearMonth === rate.yearMonth);
    if (index >= 0) rates[index] = rate;
    else rates.push(rate);
    await AsyncStorage.setItem(STORAGE_KEYS.BILL_RATES, JSON.stringify(rates));
  },
};

export function monthSummary(readings: BillReading[], yearMonth: string) {
  const monthReadings = sortReadings(readings.filter(item => item.date.startsWith(yearMonth)));
  const previous = sortReadings(readings.filter(item => item.date < `${yearMonth}-01`));
  const latest = monthReadings[monthReadings.length - 1];
  const baseline = previous[previous.length - 1] || monthReadings[0];
  const usage = latest && baseline ? Math.max(0, latest.value - baseline.value) : 0;
  return { readings: monthReadings, latest, baseline, usage };
}
