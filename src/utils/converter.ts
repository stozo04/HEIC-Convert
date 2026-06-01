import heic2any from 'heic2any';

export async function convertHeicTo(file: File, format: string): Promise<Blob> {
  const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  
  try {
    const result = await heic2any({
      blob: file,
      toType: mimeType,
      quality: 0.9, // Adjust quality if needed
    });

    if (Array.isArray(result)) {
      return result[0];
    }
    return result;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw error;
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
