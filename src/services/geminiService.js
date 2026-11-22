/**
 * Frontend integration service for the SyllabusTube proxy backend.
 * All backend calls go to `/proxy` on the same origin.
 */

export class AppsScriptServiceError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {string} [detail]
   */
  constructor(message, code = 'UNKNOWN', detail = '') {
    super(message);
    this.name = 'AppsScriptServiceError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Returns true since backend calls are routed through the same-origin proxy `/proxy`.
 * @returns {boolean}
 */
export function isAppsScriptConfigured() {
  return true;
}

/**
 * Sends POST requests exclusively to `/proxy` on the same origin.
 *
 * @param {object} requestBody
 * @param {object} [options]
 * @returns {Promise<{ response: Response, payload: any }>}
 */
export async function postToBackend(requestBody, options = {}) {
  const endpoint = '/proxy';

  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    const msg = err instanceof Error ? err.message : 'Failed to connect';
    throw new AppsScriptServiceError(
      'Could not connect to the backend service. Please check your connection and retry.',
      'NETWORK',
      msg
    );
  }

  const rawResponseText = await response.text();
  const trimmedResponse = rawResponseText.trim();

  if (!trimmedResponse) {
    throw new AppsScriptServiceError(
      'The backend returned an unreadable response.',
      'BACKEND_INVALID_RESPONSE',
      'Empty response body'
    );
  }

  let payload;
  try {
    payload = JSON.parse(trimmedResponse);
  } catch {
    throw new AppsScriptServiceError(
      'The backend returned an unreadable response.',
      'BACKEND_INVALID_RESPONSE',
      trimmedResponse.slice(0, 200)
    );
  }

  return { response, payload };
}

/**
 * Sends extracted or manual syllabus text to the backend
 * using the `analyseSyllabus` action.
 *
 * @param {string} syllabusText
 * @param {object} [options]
 * @param {string} [options.sourceFileName]
 * @param {AbortSignal} [options.signal]
 */
export async function analyseSyllabusWithAppsScript(syllabusText, options = {}) {
  const trimmedText = typeof syllabusText === 'string' ? syllabusText.trim() : '';
  if (!trimmedText) {
    throw new AppsScriptServiceError(
      'Syllabus text is empty. Please upload a document or enter your syllabus topics first.',
      'EMPTY_TEXT'
    );
  }

  const requestBody = {
    action: 'analyseSyllabus',
    syllabusText: trimmedText,
  };

  if (typeof options.sourceFileName === 'string' && options.sourceFileName.trim()) {
    requestBody.sourceFileName = options.sourceFileName.trim();
  }

  const { response, payload } = await postToBackend(requestBody, options);

  if (!response.ok || !payload || payload.ok !== true) {
    const errCode =
      (typeof payload?.code === 'string' && payload.code.trim()) ||
      (typeof payload?.error?.code === 'string' && payload.error.code.trim()) ||
      (response.status === 429
        ? 'RATE_LIMITED'
        : response.status === 500
        ? 'SERVER_NOT_CONFIGURED'
        : response.status === 502
        ? 'BACKEND_INVALID_RESPONSE'
        : response.status >= 500
        ? 'NETWORK'
        : 'UNKNOWN');

    const errMsg =
      (typeof payload?.message === 'string' && payload.message.trim()) ||
      (typeof payload?.error?.message === 'string' && payload.error.message.trim()) ||
      `Backend request failed with HTTP status ${response.status}.`;

    const errDetail =
      (typeof payload?.detail === 'string' && payload.detail.trim()) ||
      (typeof payload?.error?.detail === 'string' && payload.error.detail.trim()) ||
      '';

    throw new AppsScriptServiceError(errMsg, errCode, errDetail);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.subject !== 'string' ||
    typeof payload.subjectCode !== 'string' ||
    !Array.isArray(payload.units)
  ) {
    throw new AppsScriptServiceError(
      'Backend response is missing required syllabus fields (subject, subjectCode, units).',
      'AI_FAILED'
    );
  }

  return {
    subject: payload.subject,
    subjectCode: payload.subjectCode,
    units: payload.units,
    verificationFlags: Array.isArray(payload.verificationFlags)
      ? payload.verificationFlags
      : [],
    isIncomplete: Boolean(payload.isIncomplete),
  };
}
