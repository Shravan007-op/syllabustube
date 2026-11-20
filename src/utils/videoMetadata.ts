import type { RankedVideoResult, StructuredTopic } from '../types/syllabus';

const STOP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'into',
  'using',
  'based',
  'introduction',
  'basics',
  'overview',
  'concept',
  'concepts',
  'types',
  'unit',
  'chapter',
  'topic',
  'part',
  'lecture',
]);

/**
 * Returns duration only when an actual YouTube video duration string is available.
 */
export function getDisplayDuration(duration?: string): string | null {
  if (!duration || typeof duration !== 'string') return null;
  const trimmed = duration.trim();
  if (!trimmed || trimmed.toLowerCase() === 'video' || trimmed === '0:00') {
    return null;
  }
  return trimmed;
}

/**
 * Extracts up to 2–4 concise sentences strictly from the actual YouTube description.
 * Never fabricates text when no description is present.
 */
export function extractConciseDescription(summary?: string): string | null {
  if (!summary || typeof summary !== 'string') return null;
  const normalized = summary
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  const sentences = normalized.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    const selected = sentences.slice(0, 4).join(' ').trim();
    if (selected.length <= 360) return selected;
    return `${selected.slice(0, 357).trim()}…`;
  }

  if (normalized.length <= 320) return normalized;
  return `${normalized.slice(0, 317).trim()}…`;
}

/**
 * Returns syllabus topics or subtopics only when actually supported by the video's
 * returned YouTube metadata (backend `coveredTopics` or explicit keyword overlap in
 * title/description). Never guesses or fabricates coverage claims.
 */
export function computeGroundedCoveredTerms(
  video: RankedVideoResult,
  topic?: StructuredTopic
): string[] {
  if (Array.isArray(video.coveredTopics) && video.coveredTopics.length > 0) {
    return video.coveredTopics.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }

  if (!topic) return [];

  const metadataText = `${video.title || ''} ${video.summary || ''}`.toLowerCase();
  if (!metadataText.trim()) return [];

  const candidates = [topic.topicName, ...topic.subtopics]
    .map((s) => s.trim())
    .filter(Boolean);

  const matched: string[] = [];
  const seen = new Set<string>();

  for (const label of candidates) {
    const lower = label.toLowerCase();
    if (seen.has(lower)) continue;

    let isSupported = false;
    if (metadataText.includes(lower)) {
      isSupported = true;
    } else {
      const words = lower
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
      if (words.length > 0) {
        const hits = words.filter((w) => metadataText.includes(w)).length;
        const threshold = words.length === 1 ? 1 : Math.ceil(words.length * 0.6);
        if (hits >= threshold) {
          isSupported = true;
        }
      }
    }

    if (isSupported) {
      seen.add(lower);
      matched.push(label);
    }
  }

  return matched;
}

/**
 * Produces a grounded relevance explanation derived strictly from real YouTube
 * metadata and ranking signals.
 */
export function buildGroundedRelevanceExplanation(
  video: RankedVideoResult,
  topic?: StructuredTopic
): string {
  if (
    typeof video.relevanceExplanation === 'string' &&
    video.relevanceExplanation.trim()
  ) {
    return video.relevanceExplanation.trim();
  }

  const reasons: string[] = [];

  if (video.rankReason) {
    reasons.push(video.rankReason);
  }

  if (topic) {
    const titleLower = (video.title || '').toLowerCase();
    const topicWords = topic.topicName
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const titleHits = topicWords.filter((w) => titleLower.includes(w)).length;
    if (titleHits > 0 && topicWords.length > 0) {
      reasons.push(
        titleHits >= topicWords.length
          ? 'Video title matches key syllabus topic terms'
          : 'Video title contains syllabus topic keywords'
      );
    }
  }

  if (video.language) {
    reasons.push(`${video.language} lecture metadata`);
  }

  if (reasons.length === 0) {
    return 'Returned by YouTube Data API search for this syllabus topic';
  }

  return Array.from(new Set(reasons)).slice(0, 3).join(' · ');
}
