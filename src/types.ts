export type ConversionStatus = 'pending' | 'converting' | 'success' | 'error';

export interface FileTask {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: number;
  targetFormat: string;
  status: ConversionStatus;
  progress: number;
  convertedBlob?: Blob;
  error?: string;
}

export interface HistoryRecord {
  id: string;
  originalName: string;
  originalSize: number;
  targetFormat: string;
  convertedSize: number;
  date: number; // timestamp
  blob: Blob; // The converted blob
}
