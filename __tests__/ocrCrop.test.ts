import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import { normalizeCropRect, restrictOcrResultToCrop } from '../src/utils/ocrCrop';

function resultWithLines(lines: Array<{ text: string; left: number; top: number; width: number; height: number }>) {
  return {
    text: lines.map(line => line.text).join('\n'),
    blocks: [{
      text: lines.map(line => line.text).join('\n'),
      lines: lines.map(({ text, ...frame }) => ({ text, frame, elements: [], recognizedLanguages: [] })),
      recognizedLanguages: [],
    }],
  } as TextRecognitionResult;
}

describe('meter OCR crop filtering', () => {
  it('keeps the display while excluding a barcode outside the selected area', () => {
    const result = resultWithLines([
      { text: '020146304282000002200725015', left: 200, top: 100, width: 700, height: 80 },
      { text: '00000955 kWh', left: 250, top: 500, width: 550, height: 160 },
      { text: 'SN:2200725015', left: 300, top: 900, width: 450, height: 60 },
    ]);

    const cropped = restrictOcrResultToCrop(result, { x: 0.15, y: 0.38, width: 0.7, height: 0.3 }, { width: 1000, height: 1200 });

    expect(cropped.text).toBe('00000955 kWh');
    expect(cropped.blocks[0].lines).toHaveLength(1);
  });

  it('keeps a line when the selection meaningfully overlaps its frame', () => {
    const result = resultWithLines([
      { text: '10863 470 m³', left: 100, top: 400, width: 800, height: 120 },
    ]);

    const cropped = restrictOcrResultToCrop(result, { x: 0.1, y: 0.4, width: 0.35, height: 0.12 }, { width: 1000, height: 1000 });
    expect(cropped.text).toBe('10863 470 m³');
  });

  it('falls back to the original result when ML Kit provides no frames', () => {
    const result = {
      text: '00395',
      blocks: [{ text: '00395', lines: [{ text: '00395', elements: [], recognizedLanguages: [] }], recognizedLanguages: [] }],
    } as TextRecognitionResult;

    expect(restrictOcrResultToCrop(result, { x: 0, y: 0, width: 0.1, height: 0.1 }, { width: 100, height: 100 })).toBe(result);
  });

  it('clamps crop rectangles to image bounds', () => {
    const crop = normalizeCropRect({ x: -0.2, y: 0.8, width: 1.4, height: 0.5 });
    expect(crop).toMatchObject({ x: 0, y: 0.8, width: 1 });
    expect(crop.height).toBeCloseTo(0.2);
  });
});
