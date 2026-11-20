import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, OEM, type Worker as TesseractWorker } from 'tesseract.js';
import { APP_CONFIG } from '../config';
import type { ExtractionProgress, ExtractionResult } from '../types/syllabus';
import {
  countMeaningfulChars,
  normalizeSyllabusText,
  reconstructPdfPageText,
} from './textStructure';

GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const MIN_MEANINGFUL_CHARS_PER_PAGE = 40;

export interface ExtractOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ExtractionProgress) => void;
  onRegisterCancelCleanup?: (cleanup: () => void) => void;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Document extraction was cancelled.', 'AbortError');
  }
}

async function yieldToMainThread(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function hasPdfMagicHeader(file: File): Promise<boolean> {
  const headBuffer = await file.slice(0, 1024).arrayBuffer();
  const bytes = new Uint8Array(headBuffer);
  const text = new TextDecoder('ascii').decode(bytes);
  return text.includes('%PDF-');
}

export async function extractPdfDocument(
  file: File,
  options: ExtractOptions = {}
): Promise<ExtractionResult> {
  const { signal, onProgress, onRegisterCancelCleanup } = options;

  throwIfAborted(signal);
  onProgress?.({ percent: 5, stage: 'Reading file...' });

  const isPdfHeaderValid = await hasPdfMagicHeader(file);
  if (!isPdfHeaderValid) {
    throw new Error(
      'This file does not appear to be a valid PDF document. Please upload a valid PDF, JPG, or PNG file.'
    );
  }

  throwIfAborted(signal);
  onProgress?.({ percent: 10, stage: 'Opening PDF document...' });

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  let activeTesseractWorker: TesseractWorker | null = null;
  let pdfDoc: Awaited<typeof loadingTask.promise> | null = null;
  let isCleanedUp = false;

  const safeTerminateWorker = async () => {
    const workerToClose = activeTesseractWorker;
    activeTesseractWorker = null;
    if (workerToClose) {
      try {
        await workerToClose.terminate();
      } catch {
        // Ignore cleanup errors
      }
    }
  };

  const safeDestroyPdfResources = async () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    await safeTerminateWorker();

    if (pdfDoc) {
      try {
        await pdfDoc.cleanup();
      } catch {
        // Ignore
      }
    }

    try {
      await loadingTask.destroy();
    } catch {
      // Ignore
    }
  };

  onRegisterCancelCleanup?.(() => {
    void safeDestroyPdfResources();
  });

  try {
    try {
      pdfDoc = await loadingTask.promise;
    } catch (err) {
      if (signal?.aborted) {
        throw new DOMException('Document extraction was cancelled.', 'AbortError');
      }
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('password')) {
        throw new Error(
          'This PDF is password-protected. Please unlock it before uploading.'
        );
      }
      throw new Error(
        'Unable to read this PDF file. It may be corrupted or use an unsupported structure.'
      );
    }

    const totalPages = pdfDoc.numPages;
    if (totalPages === 0) {
      throw new Error('This PDF contains zero pages.');
    }

    // Check maximum page limit
    if (totalPages > APP_CONFIG.MAX_PDF_PAGES) {
      throw new Error(
        `This PDF contains ${totalPages} pages, which exceeds the ${APP_CONFIG.MAX_PDF_PAGES} page limit. Please extract and upload only the relevant syllabus pages (usually 2-10 pages).`
      );
    }

    const pageEntries: Array<{
      pageNum: number;
      text: string;
      needsOcr: boolean;
    }> = [];

    // Pass 1: Extract embedded text per page in exact page order
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      throwIfAborted(signal);

      const percent = Math.round(10 + (pageNum / totalPages) * 35);
      onProgress?.({
        percent,
        stage: `Extracting text (page ${pageNum} of ${totalPages})`,
        currentPage: pageNum,
        totalPages,
      });

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = reconstructPdfPageText(textContent.items);
      const meaningfulCount = countMeaningfulChars(pageText);

      pageEntries.push({
        pageNum,
        text: pageText,
        needsOcr: meaningfulCount < MIN_MEANINGFUL_CHARS_PER_PAGE,
      });

      page.cleanup();
      await yieldToMainThread();
    }

    const ocrQueue = pageEntries.filter((p) => p.needsOcr);
    const textPagesCount = pageEntries.length - ocrQueue.length;

    // Pass 2: Run local Tesseract OCR on scanned pages in a Web Worker
    if (ocrQueue.length > 0) {
      throwIfAborted(signal);

      onProgress?.({
        percent: 45,
        stage: `Starting OCR engine for ${ocrQueue.length} scanned page(s)...`,
        currentPage: 1,
        totalPages: ocrQueue.length,
      });

      let currentOcrIndex = 0;

      activeTesseractWorker = await createWorker('eng', OEM.LSTM_ONLY, {
        logger: (msg) => {
          if (signal?.aborted) return;
          if (msg.status === 'recognizing text') {
            const perPageProgress = (currentOcrIndex + msg.progress) / ocrQueue.length;
            const percent = Math.min(97, Math.round(45 + perPageProgress * 50));
            const currentPage = ocrQueue[currentOcrIndex]?.pageNum ?? 1;
            onProgress?.({
              percent,
              stage: `Extracting text (page ${currentPage} of ${totalPages} - OCR)`,
              currentPage,
              totalPages,
            });
          }
        },
      });

      for (let i = 0; i < ocrQueue.length; i++) {
        throwIfAborted(signal);
        currentOcrIndex = i;
        const entry = ocrQueue[i];

        onProgress?.({
          percent: Math.round(45 + (i / ocrQueue.length) * 50),
          stage: `Extracting text (page ${entry.pageNum} of ${totalPages} - OCR)`,
          currentPage: entry.pageNum,
          totalPages,
        });

        const page = await pdfDoc.getPage(entry.pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetScale = Math.min(2.0, Math.max(1.4, 1500 / Math.max(baseViewport.width, 1)));
        const viewport = page.getViewport({ scale: targetScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Browser canvas rendering context is unavailable for PDF OCR.');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;

        throwIfAborted(signal);

        const ocrResult = await activeTesseractWorker.recognize(canvas);
        const ocrText = ocrResult.data?.text ?? '';

        if (countMeaningfulChars(ocrText) >= countMeaningfulChars(entry.text)) {
          entry.text = ocrText;
        }

        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        await yieldToMainThread();
      }
    }

    throwIfAborted(signal);

    onProgress?.({
      percent: 98,
      stage: 'Cleaning and organizing extracted text...',
      totalPages,
    });

    // Combine pages strictly in original order (1..numPages)
    const combinedRaw = pageEntries
      .sort((a, b) => a.pageNum - b.pageNum)
      .map((entry) => entry.text.trim())
      .filter(Boolean)
      .join('\n\n');

    const normalized = normalizeSyllabusText(combinedRaw);

    const method =
      ocrQueue.length === 0
        ? 'pdf-text'
        : textPagesCount === 0
          ? 'pdf-ocr'
          : 'pdf-hybrid';

    onProgress?.({ percent: 100, stage: 'Text extraction complete', totalPages });

    return {
      text: normalized,
      pageCount: totalPages,
      method,
      textPages: textPagesCount,
      ocrPages: ocrQueue.length,
    };
  } finally {
    await safeDestroyPdfResources();
  }
}
