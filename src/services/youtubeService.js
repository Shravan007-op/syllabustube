import {
  AppsScriptServiceError,
  isAppsScriptConfigured,
  postToBackend,
} from './geminiService.js';

export { AppsScriptServiceError, isAppsScriptConfigured };

/**
 * Searches YouTube educational videos for a single syllabus topic via the
 * backend (`searchTopicVideos` action) at `/proxy`.
 *
 * @param {{
 *   subject?: string,
 *   unitTitle?: string,
 *   topicName: string,
 *   subtopics?: string[],
 *   preferences: {
 *     preferredCountry: string,
 *     languages: string[],
 *     otherLanguageLabel?: string,
 *     preferredChannels: string[],
 *     videosPerTopic: number,
 *     prioritizeIndianChannels: boolean,
 *     allowFallbackChannels: boolean,
 *   }
 * }} params
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{
 *   topicName: string,
 *   queryUsed: string,
 *   videos: Array<any>,
 *   cached: boolean
 * }>}
 */
export async function searchTopicVideosWithAppsScript(params, options = {}) {
  const topicName =
    params && typeof params.topicName === 'string' ? params.topicName.trim() : '';
  if (!topicName) {
    throw new AppsScriptServiceError(
      'Topic name is empty and cannot be searched on YouTube.',
      'MISSING_TOPIC_NAME'
    );
  }

  const requestBody = {
    action: 'searchTopicVideos',
    subject:
      params && typeof params.subject === 'string' ? params.subject.trim() : '',
    unitTitle:
      params && typeof params.unitTitle === 'string' ? params.unitTitle.trim() : '',
    topicName,
    subtopics: Array.isArray(params?.subtopics) ? params.subtopics : [],
    preferences: params?.preferences ?? {},
  };

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
      `Backend YouTube search failed with HTTP status ${response.status}.`;

    const errDetail =
      (typeof payload?.detail === 'string' && payload.detail.trim()) ||
      (typeof payload?.error?.detail === 'string' && payload.error.detail.trim()) ||
      '';

    throw new AppsScriptServiceError(errMsg, errCode, errDetail);
  }

  return {
    topicName: typeof payload.topicName === 'string' ? payload.topicName : topicName,
    queryUsed: typeof payload.queryUsed === 'string' ? payload.queryUsed : '',
    videos: Array.isArray(payload.videos) ? payload.videos : [],
    cached: Boolean(payload.cached),
  };
}
