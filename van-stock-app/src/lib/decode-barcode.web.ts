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

function makeReader() {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  return reader;
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
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grey = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < grey.length; i += 4, p++) {
    grey[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  return { grey, width, height };
}

/** Reads a barcode from a photo. Resolves the barcode text, or null if none was found. */
export async function decodeBarcodeFromImage(blob: Blob): Promise<string | null> {
  const img = await loadImage(blob);
  const reader = makeReader();
  // Phone photos are large; try a few sizes, upright and turned, until one reads.
  for (const maxSide of [1200, 1800, 800]) {
    for (const rotate of [false, true]) {
      const { grey, width, height } = greyscale(img, maxSide, rotate);
      try {
        const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(grey, width, height)));
        const result = reader.decode(bitmap);
        const text = result.getText().trim();
        if (text) return text;
      } catch {
        // Not found at this size or angle; try the next.
      } finally {
        reader.reset();
      }
    }
  }
  return null;
}
