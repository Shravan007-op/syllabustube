import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface GeminiTopicPayload {
  topicName: string;
  subtopics: string[];
  needsVerification?: boolean;
}

export interface GeminiUnitPayload {
  unitNumber: number;
  unitName: string;
  topics: GeminiTopicPayload[];
}

export interface GeminiVerificationFlag {
  location: string;
  message: string;
}

export interface GeminiSyllabusPayload {
  subject: string;
  subjectCode: string;
  units: GeminiUnitPayload[];
  verificationFlags?: GeminiVerificationFlag[];
  isIncomplete?: boolean;
}

const MODEL_NAME = 'gemini-4-hydrogen';

const SYSTEM_INSTRUCTION = `You are an academic syllabus parsing engine for university courses.
Convert raw syllabus text (which may come from PDF extraction, OCR of a scanned page/image, or manual student entry) into clean, accurate structured JSON.

Strict Rules:
1. Subject & Code:
   - Identify the subject name if present. If no subject name is stated, set "subject" to "".
   - Identify the subject code if explicitly present (e.g., "CS301", "AEC", "MA-201"). If not present, set "subjectCode" to "". NEVER invent a subject code or subject name.
2. Units / Chapters / Modules:
   - Identify all units, modules, or chapters in their exact original syllabus order.
   - Preserve unit numbers when present; if units are unnumbered or implicit, assign sequential 1-based integers.
   - If a unit has no explicit heading/title, set "unitName" to "" rather than inventing a name.
   - If the syllabus has no unit divisions at all, group all topics under unitNumber: 1 with unitName: "".
3. Topics & Subtopics:
   - Extract each distinct topic under its unit in the original syllabus order.
   - Extract "subtopics" only when clearly specified as sub-items or comma/parenthetical breakdowns under a topic; otherwise set "subtopics" to [].
   - Correct obvious OCR spelling/spacing errors (e.g., "JFFET" -> "JFET", "BJT Biassing" -> "BJT Biasing", "0p-Amp" -> "Op-Amp") while preserving exact academic terminology.
   - Remove genuine duplicate topic lines.
   - NEVER invent topics, chapters, reference books, or extra syllabus content not supported by the input.
4. Verification Flags & Incomplete Text:
   - If any part of the text has garbled OCR characters, cut-off sentences, or appears incomplete, set "isIncomplete": true (if truncated/incomplete), mark affected topics with "needsVerification": true, and add clear concise notes in "verificationFlags" so the student can verify and correct them.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: {
      type: Type.STRING,
      description: 'Detected subject name, or empty string if not present.',
    },
    subjectCode: {
      type: Type.STRING,
      description: 'Detected subject code if explicitly present, otherwise empty string.',
    },
    isIncomplete: {
      type: Type.BOOLEAN,
      description: 'True if the syllabus text appears truncated, unreadable, or incomplete.',
    },
    verificationFlags: {
      type: Type.ARRAY,
      description: 'Optional warnings flagging uncertain OCR fragments or incomplete syllabus sections.',
      items: {
        type: Type.OBJECT,
        properties: {
          location: {
            type: Type.STRING,
            description: 'Unit or section where the uncertainty occurred.',
          },
          message: {
            type: Type.STRING,
            description: 'Brief explanation of what the user should verify.',
          },
        },
        required: ['location', 'message'],
      },
    },
    units: {
      type: Type.ARRAY,
      description: 'Ordered list of units/chapters in the syllabus.',
      items: {
        type: Type.OBJECT,
        properties: {
          unitNumber: {
            type: Type.INTEGER,
            description: '1-based unit or chapter number in original order.',
          },
          unitName: {
            type: Type.STRING,
            description: 'Unit or chapter heading, or empty string if missing.',
          },
          topics: {
            type: Type.ARRAY,
            description: 'Ordered topics belonging to this unit.',
            items: {
              type: Type.OBJECT,
              properties: {
                topicName: {
                  type: Type.STRING,
                  description: 'Clean topic title with obvious OCR typos corrected.',
                },
                subtopics: {
                  type: Type.ARRAY,
                  description: 'Clearly specified subtopics, or empty array.',
                  items: {
                    type: Type.STRING,
                  },
                },
                needsVerification: {
                  type: Type.BOOLEAN,
                  description: 'True if this topic came from garbled or uncertain OCR text.',
                },
              },
              required: ['topicName', 'subtopics'],
            },
          },
        },
        required: ['unitNumber', 'unitName', 'topics'],
      },
    },
  },
  required: ['subject', 'subjectCode', 'units'],
};

export function validateStructuredSyllabus(raw: unknown): GeminiSyllabusPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Structured syllabus response must be a JSON object.');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.subject !== 'string') {
    throw new Error('Invalid syllabus JSON: "subject" must be a string.');
  }
  if (typeof obj.subjectCode !== 'string') {
    throw new Error('Invalid syllabus JSON: "subjectCode" must be a string.');
  }
  if (!Array.isArray(obj.units)) {
    throw new Error('Invalid syllabus JSON: "units" must be an array.');
  }

  const normalizedUnits: GeminiUnitPayload[] = [];

  for (let i = 0; i < obj.units.length; i++) {
    const rawUnit = obj.units[i];
    if (!rawUnit || typeof rawUnit !== 'object' || Array.isArray(rawUnit)) {
      throw new Error(`Invalid syllabus JSON: unit at index ${i} is not an object.`);
    }

    const u = rawUnit as Record<string, unknown>;
    const unitNumber =
      typeof u.unitNumber === 'number' && Number.isFinite(u.unitNumber) && u.unitNumber > 0
        ? Math.round(u.unitNumber)
        : i + 1;
    const unitName = typeof u.unitName === 'string' ? u.unitName.trim() : '';

    if (!Array.isArray(u.topics)) {
      throw new Error(`Invalid syllabus JSON: unit ${unitNumber} "topics" must be an array.`);
    }

    const seenTopics = new Set<string>();
    const normalizedTopics: GeminiTopicPayload[] = [];

    for (const rawTopic of u.topics) {
      if (!rawTopic || typeof rawTopic !== 'object' || Array.isArray(rawTopic)) {
        continue;
      }
      const t = rawTopic as Record<string, unknown>;
      const topicName = typeof t.topicName === 'string' ? t.topicName.trim() : '';
      if (!topicName) continue;

      const dedupeKey = topicName.toLowerCase();
      if (seenTopics.has(dedupeKey)) continue;
      seenTopics.add(dedupeKey);

      const subtopicsRaw = Array.isArray(t.subtopics) ? t.subtopics : [];
      const seenSubs = new Set<string>();
      const subtopics: string[] = [];

      for (const s of subtopicsRaw) {
        if (typeof s !== 'string') continue;
        const cleanSub = s.trim();
        if (!cleanSub) continue;
        const subKey = cleanSub.toLowerCase();
        if (seenSubs.has(subKey)) continue;
        seenSubs.add(subKey);
        subtopics.push(cleanSub);
      }

      normalizedTopics.push({
        topicName,
        subtopics,
        needsVerification: Boolean(t.needsVerification),
      });
    }

    if (normalizedTopics.length > 0 || unitName) {
      normalizedUnits.push({
        unitNumber,
        unitName,
        topics: normalizedTopics,
      });
    }
  }

  if (normalizedUnits.length === 0) {
    throw new Error(
      'No syllabus units or topics could be extracted from this text. Please check that the text contains valid course topics.'
    );
  }

  const verificationFlags: GeminiVerificationFlag[] = Array.isArray(obj.verificationFlags)
    ? obj.verificationFlags
        .filter(
          (f): f is Record<string, unknown> =>
            Boolean(f) && typeof f === 'object' && !Array.isArray(f)
        )
        .map((f) => ({
          location: typeof f.location === 'string' && f.location.trim() ? f.location.trim() : 'Syllabus',
          message: typeof f.message === 'string' ? f.message.trim() : '',
        }))
        .filter((f) => f.message.length > 0)
    : [];

  return {
    subject: obj.subject.trim(),
    subjectCode: obj.subjectCode.trim(),
    units: normalizedUnits,
    verificationFlags,
    isIncomplete: Boolean(obj.isIncomplete),
  };
}

function getApiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.'
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractRetryableStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const record = err as Record<string, unknown>;
  if (typeof record.status === 'number') return record.status;
  if (typeof record.statusCode === 'number') return record.statusCode;
  const msg = typeof record.message === 'string' ? record.message : '';
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return 429;
  if (msg.includes('503') || msg.includes('UNAVAILABLE')) return 503;
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return 403;
  if (msg.includes('400') || msg.includes('API_KEY_INVALID')) return 400;
  return null;
}

function extractReadableErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Failed to analyse syllabus with Gemini API.';
  const rawMessage = typeof (err as { message?: unknown }).message === 'string'
    ? (err as { message: string }).message
    : '';

  if (rawMessage.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: { message?: string } };
      if (typeof parsed?.error?.message === 'string' && parsed.error.message.trim()) {
        return parsed.error.message.trim();
      }
    } catch {
      // Fallback to raw message
    }
  }

  return rawMessage || 'Failed to analyse syllabus with Gemini API.';
}

export async function analyzeSyllabusWithGemini(
  rawText: string,
  sourceHint?: string
): Promise<GeminiSyllabusPayload> {
  const ai = getApiClient();

  const userPrompt = [
    sourceHint ? `Source filename hint (use only if helpful, do not invent missing codes): ${sourceHint}` : null,
    'Syllabus text to structure:',
    '---',
    rawText,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const responseText = (response.text ?? '').trim();
      if (!responseText) {
        const emptyErr = new Error(
          'Gemini returned an empty response. Please retry syllabus analysis.'
        ) as Error & { statusCode?: number };
        emptyErr.statusCode = 502;
        throw emptyErr;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const parseErr = new Error(
          'Gemini returned invalid JSON that could not be parsed. Please retry.'
        ) as Error & { statusCode?: number };
        parseErr.statusCode = 502;
        throw parseErr;
      }

      return validateStructuredSyllabus(parsed);
    } catch (err) {
      lastError = err;
      const status = extractRetryableStatus(err);
      if ((status === 429 || status === 503) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        continue;
      }
      break;
    }
  }

  const status = extractRetryableStatus(lastError);
  if (status === 403 || status === 400) {
    const authErr = new Error(
      'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.'
    ) as Error & { statusCode?: number };
    authErr.statusCode = 502;
    throw authErr;
  }

  if (status === 429) {
    const rateErr = new Error(
      'Gemini API rate limit reached. Please wait a few seconds and retry.'
    ) as Error & { statusCode?: number };
    rateErr.statusCode = 429;
    throw rateErr;
  }

  if (status === 503) {
    const busyErr = new Error(
      'Gemini AI service is temporarily experiencing high demand. Please retry in a few seconds.'
    ) as Error & { statusCode?: number };
    busyErr.statusCode = 503;
    throw busyErr;
  }

  const fallbackErr = new Error(extractReadableErrorMessage(lastError)) as Error & {
    statusCode?: number;
  };
  fallbackErr.statusCode =
    lastError && typeof (lastError as { statusCode?: unknown }).statusCode === 'number'
      ? (lastError as { statusCode: number }).statusCode
      : 500;
  throw fallbackErr;
}
