import {
  AppsScriptServiceError,
  getAppsScriptEndpointUrl,
  isAppsScriptConfigured,
  postToBackend,
} from './geminiService.js';

export { AppsScriptServiceError, getAppsScriptEndpointUrl, isAppsScriptConfigured };

/**
 * Searches YouTube educational videos for a single syllabus topic via the
 * backend (`searchTopicVideos` action).
 *
 * Uses same-origin proxy (Netlify / Vercel) when available, falling back
 * gracefully to direct Google Apps Script.
 *
 * @param {{
 *   subject?: string,
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
 * @param {{ signal?: AbortSignal, endpointUrl?: string }} [options]
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
    topicName,
    subtopics: Array.isArray(params?.subtopics) ? params.subtopics : [],
    preferences: params?.preferences ?? {},
  };

  const { response, payload } = await postToBackend(requestBody, options);

  if (!response.ok) {
    const errMsg =
      payload && payload.error && typeof payload.error.message === 'string'
        ? payload.error.message
        : `Backend YouTube search failed with HTTP status ${response.status}.`;
    throw new AppsScriptServiceError(errMsg, 'HTTP_ERROR');
  }

  if (!payload || typeof payload !== 'object' || payload.ok !== true) {
    const errObj =
      payload && payload.error && typeof payload.error === 'object' ? payload.error : {};
    const errMsg =
      typeof errObj.message === 'string' && errObj.message.trim()
        ? errObj.message.trim()
        : 'YouTube video search failed.';
    const errCode =
      typeof errObj.code === 'string' && errObj.code.trim()
        ? errObj.code.trim()
        : 'YOUTUBE_ERROR';
    throw new AppsScriptServiceError(errMsg, errCode);
  }

  return {
    topicName: typeof payload.topicName === 'string' ? payload.topicName : topicName,
    queryUsed: typeof payload.queryUsed === 'string' ? payload.queryUsed : '',
    videos: Array.isArray(payload.videos) ? payload.videos : [],
    cached: Boolean(payload.cached),
  };
}
