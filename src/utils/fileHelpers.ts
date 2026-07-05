export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Recipes are persisted as a single JSON blob (one D1 row, capped at 2 MB, or
// the whole library in guest localStorage), so an embedded camera photo must
// stay far below that or every save of the recipe fails.
const EMBED_TARGET_CHARS = 600_000;

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = dataUrl;
  });
}

function encodeJpeg(img: HTMLImageElement, maxDim: number, quality: number): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  // JPEG has no alpha channel; flatten transparency onto white.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Downscale and re-encode an image data URL until it is small enough to embed
 * in a saved recipe. Already-small images and undecodable formats pass through
 * unchanged.
 */
export async function shrinkImageDataUrl(dataUrl: string, maxDim = 1600, quality = 0.8): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  if (dataUrl.length <= EMBED_TARGET_CHARS) return dataUrl;
  try {
    const img = await loadImageFromDataUrl(dataUrl);
    let best = dataUrl;
    const attempts: [number, number][] = [
      [maxDim, quality],
      [Math.round(maxDim * 0.7), 0.72],
      [Math.round(maxDim * 0.5), 0.65],
    ];
    for (const [dim, q] of attempts) {
      const out = encodeJpeg(img, dim, q);
      if (out.length < best.length) best = out;
      if (best.length <= EMBED_TARGET_CHARS) break;
    }
    return best;
  } catch {
    return dataUrl;
  }
}

/** Read a picked image file as a data URL sized for embedding in a recipe. */
export async function fileToCompressedDataUrl(file: File, maxDim = 1600): Promise<string> {
  return shrinkImageDataUrl(await fileToDataUrl(file), maxDim);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
