import heic2any from 'heic2any';

// JPEG/WebP encode quality for browser-native (canvas) conversions.
// 0.95 keeps quality very high with sensible file sizes; 1.0 balloons size for no visible gain.
const CANVAS_QUALITY = 0.95;
// HEIC path quality (unchanged from original behavior).
const HEIC_QUALITY = 0.9;

const MIME_BY_FORMAT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// HEIC/HEIF must go through heic2any (browsers can't decode them natively).
export const HEIC_INPUT_EXTENSIONS = ['heic', 'heif'];
// Formats the browser can decode natively via <canvas>/createImageBitmap.
export const CANVAS_INPUT_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'bmp'];
export const SUPPORTED_INPUT_EXTENSIONS = [...HEIC_INPUT_EXTENSIONS, ...CANVAS_INPUT_EXTENSIONS];

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

export function isSupportedInput(name: string): boolean {
  return SUPPORTED_INPUT_EXTENSIONS.includes(getExtension(name));
}

/** Swap a file's extension for the target output format, e.g. "photo.webp" -> "photo.jpg". */
export function getOutputFileName(originalName: string, format: string): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}.${format}`;
}

export async function convertImage(file: File, format: string): Promise<Blob> {
  const ext = getExtension(file.name);
  if (HEIC_INPUT_EXTENSIONS.includes(ext)) {
    return convertHeic(file, format);
  }
  return convertViaCanvas(file, format);
}

async function convertHeic(file: File, format: string): Promise<Blob> {
  const mimeType = MIME_BY_FORMAT[format] ?? 'image/jpeg';
  try {
    const result = await heic2any({
      blob: file,
      toType: mimeType,
      quality: HEIC_QUALITY,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw error;
  }
}

async function convertViaCanvas(file: File, format: string): Promise<Blob> {
  const mimeType = MIME_BY_FORMAT[format] ?? 'image/jpeg';

  // Decode at full native resolution — this step is lossless. The only quality
  // loss happens at re-encode time (for lossy targets like JPEG/WebP).
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    console.error('Image decode failed:', error);
    throw new Error('Could not read this image file.');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas rendering context.');

    // JPEG has no alpha channel — flatten any transparency onto white,
    // otherwise transparent areas render as black.
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, CANVAS_QUALITY)
    );
    if (!blob) throw new Error('Image conversion failed.');
    return blob;
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
