import { APP_CONFIG } from '../config';
import { analyseSyllabusWithAppsScript } from '../services/geminiService.js';
import type { StructuredSyllabus, StructuredUnit, VerificationFlag } from '../types/syllabus';
import { createClientId, validateAndHydrateStructuredSyllabus } from './syllabusApi';

/**
 * Splits raw syllabus text into manageable chunks by unit/module boundaries,
 * or by character length if no clear unit boundaries exist.
 */
export function splitTextIntoChunks(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= APP_CONFIG.CHUNK_MAX_CHARS) {
    return [trimmed];
  }

  // Look for unit / module / chapter markers
  const unitRegex = /(?:^|\n)(?=(?:unit|module|chapter|part)\s*(?:\d+|[ivxlcdm]+)\b)/i;
  const sections = trimmed.split(unitRegex).filter((s) => s.trim().length > 0);

  if (sections.length > 1) {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
      if ((currentChunk + '\n\n' + section).length <= APP_CONFIG.CHUNK_MAX_CHARS) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + section : section;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        if (section.length > APP_CONFIG.CHUNK_MAX_CHARS) {
          // If a single unit section is still too large, split by paragraphs
          const paragraphs = section.split(/\n\s*\n/);
          let subChunk = '';
          for (const p of paragraphs) {
            if ((subChunk + '\n\n' + p).length <= APP_CONFIG.CHUNK_MAX_CHARS) {
              subChunk = subChunk ? subChunk + '\n\n' + p : p;
            } else {
              if (subChunk) chunks.push(subChunk.trim());
              subChunk = p;
            }
          }
          if (subChunk) currentChunk = subChunk;
        } else {
          currentChunk = section;
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [trimmed];
  }

  // Fallback: split by paragraph or newline slices
  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length <= APP_CONFIG.CHUNK_MAX_CHARS) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = para;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [trimmed];
}

interface ProcessChunksOptions {
  chunks: string[];
  sourceFileName?: string;
  sourceLabel: string;
  signal?: AbortSignal;
  onProgress?: (info: { chunkIndex: number; totalChunks: number; stage: string }) => void;
  onProgressiveUpdate?: (mergedSyllabus: StructuredSyllabus) => void;
}

async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * Sends chunks sequentially to the backend, retrying failed chunks with exponential backoff,
 * and merging results progressively so units render as they arrive.
 */
export async function processChunksProgressively(
  options: ProcessChunksOptions
): Promise<StructuredSyllabus> {
  const { chunks, sourceFileName, sourceLabel, signal, onProgress, onProgressiveUpdate } = options;

  let mergedSubject = '';
  let mergedSubjectCode = '';
  let mergedUnits: StructuredUnit[] = [];
  let mergedVerificationFlags: VerificationFlag[] = [];
  let mergedIsIncomplete = false;

  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Operation cancelled', 'AbortError');
    }

    const chunkNumber = i + 1;
    const chunkText = chunks[i];

    onProgress?.({
      chunkIndex: chunkNumber,
      totalChunks: chunks.length,
      stage: `Structuring syllabus with AI (chunk ${chunkNumber} of ${chunks.length})`,
    });

    let attempt = 0;
    let success = false;
    let lastError: unknown = null;

    while (attempt <= APP_CONFIG.MAX_CHUNK_RETRIES && !success) {
      if (signal?.aborted) {
        throw new DOMException('Operation cancelled', 'AbortError');
      }

      try {
        const payload = await analyseSyllabusWithAppsScript(chunkText, {
          sourceFileName,
          signal,
        });

        const structured = validateAndHydrateStructuredSyllabus(payload, sourceLabel);

        // Capture subject and subjectCode if found
        if (!mergedSubject && structured.subject) {
          mergedSubject = structured.subject;
        }
        if (!mergedSubjectCode && structured.subjectCode) {
          mergedSubjectCode = structured.subjectCode;
        }

        // Merge units cleanly
        for (const unit of structured.units) {
          const existingIndex = mergedUnits.findIndex(
            (u) =>
              (u.unitNumber === unit.unitNumber && unit.unitNumber > 0) ||
              (u.unitName && unit.unitName && u.unitName.toLowerCase() === unit.unitName.toLowerCase())
          );

          if (existingIndex >= 0) {
            // Merge topics into existing unit
            const existingUnit = mergedUnits[existingIndex];
            const existingTopicNames = new Set(existingUnit.topics.map((t) => t.topicName.toLowerCase()));
            const newTopics = unit.topics.filter(
              (t) => !existingTopicNames.has(t.topicName.toLowerCase())
            );
            mergedUnits[existingIndex] = {
              ...existingUnit,
              topics: [...existingUnit.topics, ...newTopics],
            };
          } else {
            // Re-number sequentially to avoid conflicts across chunks
            const assignedNumber = mergedUnits.length + 1;
            mergedUnits.push({
              ...unit,
              id: createClientId('unit'),
              unitNumber: assignedNumber,
            });
          }
        }

        if (structured.isIncomplete) {
          mergedIsIncomplete = true;
        }

        if (Array.isArray(structured.verificationFlags)) {
          mergedVerificationFlags.push(...structured.verificationFlags);
        }

        success = true;

        const currentMerged: StructuredSyllabus = {
          subject: mergedSubject || 'University Syllabus',
          subjectCode: mergedSubjectCode,
          units: [...mergedUnits],
          verificationFlags: [...mergedVerificationFlags],
          isIncomplete: mergedIsIncomplete,
          sourceLabel,
        };

        // Notify progressive render
        onProgressiveUpdate?.(currentMerged);
      } catch (err) {
        if (signal?.aborted) {
          throw new DOMException('Operation cancelled', 'AbortError');
        }
        lastError = err;
        attempt += 1;
        if (attempt <= APP_CONFIG.MAX_CHUNK_RETRIES) {
          const backoffMs = APP_CONFIG.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
          await delay(backoffMs, signal);
        }
      }
    }

    if (!success) {
      throw lastError || new Error(`Failed to structure chunk ${chunkNumber} after retries.`);
    }
  }

  return {
    subject: mergedSubject || 'University Syllabus',
    subjectCode: mergedSubjectCode,
    units: mergedUnits,
    verificationFlags: mergedVerificationFlags,
    isIncomplete: mergedIsIncomplete,
    sourceLabel,
  };
}
