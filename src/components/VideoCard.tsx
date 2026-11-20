import { useState } from 'react';
import { Award, ExternalLink, Play } from 'lucide-react';
import type { RankedVideoResult, StructuredTopic } from '../types/syllabus';
import {
  buildGroundedRelevanceExplanation,
  computeGroundedCoveredTerms,
  extractConciseDescription,
  getDisplayDuration,
} from '../utils/videoMetadata';

interface VideoCardProps {
  video: RankedVideoResult;
  topic?: StructuredTopic;
  variant?: 'featured' | 'alternative';
  alternativeIndex?: number;
}

export function VideoCard({
  video,
  topic,
  variant = 'alternative',
  alternativeIndex,
}: VideoCardProps) {
  const [imgError, setImgError] = useState(false);

  const youtubeUrl =
    video.videoUrl ||
    (video.videoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          video.youtubeSearchQuery
        )}`);

  const displayDuration = getDisplayDuration(video.duration);
  const descriptionExcerpt = extractConciseDescription(video.summary);
  const coveredTerms = computeGroundedCoveredTerms(video, topic);
  const relevanceText = buildGroundedRelevanceExplanation(video, topic);
  const isFeatured = variant === 'featured';

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-white transition-colors ${
        isFeatured
          ? 'border-[#0F1E3D]/25 hover:border-[#0F1E3D]/45 md:grid md:grid-cols-12'
          : 'flex flex-col border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* 16:9 Actual YouTube Thumbnail */}
      <div
        className={`relative aspect-video w-full overflow-hidden bg-[#0B1528] ${
          isFeatured ? 'md:col-span-5 md:h-full md:aspect-auto' : ''
        }`}
      >
        {!imgError && video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={`${video.title} YouTube video thumbnail`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0B1528] to-[#1E3A5F] p-4 text-center text-white">
            <Play className="h-8 w-8 text-white/80" />
            <span className="mt-2 line-clamp-2 text-xs font-medium text-white/85">
              {video.channelName}
            </span>
          </div>
        )}

        {/* Measured Contrast Scrim & Duration (only shown when actual duration is available) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
        />
        {displayDuration && (
          <span className="absolute bottom-2.5 right-2.5 rounded bg-[#0B1528]/90 px-2 py-0.5 font-mono text-xs font-medium text-white tabular-nums">
            {displayDuration}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div
        className={`flex flex-1 flex-col justify-between p-4 sm:p-5 ${
          isFeatured ? 'md:col-span-7 sm:p-6' : ''
        }`}
      >
        <div className="space-y-2.5">
          {/* Quiet Unboxed Recommendation Indicator (zero pills) */}
          {isFeatured ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span>Best Recommendation</span>
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-500">
              Alternative Option{alternativeIndex ? ` · ${alternativeIndex}` : ''}
            </p>
          )}

          {/* Video Title (stretched link makes entire card clickable to open YouTube in a new tab) */}
          <h5
            className={`font-bold leading-snug text-[#0B1528] ${
              isFeatured ? 'text-base sm:text-lg' : 'text-sm sm:text-base line-clamp-2'
            }`}
          >
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group-hover:text-[#1D4ED8] hover:text-[#1D4ED8] transition-colors focus-visible:outline-none after:absolute after:inset-0"
            >
              {video.title}
            </a>
          </h5>

          {/* Channel Name & Verified Metadata */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600">
            <span className="font-semibold text-[#0B1528]">{video.channelName}</span>
            {displayDuration && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{displayDuration}</span>
              </>
            )}
            {video.viewsLabel && video.viewsLabel !== 'YouTube' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{video.viewsLabel}</span>
              </>
            )}
            {video.language && (
              <>
                <span aria-hidden="true">·</span>
                <span>{video.language}</span>
              </>
            )}
            {video.publishedLabel && video.publishedLabel !== 'YouTube' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{video.publishedLabel}</span>
              </>
            )}
          </div>

          {/* Concise Description from YouTube Metadata */}
          {descriptionExcerpt && (
            <p
              className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${
                isFeatured ? 'line-clamp-4' : 'line-clamp-3'
              }`}
            >
              {descriptionExcerpt}
            </p>
          )}

          {/* Grounded Coverage & Relevance Explanation */}
          <div className="space-y-1 pt-1 text-xs text-slate-600">
            {coveredTerms.length > 0 && (
              <p className="leading-relaxed">
                <span className="font-semibold text-[#0B1528]">Covers: </span>
                <span>{coveredTerms.join(' · ')}</span>
              </p>
            )}
            <p className="leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Why this fits: </span>
              <span>{relevanceText}</span>
            </p>
          </div>
        </div>

        {/* Action: Prominent Watch on YouTube Link */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F1E3D] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </article>
  );
}
