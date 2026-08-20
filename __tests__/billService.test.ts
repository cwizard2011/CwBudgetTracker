import {
  electricityRegisterTotal,
  estimatedBillCost,
  monthSummary,
  normalizeBillReading,
} from '../src/services/BillService';
import { BillMonthlyRate, BillReading, ElectricityRegisterValues } from '../src/models/BillReading';

function reading(
  id: string,
  date: string,
  value: number,
  electricityRegisters?: ElectricityRegisterValues,
): BillReading {
  return {
    id,
    billType: 'electricity',
    date,
    value,
    electricityRegisters,
    source: 'manual',
    createdAt: Number(id.replace(/\D/g, '')) || 1,
  };
}

describe('electricity time-of-use bill summaries', () => {
  it('keeps legacy single-register readings unchanged', () => {
    const readings = [
      reading('1', '2026-07-31', 900),
      reading('2', '2026-08-20', 955),
    ];

    const summary = monthSummary(readings, '2026-08');

    expect(summary.usage).toBe(55);
    expect(summary.electricityRegisters).toBeUndefined();
    expect(summary.latest?.value).toBe(955);
  });

  it('calculates off-peak, peak, and mid-peak usage independently', () => {
    const readings = [
      reading('1', '2026-07-31', 0, { offPeak: 1000, peak: 500, midPeak: 750 }),
      reading('2', '2026-08-10', 0, { offPeak: 1020, peak: 508, midPeak: 765 }),
      reading('3', '2026-08-20', 0, { offPeak: 1045, peak: 520, midPeak: 790 }),
    ];

    const summary = monthSummary(readings, '2026-08');

    expect(summary.electricityRegisters?.offPeak.usage).toBe(45);
    expect(summary.electricityRegisters?.peak.usage).toBe(20);
    expect(summary.electricityRegisters?.midPeak.usage).toBe(40);
    expect(summary.usage).toBe(105);
  });

  it('uses the first monthly register snapshot as the baseline without prior data', () => {
    const readings = [
      reading('1', '2026-08-01', 0, { offPeak: 1000, peak: 500, midPeak: 750 }),
      reading('2', '2026-08-20', 0, { offPeak: 1045, peak: 520, midPeak: 790 }),
    ];

    const summary = monthSummary(readings, '2026-08');

    expect(summary.usage).toBe(105);
    expect(summary.electricityRegisters?.offPeak.baselineValue).toBe(1000);
  });

  it('normalizes a register snapshot into the legacy aggregate value', () => {
    const snapshot = normalizeBillReading(
      reading('1', '2026-08-20', 955, { offPeak: 300, peak: 200, midPeak: 455 }),
    );

    expect(electricityRegisterTotal(snapshot.electricityRegisters)).toBe(955);
    expect(snapshot.value).toBe(955);
  });

  it('ignores invalid persisted register values when normalizing', () => {
    const snapshot = normalizeBillReading(reading('1', '2026-08-20', 955, {
      offPeak: 300,
      peak: -10,
      midPeak: Number.NaN,
    }));

    expect(snapshot.electricityRegisters).toEqual({ offPeak: 300 });
    expect(snapshot.value).toBe(300);
  });

  it('calculates cost with tariff prices and falls back to the legacy unit price', () => {
    const summary = monthSummary([
      reading('1', '2026-07-31', 0, { offPeak: 1000, peak: 500, midPeak: 750 }),
      reading('2', '2026-08-20', 0, { offPeak: 1045, peak: 520, midPeak: 790 }),
    ], '2026-08');
    const rate: BillMonthlyRate = {
      billType: 'electricity',
      yearMonth: '2026-08',
      pricePerUnit: 0.2,
      electricityRegisterPrices: { offPeak: 0.1, peak: 0.3 },
      currency: 'EUR',
      updatedAt: 1,
    };

    // 45 × 0.10 + 20 × 0.30 + 40 × fallback 0.20
    expect(estimatedBillCost(summary, rate)).toBeCloseTo(18.5);
  });

  it('uses the latest snapshot mode instead of mixing single and time-of-use registers', () => {
    const timeOfUseLatest = monthSummary([
      reading('1', '2026-08-01', 900),
      reading('2', '2026-08-10', 0, { offPeak: 300, peak: 200, midPeak: 455 }),
    ], '2026-08');
    expect(timeOfUseLatest.electricityRegisters).toBeDefined();

    const singleLatest = monthSummary([
      reading('1', '2026-08-01', 0, { offPeak: 300, peak: 200, midPeak: 455 }),
      reading('2', '2026-08-10', 960),
    ], '2026-08');
    expect(singleLatest.electricityRegisters).toBeUndefined();
  });

  it('does not estimate a single total with time-band prices', () => {
    const summary = monthSummary([
      reading('1', '2026-07-31', 900),
      reading('2', '2026-08-20', 955),
    ], '2026-08');
    const rate: BillMonthlyRate = {
      billType: 'electricity',
      yearMonth: '2026-08',
      pricePerUnit: 0.1,
      electricityRegisterPrices: { offPeak: 0.1, peak: 0.3, midPeak: 0.2 },
      currency: 'EUR',
      updatedAt: 1,
    };

    expect(estimatedBillCost(summary, rate)).toBeUndefined();
  });
});
