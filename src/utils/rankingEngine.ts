import { RankedVideoResult, SearchPreferences, VideoResult } from '../types/syllabus';

interface ScoredEntry {
  video: VideoResult;
  score: number;
  isFallback: boolean;
  rankReason: string | null;
}

/**
 * Ranks and filters demonstration videos according to all 7 user preferences:
 * 1. Preferred country (India default)
 * 2. Language options (English, Hindi, Marathi, Other)
 * 3. Optional preferred YouTube channel names (multiple supported)
 * 4. Number of videos per topic (3, 5, or 10)
 * 5. Indian educational channels ranking priority
 * 6. Fallback toggle controlling whether non-matching / global channels appear
 */
export function rankTopicVideos(
  videos: VideoResult[],
  prefs: SearchPreferences,
  topicTitle?: string
): RankedVideoResult[] {
  const cleanedPreferredChannels = prefs.preferredChannels
    .map((c) => c.trim())
    .filter(Boolean);

  const normalizedPreferred = cleanedPreferredChannels.map((c) => c.toLowerCase());
  const selectedLanguages = new Set<string>(prefs.languages);

  // If the user typed a custom preferred channel not in our static sample pool,
  // synthesize a demonstration match entry so multi-channel ranking is visibly responsive.
  const augmentedVideos: VideoResult[] = [...videos];
  const baseThumb = videos[0]?.thumbnailUrl ?? '';
  const fallbackTopicTitle = topicTitle ?? videos[0]?.title.split(' — ')[0] ?? 'Syllabus Topic';
  const primaryLang = prefs.languages[0] ?? 'English';

  cleanedPreferredChannels.forEach((channel, idx) => {
    const channelLower = channel.toLowerCase();
    const existsInPool = augmentedVideos.some((v) => {
      const vLower = v.channelName.toLowerCase();
      return vLower.includes(channelLower) || channelLower.includes(vLower);
    });

    if (!existsInPool) {
      augmentedVideos.push({
        id: `custom-ch-${idx}-${fallbackTopicTitle.slice(0, 12)}`,
        title: `${fallbackTopicTitle} — Preferred Channel Lecture`,
        channelName: channel,
        countryOrigin: prefs.preferredCountry === 'Global' ? 'India' : prefs.preferredCountry,
        isIndianEducator: prefs.preferredCountry === 'India' || prefs.prioritizeIndianChannels,
        language: primaryLang,
        duration: '21:15',
        viewsLabel: '480K views',
        publishedLabel: '1 year ago',
        thumbnailUrl: baseThumb,
        summary: `Demonstration match prioritised for your preferred channel (${channel}).`,
        youtubeSearchQuery: `${fallbackTopicTitle} ${channel}`,
        relevanceScore: 99,
      });
    }
  });

  const primaryMatches: ScoredEntry[] = [];
  const fallbackPool: ScoredEntry[] = [];

  for (const video of augmentedVideos) {
    const channelLower = video.channelName.toLowerCase();
    const isPreferredChannel = normalizedPreferred.some(
      (pref) => channelLower.includes(pref) || pref.includes(channelLower)
    );

    const matchesLanguage =
      selectedLanguages.size === 0 || selectedLanguages.has(video.language);

    const matchesCountry =
      prefs.preferredCountry === 'Global' ||
      video.countryOrigin === prefs.preferredCountry;

    let score = video.relevanceScore;
    const reasons: string[] = [];

    if (isPreferredChannel) {
      score += 120;
      reasons.push('Preferred Channel');
    }

    if (prefs.prioritizeIndianChannels && video.isIndianEducator) {
      score += 45;
      reasons.push('Indian Educator Priority');
    }

    if (matchesCountry && prefs.preferredCountry !== 'Global') {
      score += 20;
    }

    if (matchesLanguage && selectedLanguages.size > 0) {
      score += 30;
    }

    const isStrictMatch =
      matchesLanguage && (matchesCountry || isPreferredChannel);

    if (isStrictMatch) {
      primaryMatches.push({
        video,
        score,
        isFallback: false,
        rankReason: reasons.length > 0 ? reasons.join(' · ') : null,
      });
    } else {
      const fallbackScore = score + (matchesLanguage ? 15 : 0);
      fallbackPool.push({
        video,
        score: fallbackScore,
        isFallback: true,
        rankReason:
          reasons.length > 0
            ? `${reasons.join(' · ')} · Fallback Result`
            : 'Fallback Result',
      });
    }
  }

  primaryMatches.sort((a, b) => b.score - a.score);
  fallbackPool.sort((a, b) => b.score - a.score);

  const combined = prefs.allowFallbackChannels
    ? [...primaryMatches, ...fallbackPool]
    : primaryMatches;

  return combined.slice(0, prefs.videosPerTopic).map((entry) => ({
    ...entry.video,
    rankReason: entry.rankReason,
    isFallback: entry.isFallback,
  }));
}
