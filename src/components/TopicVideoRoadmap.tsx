import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Link2,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  Youtube,
} from 'lucide-react';
import type {
  SearchPreferences,
  StructuredSyllabus,
  StructuredTopic,
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
  preferencesDirty: boolean;
  onReanalyse: () => void;
  onRefreshAllVideos: () => void;
  onStopSearch: () => void;
  onSearchSingleTopic: (topic: StructuredTopic) => void;
  onEnableFallbackAndRetryTopic: (topic: StructuredTopic) => void;
}

export function TopicVideoRoadmap({
  syllabus,
  preferences,
  topicVideoResults,
  isSearching,
  isYoutubeConfigured,
  configurationNotice,
  preferencesDirty,
  onReanalyse,
  onRefreshAllVideos,
  onStopSearch,
  onSearchSingleTopic,
  onEnableFallbackAndRetryTopic,
}: TopicVideoRoadmapProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>('');

  const stats = useMemo(() => {
    let totalTopics = 0;
    let completedSearches = 0;
    let loadingTopics = 0;
    let topicsWithVideos = 0;
    let totalVideos = 0;

    for (const unit of syllabus.units) {
      for (const topic of unit.topics) {
        totalTopics += 1;
        const entry = topicVideoResults[topic.id];
        if (!entry) continue;
        if (entry.status === 'loading') {
          loadingTopics += 1;
        } else if (entry.status !== 'idle') {
          completedSearches += 1;
        }
        if (entry.status === 'loaded' && entry.videos.length > 0) {
          topicsWithVideos += 1;
          totalVideos += entry.videos.length;
        }
      }
    }

    const progressPercent =
      totalTopics > 0 ? Math.round((completedSearches / totalTopics) * 100) : 0;

    return {
      totalTopics,
      completedSearches,
      loadingTopics,
      topicsWithVideos,
      totalVideos,
      progressPercent,
    };
  }, [syllabus, topicVideoResults]);

  const filteredUnits = useMemo(() => {
    const query = topicFilter.trim().toLowerCase();
    return syllabus.units
      .filter((unit) => selectedUnitId === 'all' || unit.id === selectedUnitId)
      .map((unit) => {
        if (!query) return unit;
        const matchingTopics = unit.topics.filter((t) => {
          if (t.topicName.toLowerCase().includes(query)) return true;
          return t.subtopics.some((s) => s.toLowerCase().includes(query));
        });
        return { ...unit, topics: matchingTopics };
      })
      .filter((unit) => unit.topics.length > 0);
  }, [syllabus.units, selectedUnitId, topicFilter]);

  const allTopicOptions = useMemo(() => {
    const list: Array<{ id: string; label: string; unitId: string }> = [];
    syllabus.units.forEach((unit) => {
      unit.topics.forEach((topic, tIdx) => {
        list.push({
          id: topic.id,
          unitId: unit.id,
          label: `${unit.unitNumber}.${tIdx + 1} ${topic.topicName}`,
        });
      });
    });
    return list;
  }, [syllabus.units]);

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    if (unitId !== 'all') {
      const el = document.getElementById(`roadmap-unit-${unitId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleJumpToTopic = (topicId: string, unitId?: string) => {
    if (unitId && selectedUnitId !== 'all' && selectedUnitId !== unitId) {
      setSelectedUnitId('all');
    }
    setTopicFilter('');
    setActiveTopicId(topicId);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`roadmap-topic-${topicId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const showConfigEmptyState = !isYoutubeConfigured || Boolean(configurationNotice);

  return (
    <div className="space-y-6">
      {/* Primary Playlist Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            {(syllabus.subject || syllabus.subjectCode) && (
              <p className="text-xs sm:text-sm font-medium text-[#1D4ED8]">
                <span>{syllabus.subject || 'Syllabus Subject'}</span>
                {syllabus.subjectCode ? (
                  <span className="ml-2 font-mono text-slate-500">
                    {syllabus.subjectCode}
                  </span>
                ) : null}
              </p>
            )}

            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1528]"
              style={{ textWrap: 'balance' }}
            >
              Your Learning Playlist
            </h2>

            <p className="text-sm text-slate-600 max-w-2xl">
              Recommended YouTube lectures organised by your syllabus units and topics — best match first, alternatives below.
            </p>

            {/* Accurate Calculated Coverage Metrics */}
            <div className="pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-600 tabular-nums">
              <span>
                {syllabus.units.length}{' '}
                {syllabus.units.length === 1 ? 'Unit' : 'Units'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {stats.totalTopics} {stats.totalTopics === 1 ? 'Topic' : 'Topics'}
              </span>
              {!showConfigEmptyState && stats.completedSearches > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#0B1528]">
                    {stats.topicsWithVideos}/{stats.totalTopics} topics covered
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {stats.totalVideos}{' '}
                    {stats.totalVideos === 1 ? 'video' : 'videos'} recommended
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onReanalyse}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Re-analyse Syllabus</span>
            </button>

            {isSearching ? (
              <button
                type="button"
                onClick={onStopSearch}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop Search</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRefreshAllVideos}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Youtube className="h-4 w-4" />
                <span>
                  {stats.completedSearches > 0 ? 'Refresh Videos' : 'Find Videos'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Active Preferences & Search Progress */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#0F1E3D]" />
              <span className="font-semibold text-[#0B1528]">Active Preferences:</span>
              <span>{preferences.preferredCountry}</span>
              <span aria-hidden="true">·</span>
              <span>
                {preferences.languages.length > 0
                  ? preferences.languages.join(', ')
                  : 'All Languages'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Up to {preferences.videosPerTopic} videos/topic
              </span>
              {preferences.prioritizeIndianChannels && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Indian educators prioritised</span>
                </>
              )}
              {preferences.preferredChannels.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Channels: {preferences.preferredChannels.join(', ')}</span>
                </>
              )}
            </div>

            {isSearching && (
              <span className="font-mono text-xs font-medium text-[#0F1E3D] tabular-nums">
                Searching {stats.completedSearches}/{stats.totalTopics} topics...
              </span>
            )}
          </div>

          {isSearching && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0F1E3D] transition-all duration-300"
                  style={{ width: `${Math.max(stats.progressPercent, 6)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Fetching real YouTube Data API v3 matches topic-by-topic ({stats.loadingTopics}{' '}
                active)...
              </p>
            </div>
          )}

          {preferencesDirty && !isSearching && !showConfigEmptyState && (
            <div
              role="status"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-950"
            >
              <span>
                Search preferences changed above. Refresh your learning playlist to apply updated language, channel, or count settings.
              </span>
              <button
                type="button"
                onClick={onRefreshAllVideos}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F1E3D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Apply &amp; Refresh Playlist</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Honest Empty State When YouTube Integration Is Not Configured */}
      {showConfigEmptyState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#0F1E3D]">
            <Link2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg sm:text-xl font-bold text-[#0B1528]">
            YouTube Video Search Is Not Configured Yet
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 leading-relaxed">
            {configurationNotice ||
              'Video recommendations will appear here once the YouTube Data API integration is configured in your Google Apps Script backend (YOUTUBE_API_KEY) and VITE_APPS_SCRIPT_URL is set.'}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-500">
            Your extracted syllabus units and topics are ready below inside &ldquo;View syllabus analysis&rdquo;.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onRefreshAllVideos}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Check Connection &amp; Retry</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Playlist Content: Topic Switcher Sidebar + Unit/Topic Video Recommendations */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Desktop Topic Switcher Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 max-h-[calc(100vh-7rem)] flex flex-col">
              <label htmlFor="roadmap-topic-filter" className="sr-only">
                Filter syllabus topics
              </label>
              <div className="relative shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="roadmap-topic-filter"
                  type="text"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="Find topic..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 overflow-y-auto pr-1 space-y-4">
                <div>
                  <p className="px-2 text-xs font-semibold text-slate-500">
                    Filter by Unit
                  </p>
                  <div className="mt-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectUnit('all')}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                        selectedUnitId === 'all'
                          ? 'bg-[#0F1E3D] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Units</span>
                      <span className="font-mono tabular-nums opacity-80">
                        {stats.totalTopics}
                      </span>
                    </button>

                    {syllabus.units.map((unit) => {
                      const active = selectedUnitId === unit.id;
                      const unitCovered = unit.topics.filter(
                        (t) =>
                          topicVideoResults[t.id]?.status === 'loaded' &&
                          topicVideoResults[t.id].videos.length > 0
                      ).length;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleSelectUnit(unit.id)}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0F1E3D] text-white font-medium'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="line-clamp-1">
                            <span
                              className={`mr-1.5 font-mono font-semibold ${
                                active ? 'text-slate-200' : 'text-[#1D4ED8]'
                              }`}
                            >
                              {String(unit.unitNumber).padStart(2, '0')}
                            </span>
                            {unit.unitName || `Unit ${unit.unitNumber}`}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums opacity-80 shrink-0">
                            {unitCovered}/{unit.topics.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Topic Switcher */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="px-2 text-xs font-semibold text-slate-500">
                    Jump to Topic
                  </p>
                  <nav className="mt-1.5 space-y-1" aria-label="Topic quick navigation">
                    {syllabus.units.map((unit) =>
                      unit.topics.map((topic, tIdx) => {
                        const tState = topicVideoResults[topic.id];
                        const countLabel =
                          tState?.status === 'loading'
                            ? '...'
                            : tState?.status === 'loaded'
                              ? String(tState.videos.length)
                              : tState?.status === 'empty'
                                ? '0'
                                : '—';
                        const isActive = activeTopicId === topic.id;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleJumpToTopic(topic.id, unit.id)}
                            className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-slate-100 font-semibold text-[#0B1528]'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-[#0B1528]'
                            }`}
                          >
                            <span className="line-clamp-2">
                              <span className="mr-1 font-mono text-[11px] text-[#1D4ED8]">
                                {unit.unitNumber}.{tIdx + 1}
                              </span>
                              {topic.topicName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0 mt-0.5">
                              {countLabel}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </nav>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Topic Filter & Switcher */}
          <div className="lg:hidden space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="Find topic..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none"
                />
              </div>

              <select
                aria-label="Jump to topic"
                value={activeTopicId ?? ''}
                onChange={(e) => {
                  const chosen = allTopicOptions.find((t) => t.id === e.target.value);
                  if (chosen) handleJumpToTopic(chosen.id, chosen.unitId);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0B1528] focus:border-[#0F1E3D] focus:outline-none cursor-pointer"
              >
                <option value="">Jump to topic...</option>
                {allTopicOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedUnitId('all')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedUnitId === 'all'
                    ? 'border-[#0F1E3D] bg-[#0F1E3D] text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                All Units
              </button>
              {syllabus.units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedUnitId === unit.id
                      ? 'border-[#0F1E3D] bg-[#0F1E3D] text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Unit {String(unit.unitNumber).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Video Recommendations Stream */}
          <div className="lg:col-span-9 space-y-10">
            {filteredUnits.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium text-[#0B1528]">
                  No syllabus topics match &ldquo;{topicFilter}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter('');
                    setSelectedUnitId('all');
                  }}
                  className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              filteredUnits.map((unit) => (
                <section
                  key={unit.id}
                  id={`roadmap-unit-${unit.id}`}
                  className="scroll-mt-24 space-y-5"
                >
                  {/* Unit Heading */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                        Unit {String(unit.unitNumber).padStart(2, '0')}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#0B1528]">
                        {unit.unitName || `Unit ${unit.unitNumber}`}
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                      {unit.topics.length}{' '}
                      {unit.topics.length === 1 ? 'topic' : 'topics'}
                    </span>
                  </div>

                  {/* Topic Recommendation Sections */}
                  <div className="space-y-6">
                    {unit.topics.map((topic, tIdx) => {
                      const state = topicVideoResults[topic.id] ?? {
                        status: 'idle',
                        videos: [],
                      };
                      const bestVideo =
                        state.status === 'loaded' && state.videos.length > 0
                          ? state.videos[0]
                          : null;
                      const alternativeVideos =
                        state.status === 'loaded' && state.videos.length > 1
                          ? state.videos.slice(1)
                          : [];

                      return (
                        <div
                          key={topic.id}
                          id={`roadmap-topic-${topic.id}`}
                          className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                          {/* Topic Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2.5">
                                <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums shrink-0">
                                  {unit.unitNumber}.{tIdx + 1}
                                </span>
                                <h4 className="text-base sm:text-lg font-bold text-[#0B1528] leading-snug">
                                  {topic.topicName}
                                </h4>
                              </div>

                              {topic.subtopics.length > 0 && (
                                <p className="mt-1.5 pl-8 text-xs text-slate-600 leading-relaxed">
                                  {topic.subtopics.join(' · ')}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 pl-8 sm:pl-0 shrink-0">
                              {state.status === 'loaded' && (
                                <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                                  {state.videos.length}{' '}
                                  {state.videos.length === 1 ? 'video' : 'videos'}
                                </span>
                              )}
                              {state.status !== 'loading' && (
                                <button
                                  type="button"
                                  onClick={() => onSearchSingleTopic(topic)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>
                                    {state.status === 'idle' ? 'Find Videos' : 'Refresh'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Topic Video Content */}
                          <div className="mt-5">
                            {/* 1. IDLE */}
                            {state.status === 'idle' && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4">
                                <p className="text-xs sm:text-sm text-slate-600">
                                  Video search paused or pending for this topic.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => onSearchSingleTopic(topic)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F1E3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  <span>Find Videos</span>
                                </button>
                              </div>
                            )}

                            {/* 2. LOADING SKELETON */}
                            {state.status === 'loading' && (
                              <div
                                aria-busy="true"
                                aria-label={`Searching YouTube recommendations for ${topic.topicName}`}
                                className="space-y-4"
                              >
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white md:grid md:grid-cols-12">
                                  <div className="aspect-video w-full animate-pulse bg-slate-200 md:col-span-5 md:h-full" />
                                  <div className="space-y-3 p-5 md:col-span-7">
                                    <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                                    <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                                    <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
                                    <div className="h-9 w-40 animate-pulse rounded bg-slate-200" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 3. LOADED: BEST RECOMMENDATION FIRST, ALTERNATIVES BELOW */}
                            {state.status === 'loaded' && bestVideo && (
                              <div className="space-y-6">
                                {/* Best Matching Video */}
                                <VideoCard
                                  video={bestVideo}
                                  topic={topic}
                                  variant="featured"
                                />

                                {/* Alternative Videos Below */}
                                {alternativeVideos.length > 0 && (
                                  <div className="pt-4 border-t border-slate-100 space-y-3">
                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      Alternative Videos
                                    </h5>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      {alternativeVideos.map((altVideo, idx) => (
                                        <VideoCard
                                          key={altVideo.id}
                                          video={altVideo}
                                          topic={topic}
                                          variant="alternative"
                                          alternativeIndex={idx + 1}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {state.queryUsed && (
                                  <p className="text-[11px] font-mono text-slate-400">
                                    YouTube query: {state.queryUsed}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 4. EMPTY STATE */}
                            {state.status === 'empty' && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center sm:text-left">
                                <p className="text-sm font-semibold text-[#0B1528]">
                                  No matching YouTube videos found under your current filters
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  Try relaxing language or channel filters, or retry searching this topic.
                                </p>
                                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                  {!preferences.allowFallbackChannels && (
                                    <button
                                      type="button"
                                      onClick={() => onEnableFallbackAndRetryTopic(topic)}
                                      className="rounded-lg bg-[#0F1E3D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
                                    >
                                      Allow Fallback Channels &amp; Retry
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onSearchSingleTopic(topic)}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  >
                                    Retry Topic Search
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 5. ERROR STATE */}
                            {state.status === 'error' && (
                              <div
                                role="alert"
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm text-red-900"
                              >
                                <div className="flex items-start gap-2.5">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                                  <p className="text-xs sm:text-sm">
                                    {state.errorMessage ??
                                      'Unable to fetch YouTube recommendations for this topic.'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onSearchSingleTopic(topic)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Retry Topic</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
