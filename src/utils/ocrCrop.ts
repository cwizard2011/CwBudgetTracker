import type { Frame, TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

/** A rectangle expressed as fractions of the source image (0...1). */
export interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelDimensions {
  width: number;
  height: number;
}

const FULL_IMAGE: NormalizedCropRect = { x: 0, y: 0, width: 1, height: 1 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeCropRect(rect: NormalizedCropRect): NormalizedCropRect {
  const x = clamp(Number.isFinite(rect.x) ? rect.x : 0, 0, 1);
  const y = clamp(Number.isFinite(rect.y) ? rect.y : 0, 0, 1);
  return {
    x,
    y,
    width: clamp(Number.isFinite(rect.width) ? rect.width : 1, 0, 1 - x),
    height: clamp(Number.isFinite(rect.height) ? rect.height : 1, 0, 1 - y),
  };
}

function cropToPixels(rect: NormalizedCropRect, dimensions: PixelDimensions): Frame {
  const normalized = normalizeCropRect(rect);
  return {
    left: normalized.x * dimensions.width,
    top: normalized.y * dimensions.height,
    width: normalized.width * dimensions.width,
    height: normalized.height * dimensions.height,
  };
}

function isFrameSelected(frame: Frame | undefined, crop: Frame) {
  if (!frame) return false;

  const frameRight = frame.left + frame.width;
  const frameBottom = frame.top + frame.height;
  const cropRight = crop.left + crop.width;
  const cropBottom = crop.top + crop.height;
  const intersectionWidth = Math.max(0, Math.min(frameRight, cropRight) - Math.max(frame.left, crop.left));
  const intersectionHeight = Math.max(0, Math.min(frameBottom, cropBottom) - Math.max(frame.top, crop.top));
  const intersectionArea = intersectionWidth * intersectionHeight;
  const frameArea = Math.max(1, frame.width * frame.height);
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;
  const centerInside = centerX >= crop.left && centerX <= cropRight && centerY >= crop.top && centerY <= cropBottom;

  // A line is kept when its centre is selected, or when the crop contains a
  // meaningful part of it. This is forgiving when the box clips the unit text.
  return centerInside || intersectionArea / frameArea >= 0.3;
}

/**
 * Restrict an ML Kit result to text inside a user-selected image region.
 *
 * OCR still runs on the source image, but serial numbers, barcodes and labels
 * outside the crop are removed before meter-reading candidate selection. This
 * avoids adding a native bitmap-cropping dependency while providing the same
 * disambiguation benefit on Android and iOS.
 */
export function restrictOcrResultToCrop(
  result: TextRecognitionResult,
  rect: NormalizedCropRect = FULL_IMAGE,
  dimensions: PixelDimensions,
): TextRecognitionResult {
  if (!Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    return result;
  }

  const crop = cropToPixels(rect, dimensions);
  const hasPositionedText = result.blocks.some(block => block.frame || block.lines.some(line => line.frame));
  if (!hasPositionedText) return result;

  const blocks = result.blocks.flatMap(block => {
    const lines = block.lines.filter(line => isFrameSelected(line.frame || block.frame, crop));
    if (!lines.length) return [];
    return [{ ...block, text: lines.map(line => line.text).join('\n'), lines }];
  });

  return {
    ...result,
    blocks,
    text: blocks.map(block => block.text).join('\n'),
  };
}

