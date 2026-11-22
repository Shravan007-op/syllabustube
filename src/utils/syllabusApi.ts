import type {
  StructuredSyllabus,
  StructuredTopic,
  StructuredUnit,
  VerificationFlag,
} from '../types/syllabus';
import { processChunksProgressively, splitTextIntoChunks } from './chunking';

let idCounter = 0;

export function createClientId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Validates raw JSON returned by the syllabus analysis backend before displaying it in the UI.
 */
export function validateAndHydrateStructuredSyllabus(
  raw: unknown,
  sourceLabel: string
): StructuredSyllabus {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid syllabus response format received from server.');
  }

  const data = raw as Record<string, unknown>;

  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const subjectCode = typeof data.subjectCode === 'string' ? data.subjectCode.trim() : '';

  if (!Array.isArray(data.units) || data.units.length === 0) {
    throw new Error('Syllabus JSON does not contain any units or topics.');
  }

  const units: StructuredUnit[] = data.units.map((rawUnit, uIdx) => {
    if (!rawUnit || typeof rawUnit !== 'object' || Array.isArray(rawUnit)) {
      throw new Error(`Invalid unit entry at position ${uIdx + 1}.`);
    }

    const u = rawUnit as Record<string, unknown>;
    const unitNumber =
      typeof u.unitNumber === 'number' && Number.isFinite(u.unitNumber) && u.unitNumber > 0
        ? Math.round(u.unitNumber)
        : uIdx + 1;
    const unitName = typeof u.unitName === 'string' ? u.unitName.trim() : '';

    if (!Array.isArray(u.topics)) {
      throw new Error(`Unit ${unitNumber} is missing a valid topics array.`);
    }

    const topics: StructuredTopic[] = u.topics
      .filter(
        (t): t is Record<string, unknown> =>
          Boolean(t) && typeof t === 'object' && !Array.isArray(t)
      )
      .map((t) => {
        const topicName = typeof t.topicName === 'string' ? t.topicName.trim() : '';
        const subtopics = Array.isArray(t.subtopics)
          ? t.subtopics
              .filter((s): s is string => typeof s === 'string')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        return {
          id: createClientId('topic'),
          topicName,
          subtopics,
          needsVerification: Boolean(t.needsVerification),
        };
      })
      .filter((t) => t.topicName.length > 0);

    return {
      id: createClientId('unit'),
      unitNumber,
      unitName,
      topics,
    };
  });

  const totalTopics = units.reduce((sum, u) => sum + u.topics.length, 0);
  if (totalTopics === 0) {
    throw new Error('No topics were detected in the syllabus response.');
  }

  const verificationFlags: VerificationFlag[] = Array.isArray(data.verificationFlags)
    ? data.verificationFlags
        .filter(
          (f): f is Record<string, unknown> =>
            Boolean(f) && typeof f === 'object' && !Array.isArray(f)
        )
        .map((f) => ({
          location:
            typeof f.location === 'string' && f.location.trim()
              ? f.location.trim()
              : 'Syllabus',
          message: typeof f.message === 'string' ? f.message.trim() : '',
        }))
        .filter((f) => f.message.length > 0)
    : [];

  return {
    subject,
    subjectCode,
    units,
    verificationFlags,
    isIncomplete: Boolean(data.isIncomplete),
    sourceLabel,
  };
}

export async function analyzeSyllabusViaApi(
  text: string,
  options: {
    sourceFileName?: string;
    sourceLabel: string;
    signal?: AbortSignal;
    onProgress?: (info: { chunkIndex: number; totalChunks: number; stage: string }) => void;
    onProgressiveUpdate?: (mergedSyllabus: StructuredSyllabus) => void;
  }
): Promise<StructuredSyllabus> {
  const chunks = splitTextIntoChunks(text);

  return processChunksProgressively({
    chunks,
    sourceFileName: options.sourceFileName,
    sourceLabel: options.sourceLabel,
    signal: options.signal,
    onProgress: options.onProgress,
    onProgressiveUpdate: options.onProgressiveUpdate,
  });
}
