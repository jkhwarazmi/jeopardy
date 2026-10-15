// Turns a photo into a small square JPEG data URL (max 256px, ~40KB).

export const SELFIE_MAX_DIM = 256;
export const SELFIE_MAX_BYTES = 40_000;

// ~40KB once base64 encoded
const MAX_DATA_URL_LENGTH = 53_000;

// createImageBitmap handles EXIF rotation so use it when we can
export async function blobToSelfieDataUrl(source: Blob): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  let imgElement: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    if (typeof createImageBitmap !== "undefined") {
      bitmap = await createImageBitmap(source, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return processToCroppedJpeg(bitmap.width, bitmap.height, (ctx, size) => {
        ctx.drawImage(bitmap!, 0, 0, size, size);
      });
    } else {
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

export function canvasToSelfieDataUrl(canvas: HTMLCanvasElement): string {
  return processToCroppedJpeg(canvas.width, canvas.height, (ctx, size) => {
    ctx.drawImage(canvas, 0, 0, size, size);
  });
}

// Centre crop to a square, scale down, then drop the quality until it fits
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

  const cropSize = Math.min(srcWidth, srcHeight);
  const scale = Math.min(1, SELFIE_MAX_DIM / cropSize);
  const finalSize = Math.round(cropSize * scale);

  canvas.width = finalSize;
  canvas.height = finalSize;

  const offsetX = (srcWidth - cropSize) / 2;
  const offsetY = (srcHeight - cropSize) / 2;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-offsetX, -offsetY);
  drawSource(ctx, cropSize);
  ctx.restore();

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
