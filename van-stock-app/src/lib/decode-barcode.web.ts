import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

function makeReader(tryHarder: boolean) {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  return reader;
}

const quickReader = makeReader(false);
const thoroughReader = makeReader(true);

/** Reads a barcode from greyscale pixels, or returns null. */
function decodeGrey(grey: Uint8ClampedArray, width: number, height: number, thorough: boolean) {
  const reader = thorough ? thoroughReader : quickReader;
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(grey, width, height)));
    const text = reader.decode(bitmap).getText().trim();
    return text || null;
  } catch {
    return null;
  } finally {
    reader.reset();
  }
}

function toGrey(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height);
  const grey = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < grey.length; i += 4, p++) {
    grey[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  return grey;
}

let frameCanvas: HTMLCanvasElement | null = null;

/**
 * Reads a barcode from the middle band of a live video frame (where the on-screen frame is).
 * Quick by default; pass thorough for a slower, more careful pass.
 */
export function decodeVideoFrame(video: HTMLVideoElement, thorough: boolean): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const cropW = vw * 0.9;
  const cropH = Math.min(vh * 0.5, cropW * 0.75);
  const scale = Math.min(1, 900 / cropW);
  const w = Math.round(cropW * scale);
  const h = Math.round(cropH * scale);
  frameCanvas ??= document.createElement('canvas');
  frameCanvas.width = w;
  frameCanvas.height = h;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, w, h);
  return decodeGrey(toGrey(ctx, w, h), w, h, thorough);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be opened.'));
    };
    img.src = url;
  });
}

/** Greyscale pixels of the image scaled so its longest side is `maxSide`, optionally turned 90°. */
function greyscale(img: HTMLImageElement, maxSide: number, rotate: boolean) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = rotate ? h : w;
  canvas.height = rotate ? w : h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('This browser cannot read photos.');
  if (rotate) {
    ctx.translate(h, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return { grey: toGrey(ctx, canvas.width, canvas.height), width: canvas.width, height: canvas.height };
}

/** Reads a barcode from a photo. Resolves the barcode text, or null if none was found. */
export async function decodeBarcodeFromImage(blob: Blob): Promise<string | null> {
  const img = await loadImage(blob);
  // Phone photos are large; try a few sizes, upright and turned, until one reads.
  for (const maxSide of [1200, 1800, 800]) {
    for (const rotate of [false, true]) {
      const { grey, width, height } = greyscale(img, maxSide, rotate);
      const text = decodeGrey(grey, width, height, true);
      if (text) return text;
    }
  }
  return null;
}
