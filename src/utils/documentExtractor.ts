import { APP_CONFIG } from '../config';
import type { ExtractionProgress, ExtractionResult } from '../types/syllabus';
import { extractImageDocument } from './imageOcrExtractor';
import { extractPdfDocument } from './pdfExtractor';

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function validateSyllabusFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const acceptedExts = APP_CONFIG.ACCEPTED_FILE_EXTENSIONS as readonly string[];

  if (!acceptedExts.includes(ext)) {
    return `Unsupported file format (.${ext || 'unknown'}). Please upload a PDF, JPG, JPEG, or PNG syllabus file.`;
  }

  if (file.size === 0) {
    return `The file "${file.name}" appears to be empty (0 bytes). Please upload a valid syllabus document.`;
  }

  if (file.size > APP_CONFIG.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `File size (${sizeMb} MB) exceeds the ${APP_CONFIG.MAX_FILE_SIZE_MB} MB limit. Please compress the file or upload a smaller portion.`;
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
