import { BillType } from '../models/BillReading';

interface OcrFrame {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface OcrLine {
  text: string;
  frame?: OcrFrame;
}

interface OcrResult {
  text: string;
  blocks?: Array<{ lines?: OcrLine[] }>;
}

interface ImageDimensions {
  width?: number;
  height?: number;
}

interface TextRegion {
  text: string;
  score: number;
  numericDisplay: boolean;
  readingUnit: boolean;
}

interface ScoredCandidate {
  value: number;
  score: number;
}

export function detectMeterType(text: string): BillType | undefined {
  const normalized = text.toLowerCase().replace(/³/g, '3');
  const scores: Record<BillType, number> = { electricity: 0, gas: 0, water: 0 };

  if (/\bk\s*w\s*h\b/.test(normalized)) scores.electricity += 10;
  if (/kilowatt|electric(?:ity)?/.test(normalized)) scores.electricity += 8;
  if (/\bvolts?\b/.test(normalized)) scores.electricity += 5;

  if (/\bgas\b|gas\s+meter/.test(normalized)) scores.gas += 10;
  if (/\bbk\s*[-–]?\s*g\s*4\b|\bg\s*(?:4|6|10|16)\b/.test(normalized)) scores.gas += 9;
  if (/\ben\s*1359\b/.test(normalized)) scores.gas += 8;
  if (/\bm?bar\b|\bq\s*(?:max|min)\b|\bp\s*max\b/.test(normalized)) scores.gas += 7;

  if (/aquadis|\bwater\b|\b[aá]gua\b/.test(normalized)) scores.water += 10;
  if (/\bq\s*3\b/.test(normalized)) scores.water += 7;
  if (/litres?|liters?/.test(normalized)) scores.water += 5;

  // m³ and m³/h occur on both water and gas meters, so they are deliberately
  // not used to decide the meter type.
  const ranked = (Object.entries(scores) as Array<[BillType, number]>).sort((a, b) => b[1] - a[1]);
  const [winner, runnerUp] = ranked;
  return winner[1] >= 6 && winner[1] - runnerUp[1] >= 3 ? winner[0] : undefined;
}

function normalizeDisplayText(text: string) {
  const withoutReadingUnit = text
    .replace(/\bk\s*w\s*h\b/gi, '')
    .replace(/m\s*[³3](?!\s*\/\s*h)/gi, '')
    .trim();
  const numericDisplay = Boolean(withoutReadingUnit) && /^[\s\d.,|OoQqDdIiLlZzSsBbGg]+$/.test(withoutReadingUnit);
  if (!numericDisplay) return { text, numericDisplay };
  return {
    numericDisplay,
    text: text
      .replace(/[OoQqDd]/g, '0')
      .replace(/[IiLl|]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Gg]/g, '6')
      .replace(/[Bb]/g, '8'),
  };
}

function isDirectReadingUnit(text: string, billType: BillType) {
  if (billType === 'electricity') {
    return /(?:^|[^/A-Za-z])k\s*w\s*h\b/i.test(text) && !/imp\s*\/\s*k\s*w\s*h|imp\s*\/\s*kvarh/i.test(text);
  }
  return /m\s*[³3](?!\s*\/\s*h)/i.test(text);
}

function framesShareRow(a?: OcrFrame, b?: OcrFrame) {
  if (!a || !b) return false;
  const aCenter = a.top + a.height / 2;
  const bCenter = b.top + b.height / 2;
  return Math.abs(aCenter - bCenter) <= Math.max(a.height, b.height) * 1.25;
}

function textRegions(result: OcrResult, billType: BillType, dimensions?: ImageDimensions): TextRegion[] {
  const lines = (result.blocks || []).flatMap(block => block.lines || []).filter(line => line.text.trim());
  if (!lines.length) {
    const normalized = normalizeDisplayText(result.text);
    return [{
      text: normalized.text,
      score: 0,
      numericDisplay: normalized.numericDisplay,
      readingUnit: isDirectReadingUnit(result.text, billType),
    }];
  }

  const maxHeight = Math.max(...lines.map(line => line.frame?.height || 0), 1);
  return lines.map(line => {
    const normalized = normalizeDisplayText(line.text);
    const readingUnit = isDirectReadingUnit(line.text, billType);
    const lettersAndDigits = line.text.match(/[A-Za-z0-9]/g)?.length || 0;
    const digits = line.text.match(/\d/g)?.length || 0;
    let score = normalized.numericDisplay ? 10 : (lettersAndDigits && digits / lettersAndDigits >= 0.75 ? 1 : -5);

    if (readingUnit && digits >= 3) score += 30;
    else if (lines.some(other => other !== line && isDirectReadingUnit(other.text, billType) && framesShareRow(line.frame, other.frame))) score += 18;

    // Common calibration, model, certification and identity labels near a meter display.
    if (/\b(?:barcode|serial|s\s*\/?\s*n|meter\s*(?:no|number)|q\s*(?:max|min)|p\s*max|class|model|lne|m21|ce|r315|p1hr|t50|hz)\b|imp\s*\//i.test(line.text)) score -= 30;
    if (/\d{9,}/.test(line.text) && !readingUnit) score -= 30;

    if (line.frame) {
      score += (line.frame.height / maxHeight) * 9;
      if (dimensions?.width && line.frame.width / dimensions.width >= 0.12) score += 2;
      if (dimensions?.height) {
        const centerY = (line.frame.top + line.frame.height / 2) / dimensions.height;
        if (centerY >= 0.18 && centerY <= 0.78) score += 2;
        else score -= 2;
      }
    }

    return { text: normalized.text, score, numericDisplay: normalized.numericDisplay, readingUnit };
  });
}

function addCandidate(candidates: ScoredCandidate[], value: number, score: number) {
  if (Number.isFinite(value) && value >= 0) candidates.push({ value, score });
}

export function readingCandidates(
  result: OcrResult | string,
  billType: BillType,
  previousValue?: number,
  dimensions?: ImageDimensions,
): number[] {
  const normalizedResult: OcrResult = typeof result === 'string' ? { text: result } : result;
  const scored: ScoredCandidate[] = [];

  textRegions(normalizedResult, billType, dimensions).forEach(region => {
    // Numeric display lines may contain spaces between mechanical wheels. For
    // surrounding labels, keep number groups separate so a model number is not
    // accidentally joined to a nearby serial number.
    const pattern = region.numericDisplay ? /\d[\d\s.,]*\d|\d{3,}/g : /\d[\d.,]*\d|\d{3,}/g;
    const matches = region.text.match(pattern) || [];

    matches.forEach(raw => {
      let cleaned = raw.replace(/\s/g, '');
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      else cleaned = cleaned.replace(/,/g, '');

      const value = Number(cleaned);
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length < 3) return;

      const hasExplicitDecimal = /[.,]/.test(raw);
      let score = region.score;
      if (/^0\d{3,}/.test(digits)) score += 10;
      if (hasExplicitDecimal) score += 3;
      if (digits.length >= 4 && digits.length <= 8) score += 4;
      if (value >= 1) score += 2;
      if (value > 99999999 || value < 0.01) score -= 6;
      if (digits.length >= 9 && !region.readingUnit) score -= 24;
      addCandidate(scored, value, score);

      if (billType === 'gas') {
        const groups = raw.trim().split(/[.,\s]+/).filter(Boolean);
        const groupedRegister = groups.length >= 2
          && groups[0].replace(/\D/g, '').length === 5
          && groups.slice(1).join('').replace(/\D/g, '').length >= 1
          && groups.slice(1).join('').replace(/\D/g, '').length <= 3;
        const joinedRegister = !hasExplicitDecimal && region.readingUnit && digits.length >= 6 && digits.length <= 8;
        if (groupedRegister || joinedRegister) {
          // Mechanical gas meters show whole cubic metres on the black wheels;
          // the following red wheels are decimal fractions and are not reported.
          addCandidate(scored, Number(digits.slice(0, 5)), score + 24);
        }
      }

      if (billType === 'water' && !hasExplicitDecimal && /^0\d{4,7}$/.test(digits)) {
        // This common five-wheel water style uses the last black digit as a
        // tenth of a cubic metre. A trailing red wheel is ignored.
        const fiveWheelRegister = Number(digits.slice(0, 5)) / 10;
        addCandidate(scored, fiveWheelRegister, score + (digits.length === 5 ? 11 : 13));

        const preferredDivisor = digits.length >= 7 ? 1000 : 10;
        addCandidate(scored, value / preferredDivisor, score + 6);
        [10, 100, 1000].filter(divisor => divisor !== preferredDivisor).forEach(divisor => {
          addCandidate(scored, value / divisor, score + 1);
        });
      }
    });
  });

  if (previousValue !== undefined) {
    scored.forEach(item => {
      if (item.value < previousValue) {
        item.score -= 12;
        return;
      }
      const increase = item.value - previousValue;
      item.score += Math.max(0, 10 - Math.log10(increase + 1) * 3);
    });
  }

  const unique = new Map<number, number>();
  scored.forEach(item => unique.set(item.value, Math.max(item.score, unique.get(item.value) ?? -Infinity)));
  return Array.from(unique.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([number]) => number);
}
