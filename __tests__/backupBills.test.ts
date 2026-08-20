import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../src/config/storageKeys';
import { backupService } from '../src/services/BackupService';

describe('Bills backup and restore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('backs up and restores bill readings and monthly rates', async () => {
    const readings = JSON.stringify([{
      id: 'water-1',
      billType: 'water',
      date: '2026-08-20',
      value: 395,
      source: 'camera',
      createdAt: 1,
    }]);
    const rates = JSON.stringify([{
      billType: 'water',
      yearMonth: '2026-08',
      pricePerUnit: 0.02,
      currency: 'EUR',
      updatedAt: 1,
    }]);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.BILL_READINGS, readings],
      [STORAGE_KEYS.BILL_RATES, rates],
    ]);

    const backup = await backupService.createBackupPayload();
    const payload = JSON.parse(backup.content);
    expect(payload.data[STORAGE_KEYS.BILL_READINGS]).toBe(readings);
    expect(payload.data[STORAGE_KEYS.BILL_RATES]).toBe(rates);

    await AsyncStorage.clear();
    await backupService.restoreFromJsonContent(backup.content, 'test backup');

    expect(await AsyncStorage.getItem(STORAGE_KEYS.BILL_READINGS)).toBe(readings);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.BILL_RATES)).toBe(rates);
  });
});
