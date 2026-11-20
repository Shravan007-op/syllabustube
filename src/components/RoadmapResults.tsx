import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  FolderOpen,
  Info,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  ResultsViewState,
  SearchPreferences,
  SyllabusDataset,
} from '../types/syllabus';
import { rankTopicVideos } from '../utils/rankingEngine';
import { VideoCard } from './VideoCard';

interface RoadmapResultsProps {
  dataset: SyllabusDataset | null;
  preferences: SearchPreferences;
  viewState: ResultsViewState;
  errorMessage: string | null;
  onRetryAnalysis: () => void;
  onGoToUpload: () => void;
  onResetPreferences: () => void;
}

export function RoadmapResults({
  dataset,
  preferences,
  viewState,
  errorMessage,
  onRetryAnalysis,
  onGoToUpload,
  onResetPreferences,
}: RoadmapResultsProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [topicFilterQuery, setTopicFilterQuery] = useState('');

  useEffect(() => {
    setSelectedUnitId('all');
    setTopicFilterQuery('');
  }, [dataset?.id, dataset?.sourceLabel]);

  const rankedRoadmap = useMemo(() => {
    if (!dataset) return null;

    const queryLower = topicFilterQuery.trim().toLowerCase();

    const units = dataset.units
      .filter((u) => selectedUnitId === 'all' || u.id === selectedUnitId)
      .map((unit) => {
        const topics = unit.topics
          .filter((t) => {
            if (!queryLower) return true;
            return (
              t.title.toLowerCase().includes(queryLower) ||
              t.description.toLowerCase().includes(queryLower) ||
              t.keywords.some((k) => k.toLowerCase().includes(queryLower))
            );
          })
          .map((topic) => ({
            ...topic,
            rankedVideos: rankTopicVideos(topic.videos, preferences, topic.title),
          }));

        return {
          ...unit,
          topics,
        };
      })
      .filter((u) => u.topics.length > 0);

    const totalVideos = units.reduce(
      (sum, u) => sum + u.topics.reduce((tSum, t) => tSum + t.rankedVideos.length, 0),
      0
    );

    const totalTopics = units.reduce((sum, u) => sum + u.topics.length, 0);

    return {
      units,
      totalVideos,
      totalTopics,
    };
  }, [dataset, preferences, selectedUnitId, topicFilterQuery]);

  // Effective empty check when ready but zero topics or no syllabus uploaded yet
  const isEffectiveEmpty =
    viewState === 'empty' ||
    (viewState === 'ready' && (!dataset || !rankedRoadmap || rankedRoadmap.totalTopics === 0));

  return (
    <section id="roadmap-section" className="bg-slate-50/50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sample Results Notice when a syllabus is active */}
        {dataset && viewState === 'ready' && (
          <div className="mb-8 flex items-start sm:items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5 text-sm text-slate-700">
            <Info className="h-4 w-4 mt-0.5 sm:mt-0 shrink-0 text-[#0F1E3D]" />
            <p>
              <span className="font-semibold text-[#0B1528]">Sample Results Preview:</span>{' '}
              Showing structured topic results ranked by your preferences. Live YouTube API integration will connect in the next stage.
            </p>
          </div>
        )}

        {/* STATE 1: LOADING SKELETON */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Analysing syllabus and ranking videos">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-8 w-80 max-w-full animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="hidden lg:block lg:col-span-3 space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
              <div className="lg:col-span-9 space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((card) => (
                    <div
                      key={card}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="aspect-video w-full animate-pulse bg-slate-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: ERROR STATE */}
        {viewState === 'error' && (
          <div
            role="alert"
            className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 sm:p-10 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0B1528]">
              Unable to Process Syllabus
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {errorMessage ??
                'We could not extract structured units from the provided input. Check that your file is a valid PDF, JPG, or PNG, or review your syllabus text.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRetryAnalysis}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onGoToUpload}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Back to Syllabus Upload
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: EMPTY STATE */}
        {viewState !== 'loading' && viewState !== 'error' && isEffectiveEmpty && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#0F1E3D]">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0B1528]">
              {topicFilterQuery.trim()
                ? 'No Matching Syllabus Topics Found'
                : 'Your Learning Roadmap Will Appear Here'}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {topicFilterQuery.trim()
                ? `No topics matched "${topicFilterQuery}". Clear your search filter or switch to All Units.`
                : 'Upload a PDF, JPG, or PNG syllabus file above — or switch to Enter Syllabus Text — and click Upload & Analyse to generate your unit-by-unit video roadmap.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {topicFilterQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilterQuery('');
                    setSelectedUnitId('all');
                  }}
                  className="rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
                >
                  Clear Topic Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoToUpload}
                  className="rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
                >
                  Upload or Enter Syllabus
                </button>
              )}
              {topicFilterQuery.trim() && (
                <button
                  type="button"
                  onClick={onResetPreferences}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Reset Search Preferences
                </button>
              )}
            </div>
          </div>
        )}

        {/* STATE 4: POPULATED ROADMAP RESULTS */}
        {viewState === 'ready' && dataset && rankedRoadmap && rankedRoadmap.totalTopics > 0 && (
          <div>
            {/* Subject Heading Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                    <span className="font-mono font-semibold text-[#0F1E3D]">
                      {dataset.subjectCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{dataset.department}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dataset.semesterLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dataset.sourceLabel}</span>
                  </div>

                  <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1528]">
                    {dataset.subjectTitle}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums">
                    <span>
                      <strong className="font-semibold text-[#0B1528]">
                        {dataset.units.length}
                      </strong>{' '}
                      {dataset.units.length === 1 ? 'Unit' : 'Units'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong className="font-semibold text-[#0B1528]">
                        {rankedRoadmap.totalTopics}
                      </strong>{' '}
                      {rankedRoadmap.totalTopics === 1 ? 'Topic' : 'Topics'} shown
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong className="font-semibold text-[#0B1528]">
                        {rankedRoadmap.totalVideos}
                      </strong>{' '}
                      Curated videos ({preferences.videosPerTopic}/topic max)
                    </span>
                  </div>
                </div>

                {/* Topic Search Filter */}
                <div className="w-full lg:w-72">
                  <label htmlFor="topic-search-input" className="sr-only">
                    Filter syllabus topics
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="topic-search-input"
                      type="search"
                      value={topicFilterQuery}
                      onChange={(e) => setTopicFilterQuery(e.target.value)}
                      placeholder="Filter topics or keywords..."
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile / Tablet Horizontal Unit Tabs */}
              <div className="mt-6 flex lg:hidden items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedUnitId('all')}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    selectedUnitId === 'all'
                      ? 'bg-[#0F1E3D] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All Units
                </button>
                {dataset.units.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      selectedUnitId === unit.id
                        ? 'bg-[#0F1E3D] text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Unit {unit.unitNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Column Desktop Layout: Unit Outline Sidebar + Topic Video Sections */}
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Sidebar: Unit Navigation */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 px-2 pb-3 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <BookOpen className="h-3.5 w-3.5 text-[#0F1E3D]" />
                    <span>Unit Outline</span>
                  </div>

                  <nav aria-label="Syllabus Units" className="mt-3 space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedUnitId('all')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                        selectedUnitId === 'all'
                          ? 'bg-[#0F1E3D] text-white'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#0B1528]'
                      }`}
                    >
                      <span>All Units</span>
                      <span className="font-mono text-xs tabular-nums opacity-80">
                        {dataset.units.length}
                      </span>
                    </button>

                    {dataset.units.map((unit) => {
                      const active = selectedUnitId === unit.id;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0F1E3D] text-white'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-[#0B1528]'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between text-xs font-semibold">
                            <span>Unit {unit.unitNumber}</span>
                            <span className="font-mono tabular-nums opacity-75">
                              {unit.topics.length}{' '}
                              {unit.topics.length === 1 ? 'topic' : 'topics'}
                            </span>
                          </div>
                          <span
                            className={`mt-0.5 line-clamp-1 text-xs ${
                              active ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            {unit.title}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {/* Main Column: Unit-wise Topic Organisation */}
              <div className="lg:col-span-9 space-y-10">
                {rankedRoadmap.units.map((unit) => (
                  <section
                    key={unit.id}
                    aria-labelledby={`unit-heading-${unit.id}`}
                    className="space-y-6"
                  >
                    {/* Unit Header */}
                    <div className="border-b border-slate-200 pb-4">
                      <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                        Unit {String(unit.unitNumber).padStart(2, '0')}
                      </span>
                      <h3
                        id={`unit-heading-${unit.id}`}
                        className="mt-1 text-xl sm:text-2xl font-bold text-[#0B1528]"
                      >
                        {unit.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{unit.overview}</p>
                    </div>

                    {/* Individual Topic Sections */}
                    <div className="space-y-8">
                      {unit.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100">
                            <div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                <span className="font-mono font-semibold text-[#0F1E3D]">
                                  Topic {topic.topicCode}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{topic.keywords.join(' · ')}</span>
                              </div>
                              <h4 className="mt-1.5 text-lg font-bold text-[#0B1528]">
                                {topic.title}
                              </h4>
                              <p className="mt-1 text-sm text-slate-600">{topic.description}</p>
                            </div>
                            <span className="font-mono text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                              {topic.rankedVideos.length}{' '}
                              {topic.rankedVideos.length === 1 ? 'video' : 'videos'}
                            </span>
                          </div>

                          {/* Topic Video Grid or Per-Topic Empty Fallback Notice */}
                          {topic.rankedVideos.length > 0 ? (
                            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                              {topic.rankedVideos.map((video) => (
                                <VideoCard
                                  key={video.id}
                                  video={video}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                              <p className="text-sm font-semibold text-[#0B1528]">
                                No videos matched your strict channel or language filters for this topic.
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Enable &ldquo;Allow Fallback Channels&rdquo; or select additional languages in Preferences to view more results.
                              </p>
                              <button
                                type="button"
                                onClick={onResetPreferences}
                                className="mt-3 rounded-lg bg-[#0F1E3D] px-4 py-2 text-xs font-medium text-white hover:bg-[#162B54] transition-colors cursor-pointer"
                              >
                                Reset Preferences
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
