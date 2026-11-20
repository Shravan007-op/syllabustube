import { useState } from 'react';
import { Check, ExternalLink, Play } from 'lucide-react';
import type { RankedVideoResult } from '../types/syllabus';
import { getDisplayDuration } from '../utils/videoMetadata';

interface VideoCardProps {
  video: RankedVideoResult;
  isWatched?: boolean;
  onToggleWatched?: (videoId: string) => void;
  isPrimary?: boolean;
}

export function VideoCard({
  video,
  isWatched = false,
  onToggleWatched,
  isPrimary = false,
}: VideoCardProps) {
  const [imgError, setImgError] = useState(false);

  const youtubeUrl =
    video.videoUrl ||
    (video.videoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          video.youtubeSearchQuery || `${video.title} ${video.channelName}`
        )}`);

  const displayDuration = getDisplayDuration(video.duration);

  return (
    <div
      className={`group flex items-start gap-3 rounded-md border p-2.5 transition-colors ${
        isWatched
          ? 'border-border-subtle bg-surface-muted/30 opacity-70'
          : isPrimary
            ? 'border-accent/30 bg-surface hover:border-accent/60'
            : 'border-border-subtle bg-surface hover:border-border-strong'
      }`}
    >
      {/* Watched checkbox */}
      {onToggleWatched && (
        <button
          type="button"
          onClick={() => onToggleWatched(video.id || video.videoId || video.title)}
          aria-label={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
          title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
            isWatched
              ? 'border-accent bg-accent text-white'
              : 'border-border-strong bg-surface hover:border-accent'
          }`}
        >
          {isWatched && <Check className="h-3 w-3" strokeWidth={2.5} />}
        </button>
      )}

      {/* 16:9 Thumbnail (Compact) */}
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-surface-muted border border-border-subtle group-hover:border-accent/40"
      >
        {!imgError && video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-muted text-text-subtle">
            <Play className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}

        {displayDuration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-0.2 font-mono text-[10px] font-medium text-white tabular-nums">
            {displayDuration}
          </span>
        )}
      </a>

      {/* Metadata & Title */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-xs sm:text-sm text-text-main line-clamp-1 hover:text-accent transition-colors flex items-center gap-1"
          >
            <span className={isWatched ? 'line-through text-text-muted' : ''}>{video.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent" strokeWidth={1.75} />
          </a>

          {isPrimary && (
            <span className="hidden sm:inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-accent-subtle text-accent-text whitespace-nowrap">
              Top Match
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted font-mono tabular-nums">
          <span className="font-sans font-medium text-text-main">{video.channelName}</span>
          {video.viewsLabel && video.viewsLabel !== 'YouTube' && (
            <>
              <span aria-hidden="true" className="text-border-strong">·</span>
              <span>{video.viewsLabel}</span>
            </>
          )}
          {video.language && (
            <>
              <span aria-hidden="true" className="text-border-strong">·</span>
              <span className="font-sans">{video.language}</span>
            </>
          )}
          {video.publishedLabel && video.publishedLabel !== 'YouTube' && (
            <>
              <span aria-hidden="true" className="text-border-strong">·</span>
              <span>{video.publishedLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
