export const APP_CONFIG = {
  MAX_FILE_SIZE_MB: 25,
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,
  MAX_PDF_PAGES: 150,
  CHUNK_MAX_CHARS: 8000,
  MAX_CHUNK_RETRIES: 2,
  BACKOFF_BASE_MS: 800,
  MIN_MEANINGFUL_CHARS: 10,
  ACCEPTED_FILE_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png'] as const,
  STORAGE_KEYS: {
    THEME: 'syllabustube_theme',
    WATCHED_PREFIX: 'syllabustube_watched_',
    SAVED_ROADMAP_PREFIX: 'syllabustube_roadmap_',
    PREFERENCES: 'syllabustube_preferences',
  },
} as const;

export type AppErrorCode =
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_PAGES'
  | 'UNSUPPORTED_FILE'
  | 'EMPTY_FILE'
  | 'EMPTY_TEXT'
  | 'OCR_FAILED'
  | 'NETWORK'
  | 'RATE_LIMITED'
  | 'AI_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'AUTH_REQUIRED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface UserFriendlyError {
  code: AppErrorCode;
  title: string;
  message: string;
  action: string;
}

export const ERROR_MAPPINGS: Record<AppErrorCode, Omit<UserFriendlyError, 'code'>> = {
  FILE_TOO_LARGE: {
    title: 'File Exceeds Size Limit',
    message: `The uploaded document exceeds the ${APP_CONFIG.MAX_FILE_SIZE_MB} MB limit.`,
    action: 'Please compress the file or upload a smaller portion of the syllabus.',
  },
  TOO_MANY_PAGES: {
    title: 'Page Limit Exceeded',
    message: `This PDF contains more than the maximum allowed limit of ${APP_CONFIG.MAX_PDF_PAGES} pages.`,
    action: 'Extract and upload only the relevant syllabus pages (usually 2-10 pages).',
  },
  UNSUPPORTED_FILE: {
    title: 'Unsupported File Format',
    message: 'The selected file type is not supported. Only PDF, JPG, JPEG, and PNG files are accepted.',
    action: 'Please convert the file to PDF or an image format, or paste the text directly.',
  },
  EMPTY_FILE: {
    title: 'Empty File',
    message: 'The uploaded file is empty (0 bytes).',
    action: 'Please select a valid syllabus document.',
  },
  EMPTY_TEXT: {
    title: 'No Text Found',
    message: 'No readable text could be extracted from this document.',
    action: 'Make sure the scan is clear, or paste your syllabus text directly.',
  },
  OCR_FAILED: {
    title: 'OCR Processing Failed',
    message: 'Unable to recognize text from the scanned page or image.',
    action: 'Try uploading a higher-contrast scan or enter your syllabus topics manually.',
  },
  NETWORK: {
    title: 'Connection Failed',
    message: 'Could not connect to the backend server.',
    action: 'Check your connection and try again in a few minutes.',
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'Requests were sent too quickly or the daily cap has been reached.',
    action: 'Try again in a few minutes.',
  },
  AI_FAILED: {
    title: 'AI Structuring Failed',
    message: 'The AI model could not structure this text into units and topics.',
    action: 'Try a smaller file or paste plain unit headings.',
  },
  QUOTA_EXCEEDED: {
    title: 'Daily Quota Reached',
    message: 'The daily search or AI API quota has been reached.',
    action: 'Daily limit reached, try tomorrow.',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The operation took too long to complete.',
    action: 'Try a smaller file or paste fewer units at a time.',
  },
  ABORTED: {
    title: 'Operation Cancelled',
    message: 'The extraction or search was stopped.',
    action: 'You can start a new request whenever you are ready.',
  },
  AUTH_REQUIRED: {
    title: 'Authentication Required',
    message: 'The backend returned an authentication redirect.',
    action: 'If signed into multiple Google accounts, test in an Incognito window, or ensure the script is deployed to Anyone.',
  },
  UNAUTHORIZED: {
    title: 'Proxy Secret Mismatch',
    message: 'The backend rejected the request because PROXY_SECRET is set in Apps Script Script Properties but does not match your website environment.',
    action: 'Delete PROXY_SECRET from your Apps Script Script Properties, or set the matching PROXY_SECRET in your Vercel Environment Variables.',
  },
  UNKNOWN: {
    title: 'Unexpected Error',
    message: 'An unexpected problem occurred while processing your request.',
    action: 'Please refresh the page and try again.',
  },
};

export function resolveUserError(error: unknown): UserFriendlyError {
  if (!error) {
    return { code: 'UNKNOWN', ...ERROR_MAPPINGS.UNKNOWN };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const rawCode = (error as { code?: string }).code || '';

  // Direct code matches
  if (rawCode in ERROR_MAPPINGS) {
    const code = rawCode as AppErrorCode;
    return { code, ...ERROR_MAPPINGS[code] };
  }

  const lower = rawMessage.toLowerCase();

  if (lower.includes('abort') || lower.includes('cancel')) {
    return { code: 'ABORTED', ...ERROR_MAPPINGS.ABORTED };
  }
  if (lower.includes('exceeds') && lower.includes('mb')) {
    return { code: 'FILE_TOO_LARGE', ...ERROR_MAPPINGS.FILE_TOO_LARGE };
  }
  if (lower.includes('page limit') || lower.includes('too many pages')) {
    return { code: 'TOO_MANY_PAGES', ...ERROR_MAPPINGS.TOO_MANY_PAGES };
  }
  if (lower.includes('unsupported') || lower.includes('format')) {
    return { code: 'UNSUPPORTED_FILE', ...ERROR_MAPPINGS.UNSUPPORTED_FILE };
  }
  if (lower.includes('empty text') || lower.includes('no readable text') || lower.includes('too short')) {
    return { code: 'EMPTY_TEXT', ...ERROR_MAPPINGS.EMPTY_TEXT };
  }
  if (lower.includes('quota') || lower.includes('resource_exhausted')) {
    return { code: 'QUOTA_EXCEEDED', ...ERROR_MAPPINGS.QUOTA_EXCEEDED };
  }
  if (lower.includes('rate') || lower.includes('throttle') || lower.includes('busy') || lower.includes('429')) {
    return { code: 'RATE_LIMITED', ...ERROR_MAPPINGS.RATE_LIMITED };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return { code: 'TIMEOUT', ...ERROR_MAPPINGS.TIMEOUT };
  }
  if (
    lower.includes('ai') ||
    lower.includes('gemini') ||
    lower.includes('structur') ||
    lower.includes('parse') ||
    lower.includes('schema') ||
    lower.includes('candidate')
  ) {
    return { code: 'AI_FAILED', ...ERROR_MAPPINGS.AI_FAILED };
  }
  if (lower.includes('accounts.google.com') || lower.includes('authentication redirect') || lower.includes('html_response')) {
    return { code: 'AUTH_REQUIRED', ...ERROR_MAPPINGS.AUTH_REQUIRED };
  }
  if (lower.includes('unauthorized') || lower.includes('proxy secret')) {
    return { code: 'UNAUTHORIZED', ...ERROR_MAPPINGS.UNAUTHORIZED };
  }
  if (
    lower.includes('network') ||
    lower.includes('cors') ||
    lower.includes('failed to fetch') ||
    lower.includes('connect') ||
    lower.includes('offline')
  ) {
    return { code: 'NETWORK', ...ERROR_MAPPINGS.NETWORK };
  }
  if (lower.includes('ocr') || lower.includes('tesseract')) {
    return { code: 'OCR_FAILED', ...ERROR_MAPPINGS.OCR_FAILED };
  }

  return {
    code: 'UNKNOWN',
    ...ERROR_MAPPINGS.UNKNOWN,
  };
}
