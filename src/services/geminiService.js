/**
 * Frontend integration service for the SyllabusTube Google Apps Script backend.
 *
 * Supports both:
 * 1. Same-origin serverless proxy (Netlify/Vercel) to completely eliminate browser CORS redirects.
 * 2. Direct Google Apps Script Web App fetch with intelligent fallback.
 */

export class AppsScriptServiceError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'APPS_SCRIPT_ERROR') {
    super(message);
    this.name = 'AppsScriptServiceError';
    this.code = code;
  }
}

const DEFAULT_DEPLOYED_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwPiLzm4X9unGh8YmHeKUIs-XE9O6Jq6E5q239LNTVE9uNOjt7QQY5A4OTxYbCb7exy/exec';

/**
 * Reads the configured Apps Script Web App URL from Vite environment variables,
 * with a reliable fallback to the deployed production Apps Script URL.
 *
 * @returns {string}
 */
export function getAppsScriptEndpointUrl() {
  const rawUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (typeof rawUrl === 'string' && rawUrl.trim()) {
    return rawUrl.trim();
  }
  return DEFAULT_DEPLOYED_APPS_SCRIPT_URL;
}

/**
 * Returns true if a non-empty Apps Script Web App URL has been configured.
 *
 * @returns {boolean}
 */
export function isAppsScriptConfigured() {
  const url = getAppsScriptEndpointUrl();
  return /^https?:\/\/.+/i.test(url);
}

/**
 * Robust HTTP client that tries same-origin serverless proxy endpoints first
 * (Netlify / Vercel), falling back seamlessly to direct Google Apps Script.
 *
 * @param {object} requestBody
 * @param {object} [options]
 * @returns {Promise<{ response: Response, payload: any }>}
 */
export async function postToBackend(requestBody, options = {}) {
  const directEndpoint =
    typeof options.endpointUrl === 'string' && options.endpointUrl.trim()
      ? options.endpointUrl.trim()
      : getAppsScriptEndpointUrl();

  const candidates = [];

  // Try same-origin serverless proxies if in browser environment
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    !window.location.origin.startsWith('file:')
  ) {
    candidates.push({
      url: `${window.location.origin}/.netlify/functions/api`,
      isProxy: true,
    });
    candidates.push({
      url: `${window.location.origin}/api/proxy`,
      isProxy: true,
    });
  }

  candidates.push({
    url: directEndpoint,
    isProxy: false,
  });

  let lastError = null;

  for (const candidate of candidates) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await fetch(candidate.url, {
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

      // If a proxy returns 404 (functions not deployed on this static host), try next candidate
      if (candidate.isProxy && response.status === 404) {
        continue;
      }

      const rawResponseText = await response.text();
      const trimmedResponse = rawResponseText.trim();

      // Detect Google Sign-In redirect when user has multiple Google accounts active
      if (
        trimmedResponse.startsWith('<') ||
        (response.url && response.url.includes('accounts.google.com'))
      ) {
        throw new AppsScriptServiceError(
          'Google returned an authentication redirect instead of JSON. If you are signed into multiple Google accounts in this browser, please open this in an Incognito / Private window or ensure your Apps Script is deployed with "Who has access: Anyone".',
          'HTML_RESPONSE_ERROR'
        );
      }

      if (!trimmedResponse) {
        throw new AppsScriptServiceError(
          'Backend returned an empty response.',
          'EMPTY_RESPONSE'
        );
      }

      let payload;
      try {
        payload = JSON.parse(trimmedResponse);
      } catch {
        throw new AppsScriptServiceError(
          'Backend returned invalid JSON.',
          'INVALID_JSON_RESPONSE'
        );
      }

      return { response, payload };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      if (candidate.isProxy) {
        continue;
      }
      lastError = err;
    }
  }

  throw new AppsScriptServiceError(
    lastError instanceof Error && lastError.message
      ? `Unable to connect to backend: ${lastError.message}. If you have multiple Google accounts logged into this browser or an ad-blocker enabled, please try in an Incognito / Private window.`
      : 'Unable to read response from the Google Apps Script backend. If you are logged into multiple Google accounts or using an ad-blocker, please test in an Incognito / Private window.',
    'NETWORK_OR_CORS_ERROR'
  );
}

/**
 * Sends extracted or manual syllabus text to the backend
 * using the `analyseSyllabus` action.
 *
 * @param {string} syllabusText
 * @param {object} [options]
 * @param {string} [options.sourceFileName]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.endpointUrl] Optional explicit endpoint override
 */
export async function analyseSyllabusWithAppsScript(syllabusText, options = {}) {
  const trimmedText = typeof syllabusText === 'string' ? syllabusText.trim() : '';
  if (!trimmedText) {
    throw new AppsScriptServiceError(
      'Syllabus text is empty. Please upload a document or enter your syllabus topics first.',
      'EMPTY_SYLLABUS_TEXT'
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

  if (!response.ok) {
    const errMsg =
      payload && payload.error && typeof payload.error.message === 'string'
        ? payload.error.message
        : `Backend request failed with HTTP status ${response.status}.`;
    throw new AppsScriptServiceError(errMsg, 'HTTP_ERROR');
  }

  if (!payload || typeof payload !== 'object' || payload.ok !== true) {
    const errObj =
      payload && payload.error && typeof payload.error === 'object' ? payload.error : {};
    const errMsg =
      typeof errObj.message === 'string' && errObj.message.trim()
        ? errObj.message.trim()
        : 'Apps Script backend reported an analysis failure.';
    const errCode =
      typeof errObj.code === 'string' && errObj.code.trim()
        ? errObj.code.trim()
        : 'BACKEND_ERROR';
    throw new AppsScriptServiceError(errMsg, errCode);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.subject !== 'string' ||
    typeof payload.subjectCode !== 'string' ||
    !Array.isArray(payload.units)
  ) {
    throw new AppsScriptServiceError(
      'Apps Script backend response is missing required syllabus fields (subject, subjectCode, units).',
      'INVALID_SCHEMA'
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
