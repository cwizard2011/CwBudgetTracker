import { detectMeterType, readingCandidates } from '../src/utils/meterOcr';

describe('meter OCR candidate selection', () => {
  it('prefers the large water register over surrounding serial numbers', () => {
    const result = {
      text: 'M21 0071\nLNE 34003\n00395\n121LA164004',
      blocks: [{
        lines: [
          { text: 'M21 0071', frame: { left: 2500, top: 650, width: 500, height: 65 } },
          { text: 'LNE 34003', frame: { left: 2600, top: 900, width: 600, height: 70 } },
          { text: '00395', frame: { left: 900, top: 1150, width: 1050, height: 220 } },
          { text: '121LA164004', frame: { left: 1100, top: 2450, width: 1300, height: 110 } },
        ],
      }],
    };

    expect(readingCandidates(result, 'water', undefined, { width: 4032, height: 3024 })[0]).toBe(39.5);
  });

  it('ignores a trailing red decimal wheel when OCR joins it to the black register', () => {
    const result = {
      text: '003953',
      blocks: [{ lines: [{ text: '003953', frame: { left: 900, top: 1150, width: 1150, height: 220 } }] }],
    };
    expect(readingCandidates(result, 'water', undefined, { width: 4032, height: 3024 })[0]).toBe(39.5);
  });

  it('normalizes letters commonly confused with digits on a numeric display', () => {
    const result = {
      text: 'OO395',
      blocks: [{ lines: [{ text: 'OO395', frame: { left: 100, top: 100, width: 500, height: 100 } }] }],
    };
    expect(readingCandidates(result, 'water')[0]).toBe(39.5);
  });

  it('does not apply mechanical decimal inference to electricity meters', () => {
    expect(readingCandidates('001234', 'electricity')[0]).toBe(1234);
  });

  it('recognizes water meter labels from the supplied photo style', () => {
    expect(detectMeterType('Aquadis+ Q3=2.5 m³/h')).toBe('water');
  });

  it('recognizes a BK-G4 meter as gas even though its specifications include m³/h', () => {
    expect(detectMeterType('BK-G4 Qmax 6 m³/h Qmin 0,04 m³/h pmax 0,5 bar EN 1359')).toBe('gas');
    expect(detectMeterType('6 m³/h')).toBeUndefined();
  });

  it('keeps the five black gas wheels and ignores the red decimal wheels', () => {
    const result = {
      text: 'BK-G4\n6683829\n10863,470 m³\n002606683829',
      blocks: [{
        lines: [
          { text: 'BK-G4', frame: { left: 200, top: 160, width: 300, height: 55 } },
          { text: '6683829', frame: { left: 520, top: 210, width: 430, height: 90 } },
          { text: '10863,470 m³', frame: { left: 180, top: 520, width: 760, height: 180 } },
          { text: '002606683829', frame: { left: 190, top: 720, width: 520, height: 45 } },
        ],
      }],
    };

    expect(readingCandidates(result, 'gas', undefined, { width: 1080, height: 1280 })[0]).toBe(10863);
  });

  it('splits a joined gas register when it is paired with the reading unit', () => {
    expect(readingCandidates('10863470 m³', 'gas')[0]).toBe(10863);
  });

  it('uses the standalone kWh LCD value instead of the barcode and calibration data', () => {
    const result = {
      text: '020146304282000002200725015\n00000955 kWh\n2000 imp/kWh\nSN:2200725015',
      blocks: [{
        lines: [
          { text: '020146304282000002200725015', frame: { left: 90, top: 120, width: 820, height: 55 } },
          { text: '00000955 kWh', frame: { left: 130, top: 360, width: 690, height: 170 } },
          { text: '2000 imp/kWh', frame: { left: 100, top: 710, width: 300, height: 40 } },
          { text: 'SN:2200725015', frame: { left: 300, top: 900, width: 450, height: 45 } },
        ],
      }],
    };

    expect(detectMeterType(result.text)).toBe('electricity');
    expect(readingCandidates(result, 'electricity', undefined, { width: 1080, height: 1280 })[0]).toBe(955);
  });

  it('normalizes OCR lookalikes when the electricity unit shares the display line', () => {
    expect(readingCandidates('OOO009SS kWh', 'electricity')[0]).toBe(955);
  });

  it('preserves a genuine decimal on an electricity display', () => {
    expect(readingCandidates('00123.4 kWh', 'electricity')[0]).toBe(123.4);
  });
});
