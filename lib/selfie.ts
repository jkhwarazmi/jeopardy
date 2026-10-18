// Turns a photo into a small square JPEG data URL (max 256px, ~40KB).

export const SELFIE_MAX_DIM = 256;
export const SELFIE_MAX_BYTES = 40_000;

// ~40KB once base64 encoded
const MAX_DATA_URL_LENGTH = 53_000;

// createImageBitmap handles EXIF rotation so use it when we can
export async function blobToSelfieDataUrl(source: Blob): Promise<string> {
  if (typeof createImageBitmap !== "undefined") {
    const bitmap = await createImageBitmap(source, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);
    try {
      return processToCroppedJpeg(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }

  const objectUrl = URL.createObjectURL(source);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });
    return processToCroppedJpeg(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function canvasToSelfieDataUrl(canvas: HTMLCanvasElement): string {
  return processToCroppedJpeg(canvas, canvas.width, canvas.height);
}

// Centre crop to a square, scale down, then drop the quality until it fits
function processToCroppedJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  const cropSize = Math.min(srcWidth, srcHeight);
  const finalSize = Math.min(SELFIE_MAX_DIM, cropSize);

  canvas.width = finalSize;
  canvas.height = finalSize;

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    (srcWidth - cropSize) / 2,
    (srcHeight - cropSize) / 2,
    cropSize,
    cropSize,
    0,
    0,
    finalSize,
    finalSize
  );

  const qualities = [0.8, 0.7, 0.6, 0.5, 0.35];
  let bestResult = "";

  for (const quality of qualities) {
    const result = canvas.toDataURL("image/jpeg", quality);
    bestResult = result;

    if (result.length <= MAX_DATA_URL_LENGTH) {
      break;
    }
  }

  return bestResult;
}
