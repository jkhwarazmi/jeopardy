/**
 * Client-only image pipeline for player selfies.
 * Converts source images to square, center-cropped JPEG data URLs.
 * Max dimension: 256×256, target payload: ≤40KB binary (≈53KB base64).
 */

export const SELFIE_MAX_DIM = 256;
export const SELFIE_MAX_BYTES = 40_000;

// Base64 overhead: 4/3 ratio, plus data URL prefix
const MAX_DATA_URL_LENGTH = 53_000;

/**
 * Converts a Blob (e.g., from file input or camera) to a selfie data URL.
 * Handles EXIF rotation via createImageBitmap when available.
 */
export async function blobToSelfieDataUrl(source: Blob): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  let imgElement: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    // Prefer createImageBitmap for EXIF handling
    if (typeof createImageBitmap !== "undefined") {
      bitmap = await createImageBitmap(source, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return processToCroppedJpeg(bitmap.width, bitmap.height, (ctx, size) => {
        ctx.drawImage(bitmap!, 0, 0, size, size);
      });
    } else {
      // Fallback: HTMLImageElement
      objectUrl = URL.createObjectURL(source);
      imgElement = new Image();

      await new Promise<void>((resolve, reject) => {
        imgElement!.onload = () => resolve();
        imgElement!.onerror = () => reject(new Error("Failed to load image"));
        imgElement!.src = objectUrl!;
      });

      return processToCroppedJpeg(
        imgElement.width,
        imgElement.height,
        (ctx, size) => {
          ctx.drawImage(imgElement!, 0, 0, size, size);
        }
      );
    }
  } finally {
    if (bitmap) {
      bitmap.close();
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Converts a canvas to a selfie data URL.
 * Use this when you already have a canvas (e.g., from a webcam stream).
 */
export function canvasToSelfieDataUrl(canvas: HTMLCanvasElement): string {
  return processToCroppedJpeg(canvas.width, canvas.height, (ctx, size) => {
    ctx.drawImage(canvas, 0, 0, size, size);
  });
}

/**
 * Core processing: center-crop to square, scale down, compress.
 */
function processToCroppedJpeg(
  srcWidth: number,
  srcHeight: number,
  drawSource: (ctx: CanvasRenderingContext2D, size: number) => void
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Determine square crop size (use smaller dimension)
  const cropSize = Math.min(srcWidth, srcHeight);
  const scale = Math.min(1, SELFIE_MAX_DIM / cropSize);
  const finalSize = Math.round(cropSize * scale);

  canvas.width = finalSize;
  canvas.height = finalSize;

  // Center crop: translate to center of source
  const offsetX = (srcWidth - cropSize) / 2;
  const offsetY = (srcHeight - cropSize) / 2;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-offsetX, -offsetY);
  drawSource(ctx, cropSize);
  ctx.restore();

  // Compress with quality stepping
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
