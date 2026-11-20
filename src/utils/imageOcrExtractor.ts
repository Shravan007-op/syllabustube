import { createWorker, OEM, type Worker as TesseractWorker } from 'tesseract.js';
import type { ExtractionProgress, ExtractionResult } from '../types/syllabus';
import { normalizeSyllabusText } from './textStructure';

export interface ImageExtractOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ExtractionProgress) => void;
  onRegisterCancelCleanup?: (cleanup: () => void) => void;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Image OCR extraction was cancelled.', 'AbortError');
  }
}

async function decodeImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () =>
        reject(
          new Error(
            'Unable to decode this image file. It may be corrupted or not a valid JPG/PNG image.'
          )
        );
      imageEl.src = objectUrl;
    });

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (naturalW <= 0 || naturalH <= 0) {
      throw new Error('The uploaded image has invalid dimensions.');
    }

    // Upscale low-resolution screenshots gently and cap huge photos for fast local OCR
    let scale = 1;
    if (naturalW < 1000) {
      scale = Math.min(2, 1400 / naturalW);
    } else if (Math.max(naturalW, naturalH) > 2600) {
      scale = 2600 / Math.max(naturalW, naturalH);
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(naturalW * scale));
    canvas.height = Math.max(1, Math.round(naturalH * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas context is unavailable for image OCR.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function extractImageDocument(
  file: File,
  options: ImageExtractOptions = {}
): Promise<ExtractionResult> {
  const { signal, onProgress, onRegisterCancelCleanup } = options;

  throwIfAborted(signal);
  onProgress?.({ percent: 8, stage: 'Loading image for local OCR...' });

  const canvas = await decodeImageToCanvas(file);
  throwIfAborted(signal);

  let worker: TesseractWorker | null = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    canvas.width = 0;
    canvas.height = 0;
    if (worker) {
      void worker.terminate();
      worker = null;
    }
  };

  onRegisterCancelCleanup?.(cleanup);

  try {
    onProgress?.({ percent: 18, stage: 'Initialising local OCR engine...' });

    worker = await createWorker('eng', OEM.LSTM_ONLY, {
      logger: (msg) => {
        if (signal?.aborted) return;
        if (msg.status === 'loading language traineddata') {
          onProgress?.({
            percent: Math.round(18 + msg.progress * 20),
            stage: 'Loading OCR language model...',
          });
        } else if (msg.status === 'recognizing text') {
          onProgress?.({
            percent: Math.min(96, Math.round(40 + msg.progress * 56)),
            stage: 'Recognising syllabus text from image...',
          });
        }
      },
    });

    throwIfAborted(signal);

    const result = await worker.recognize(canvas);
    throwIfAborted(signal);

    onProgress?.({ percent: 98, stage: 'Formatting extracted text...' });
    const normalized = normalizeSyllabusText(result.data?.text ?? '');

    onProgress?.({ percent: 100, stage: 'OCR extraction complete' });

    return {
      text: normalized,
      pageCount: 1,
      method: 'image-ocr',
      textPages: 0,
      ocrPages: 1,
    };
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new DOMException('Image OCR extraction was cancelled.', 'AbortError');
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to recognise text from the uploaded image.');
  } finally {
    cleanup();
  }
}
