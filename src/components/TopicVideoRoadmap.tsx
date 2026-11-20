import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Menu,
  RotateCcw,
  X,
  Youtube,
} from 'lucide-react';
import { APP_CONFIG, resolveUserError } from '../config';
import type {
  RankedVideoResult,
  SearchPreferences,
  StructuredSyllabus,
  StructuredTopic,
  StructuredUnit,
  TopicVideoSearchState,
} from '../types/syllabus';
import { VideoCard } from './VideoCard';

interface TopicVideoRoadmapProps {
  syllabus: StructuredSyllabus;
  preferences: SearchPreferences;
  topicVideoResults: Record<string, TopicVideoSearchState>;
  isSearching: boolean;
  isYoutubeConfigured: boolean;
  configurationNotice: string | null;
  onSearchSingleTopic: (topic: StructuredTopic) => void;
  onSearchUnitTopics: (unit: StructuredUnit) => void;
  onRefreshAllVideos: () => void;
}

export function TopicVideoRoadmap({
  syllabus,
  preferences,
  topicVideoResults,
  isSearching,
  isYoutubeConfigured,
  configurationNotice,
  onSearchSingleTopic,
  onSearchUnitTopics,
  onRefreshAllVideos,
}: TopicVideoRoadmapProps) {
  // Active unit selection (default: unit 1)
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    return syllabus.units[0]?.id || '';
  });

  // Mobile drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Watched video IDs persisted per syllabus in localStorage
  const storageKey = useMemo(() => {
    const identifier = syllabus.subjectCode || syllabus.subject || 'default';
    return `${APP_CONFIG.STORAGE_KEYS.WATCHED_PREFIX}${identifier.replace(/[^a-z0-9]/gi, '_')}`;
  }, [syllabus.subject, syllabus.subjectCode]);

  const [watchedSet, setWatchedSet] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {}
    return new Set();
  });

  const toggleWatched = (videoId: string) => {
    setWatchedSet((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Lazy-load YouTube results for the active unit when selected
  useEffect(() => {
    if (!isYoutubeConfigured) return;
    const currentUnit = syllabus.units.find((u) => u.id === selectedUnitId);
    if (currentUnit) {
      // Check if any topics in this unit need loading
      const needsSearch = currentUnit.topics.some(
        (t) => !topicVideoResults[t.id] || topicVideoResults[t.id].status === 'idle'
      );
      if (needsSearch) {
        onSearchUnitTopics(currentUnit);
      }
    }
  }, [selectedUnitId, syllabus.units, isYoutubeConfigured]);

  const currentUnit = useMemo(() => {
    return syllabus.units.find((u) => u.id === selectedUnitId) || syllabus.units[0];
  }, [selectedUnitId, syllabus.units]);

  // Per-unit progress calculations
  const unitStats = useMemo(() => {
    const stats: Record<string, { total: number; watched: number; percent: number }> = {};
    for (const unit of syllabus.units) {
      const topicCount = unit.topics.length;
      let watchedCount = 0;
      for (const topic of unit.topics) {
        const topicState = topicVideoResults[topic.id];
        const isTopicWatched = topicState?.videos?.some((v) => watchedSet.has(v.id || v.videoId || v.title));
        if (isTopicWatched) {
          watchedCount += 1;
        }
      }
      stats[unit.id] = {
        total: topicCount,
        watched: watchedCount,
        percent: topicCount > 0 ? Math.round((watchedCount / topicCount) * 100) : 0,
      };
    }
    return stats;
  }, [syllabus.units, topicVideoResults, watchedSet]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Mobile drawer toggle */}
      <div className="lg:hidden flex items-center justify-between border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-main cursor-pointer"
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
          <span>
            Unit {currentUnit ? String(currentUnit.unitNumber).padStart(2, '0') : '01'}
            {currentUnit?.unitName ? `: ${currentUnit.unitName}` : ''}
          </span>
        </button>

        <span className="text-xs text-text-muted font-mono tabular-nums">
          {syllabus.units.length} units total
        </span>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Left Sidebar: Units with per-unit progress */}
      <aside
        className={`lg:col-span-4 lg:sticky lg:top-20 z-50 lg:z-10 ${
          mobileDrawerOpen
            ? 'fixed inset-y-0 left-0 w-4/5 max-w-sm bg-surface p-4 shadow-xl overflow-y-auto block'
            : 'hidden lg:block'
        }`}
      >
        <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-3">
          <div className="flex items-center justify-between px-2 pt-1 border-b border-border-subtle pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
              <BookOpen className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              <span>Syllabus Units</span>
            </div>
            {mobileDrawerOpen && (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded p-1 text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <nav className="space-y-1" aria-label="Units">
            {syllabus.units.map((unit) => {
              const active = unit.id === currentUnit?.id;
              const uStat = unitStats[unit.id] || { total: 0, watched: 0, percent: 0 };

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`flex w-full flex-col gap-1.5 rounded-md p-2.5 text-left text-xs transition-colors cursor-pointer border ${
                    active
                      ? 'border-accent/40 bg-accent-subtle/50 text-text-main'
                      : 'border-transparent hover:border-border-subtle hover:bg-surface-muted/50 text-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-semibold text-accent">
                      Unit {String(unit.unitNumber).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-text-muted">
                      {uStat.watched}/{uStat.total} watched
                    </span>
                  </div>

                  <p className={`font-medium line-clamp-1 ${active ? 'text-text-main' : 'text-text-muted'}`}>
                    {unit.unitName || `Unit ${unit.unitNumber}`}
                  </p>

                  {/* Unit Progress Bar */}
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-muted border border-border-subtle">
                    <div
                      className="h-full bg-accent transition-all duration-200"
                      style={{ width: `${uStat.percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Area: Topics for Selected Unit as Compact Rows */}
      <main className="lg:col-span-8 space-y-6">
        {currentUnit && (
          <div className="rounded-lg border border-border-subtle bg-surface p-4 sm:p-5 space-y-4">
            {/* Unit Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
              <div>
                <span className="font-mono text-xs font-semibold text-accent">
                  Unit {String(currentUnit.unitNumber).padStart(2, '0')}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-text-main">
                  {currentUnit.unitName || `Unit ${currentUnit.unitNumber}`}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono tabular-nums">
                  {currentUnit.topics.length} topics
                </span>
                <button
                  type="button"
                  onClick={() => onSearchUnitTopics(currentUnit)}
                  className="inline-flex items-center gap-1 rounded border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                  <span>Refresh Unit</span>
                </button>
              </div>
            </div>

            {/* Topics List */}
            <div className="space-y-4">
              {currentUnit.topics.map((topic, tIdx) => {
                const topicState = topicVideoResults[topic.id] || { status: 'idle', videos: [] };
                const isLoading = topicState.status === 'loading';
                const isLoaded = topicState.status === 'loaded';
                const isError = topicState.status === 'error';
                const isEmpty = topicState.status === 'empty';

                return (
                  <div
                    key={topic.id}
                    id={`topic-${topic.id}`}
                    className="rounded-md border border-border-subtle bg-surface p-3.5 space-y-2.5"
                  >
                    {/* Topic Name */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-accent font-semibold shrink-0">
                            {currentUnit.unitNumber}.{tIdx + 1}
                          </span>
                          <h3 className="text-xs sm:text-sm font-semibold text-text-main">
                            {topic.topicName}
                          </h3>
                        </div>

                        {topic.subtopics.length > 0 && (
                          <p className="mt-0.5 text-xs text-text-muted pl-6">
                            {topic.subtopics.join(' · ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLoading && (
                          <CircleDashed className="h-3.5 w-3.5 animate-spin text-accent" strokeWidth={1.75} />
                        )}
                        {!isLoading && (
                          <button
                            type="button"
                            onClick={() => onSearchSingleTopic(topic)}
                            title="Retry / Refresh videos for this topic"
                            className="rounded p-1 text-text-muted hover:border hover:border-border-subtle hover:text-text-main transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topic Video Rows */}
                    <div className="pt-1 space-y-2">
                      {/* Loading Skeletons */}
                      {isLoading && (
                        <div className="space-y-2">
                          {[1, 2].map((s) => (
                            <div
                              key={s}
                              className="flex items-center gap-3 rounded-md border border-border-subtle p-2.5 animate-pulse bg-surface-muted/30"
                            >
                              <div className="h-14 w-24 shrink-0 rounded bg-border-subtle" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3.5 w-3/4 rounded bg-border-subtle" />
                                <div className="h-2.5 w-1/3 rounded bg-border-subtle" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Loaded Videos */}
                      {isLoaded && topicState.videos.length > 0 && (
                        <div className="space-y-2">
                          {topicState.videos.map((video, vIdx) => {
                            const isWatched = watchedSet.has(video.id || video.videoId || video.title);
                            return (
                              <VideoCard
                                key={video.id || vIdx}
                                video={video}
                                isWatched={isWatched}
                                onToggleWatched={toggleWatched}
                                isPrimary={vIdx === 0}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Empty State */}
                      {isEmpty && (
                        <div className="rounded border border-dashed border-border-subtle p-3 text-center text-xs text-text-muted">
                          <p>No matching YouTube lectures found with current filters.</p>
                          <button
                            type="button"
                            onClick={() => onSearchSingleTopic(topic)}
                            className="mt-1.5 text-accent hover:underline cursor-pointer"
                          >
                            Retry Search
                          </button>
                        </div>
                      )}

                      {/* Error State */}
                      {isError && (
                        <div className="flex items-center justify-between gap-2 rounded border border-error-border bg-error-bg p-2.5 text-xs text-error-text">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                            <span className="truncate">
                              {topicState.errorMessage || 'Failed to search YouTube videos.'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSearchSingleTopic(topic)}
                            className="rounded border border-error-border bg-surface px-2 py-0.5 text-xs font-medium text-error-text hover:bg-error-bg transition-colors shrink-0 cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Idle State (Prompt to search) */}
                      {topicState.status === 'idle' && (
                        <div className="flex items-center justify-between rounded border border-dashed border-border-subtle p-2.5 text-xs text-text-muted">
                          <span>Pending video search for this topic.</span>
                          <button
                            type="button"
                            onClick={() => onSearchSingleTopic(topic)}
                            className="inline-flex items-center gap-1 rounded bg-surface border border-border-subtle px-2 py-1 text-xs font-medium text-text-main hover:border-accent cursor-pointer"
                          >
                            <Youtube className="h-3 w-3 text-accent" strokeWidth={1.75} />
                            <span>Find Videos</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
