import type { ExtractionProgress, ExtractionResult } from '../types/syllabus';
import { extractImageDocument } from './imageOcrExtractor';
import { extractPdfDocument } from './pdfExtractor';

export const ACCEPTED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const MAX_SYLLABUS_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function validateSyllabusFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPTED_FILE_EXTENSIONS.includes(ext as (typeof ACCEPTED_FILE_EXTENSIONS)[number])) {
    return `Unsupported file format (.${ext || 'unknown'}). Please upload a PDF, JPG, JPEG, or PNG syllabus file.`;
  }

  if (file.size === 0) {
    return `The file "${file.name}" appears to be empty (0 bytes). Please upload a valid syllabus document.`;
  }

  if (file.size > MAX_SYLLABUS_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return `File size (${sizeMb} MB) exceeds the 20 MB limit. Please compress the file or upload a smaller scan.`;
  }

  return null;
}

export async function extractSyllabusFromFile(
  file: File,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: ExtractionProgress) => void;
    onRegisterCancelCleanup?: (cleanup: () => void) => void;
  } = {}
): Promise<ExtractionResult> {
  const validationError = validateSyllabusFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') {
    return extractPdfDocument(file, options);
  }

  return extractImageDocument(file, options);
}
