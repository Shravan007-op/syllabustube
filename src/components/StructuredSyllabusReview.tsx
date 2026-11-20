import { useState, KeyboardEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AnalysisStage,
  SearchPreferences,
  StructuredSyllabus,
  StructuredTopic,
  StructuredUnit,
  TopicVideoSearchState,
} from '../types/syllabus';
import { createClientId } from '../utils/syllabusApi';
import { TopicVideoRoadmap } from './TopicVideoRoadmap';

interface StructuredSyllabusReviewProps {
  stage: AnalysisStage;
  syllabus: StructuredSyllabus | null;
  confirmedSyllabus: StructuredSyllabus | null;
  preferences: SearchPreferences;
  topicVideoResults: Record<string, TopicVideoSearchState>;
  isSearchingVideos: boolean;
  isYoutubeConfigured: boolean;
  configurationNotice: string | null;
  preferencesDirty: boolean;
  errorMessage: string | null;
  onUpdateSyllabus: (next: StructuredSyllabus) => void;
  onReanalyse: () => void;
  onConfirmAndContinue: (confirmed: StructuredSyllabus) => void;
  onRefreshAllVideos: () => void;
  onStopVideoSearch: () => void;
  onSearchSingleTopic: (topic: StructuredTopic) => void;
  onEnableFallbackAndRetryTopic: (topic: StructuredTopic) => void;
  onRetry: () => void;
  onGoToUpload: () => void;
}

export function StructuredSyllabusReview({
  stage,
  syllabus,
  confirmedSyllabus,
  preferences,
  topicVideoResults,
  isSearchingVideos,
  isYoutubeConfigured,
  configurationNotice,
  preferencesDirty,
  errorMessage,
  onUpdateSyllabus,
  onReanalyse,
  onConfirmAndContinue,
  onRefreshAllVideos,
  onStopVideoSearch,
  onSearchSingleTopic,
  onEnableFallbackAndRetryTopic,
  onRetry,
  onGoToUpload,
}: StructuredSyllabusReviewProps) {
  const [newTopicByUnit, setNewTopicByUnit] = useState<Record<string, string>>({});
  const [newSubtopicByTopic, setNewSubtopicByTopic] = useState<Record<string, string>>({});
  const [addingSubtopicForId, setAddingSubtopicForId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState<boolean>(false);

  const handleSubjectChange = (subject: string) => {
    if (!syllabus) return;
    onUpdateSyllabus({ ...syllabus, subject });
  };

  const handleSubjectCodeChange = (subjectCode: string) => {
    if (!syllabus) return;
    onUpdateSyllabus({ ...syllabus, subjectCode });
  };

  const handleUnitNameChange = (unitId: string, unitName: string) => {
    if (!syllabus) return;
    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) => (u.id === unitId ? { ...u, unitName } : u)),
    });
  };

  const handleTopicNameChange = (unitId: string, topicId: string, topicName: string) => {
    if (!syllabus) return;
    setValidationError(null);
    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              topics: u.topics.map((t) =>
                t.id === topicId ? { ...t, topicName, needsVerification: false } : t
              ),
            }
          : u
      ),
    });
  };

  const handleDeleteTopic = (unitId: string, topicId: string) => {
    if (!syllabus) return;
    setValidationError(null);
    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) =>
        u.id === unitId
          ? { ...u, topics: u.topics.filter((t) => t.id !== topicId) }
          : u
      ),
    });
  };

  const handleAddTopic = (unitId: string) => {
    if (!syllabus) return;
    const rawName = (newTopicByUnit[unitId] ?? '').trim();
    if (!rawName) return;

    setValidationError(null);
    const nextTopic: StructuredTopic = {
      id: createClientId('topic'),
      topicName: rawName,
      subtopics: [],
    };

    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) =>
        u.id === unitId ? { ...u, topics: [...u.topics, nextTopic] } : u
      ),
    });

    setNewTopicByUnit((prev) => ({ ...prev, [unitId]: '' }));
  };

  const handleAddSubtopic = (unitId: string, topicId: string) => {
    if (!syllabus) return;
    const rawSub = (newSubtopicByTopic[topicId] ?? '').trim();
    if (!rawSub) return;

    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              topics: u.topics.map((t) =>
                t.id === topicId ? { ...t, subtopics: [...t.subtopics, rawSub] } : t
              ),
            }
          : u
      ),
    });

    setNewSubtopicByTopic((prev) => ({ ...prev, [topicId]: '' }));
    setAddingSubtopicForId(null);
  };

  const handleRemoveSubtopic = (unitId: string, topicId: string, subIdx: number) => {
    if (!syllabus) return;
    onUpdateSyllabus({
      ...syllabus,
      units: syllabus.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              topics: u.topics.map((t) =>
                t.id === topicId
                  ? { ...t, subtopics: t.subtopics.filter((_, idx) => idx !== subIdx) }
                  : t
              ),
            }
          : u
      ),
    });
  };

  const handleAddUnit = () => {
    if (!syllabus) return;
    const nextNumber =
      syllabus.units.reduce((max, u) => Math.max(max, u.unitNumber), 0) + 1;
    const nextUnit: StructuredUnit = {
      id: createClientId('unit'),
      unitNumber: nextNumber,
      unitName: '',
      topics: [],
    };
    onUpdateSyllabus({
      ...syllabus,
      units: [...syllabus.units, nextUnit],
    });
  };

  const handleConfirmClick = () => {
    if (!syllabus) return;
    const cleanedUnits = syllabus.units
      .map((u) => ({
        ...u,
        unitName: u.unitName.trim(),
        topics: u.topics
          .map((t) => ({ ...t, topicName: t.topicName.trim() }))
          .filter((t) => t.topicName.length > 0),
      }))
      .filter((u) => u.topics.length > 0);

    if (cleanedUnits.length === 0) {
      setValidationError(
        'Please keep or add at least one topic before confirming your syllabus.'
      );
      return;
    }

    setValidationError(null);
    const cleanedSyllabus: StructuredSyllabus = {
      ...syllabus,
      subject: syllabus.subject.trim(),
      subjectCode: syllabus.subjectCode.trim(),
      units: cleanedUnits,
    };
    onUpdateSyllabus(cleanedSyllabus);
    onConfirmAndContinue(cleanedSyllabus);
  };

  const handleKeySubmit = (e: KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const activeData = stage === 'confirmed' ? confirmedSyllabus : syllabus;
  const totalTopicsCount = activeData
    ? activeData.units.reduce((sum, u) => sum + u.topics.length, 0)
    : 0;
  const totalSubtopicsCount = activeData
    ? activeData.units.reduce(
        (sum, u) => sum + u.topics.reduce((tSum, t) => tSum + t.subtopics.length, 0),
        0
      )
    : 0;

  return (
    <section id="roadmap-section" className="bg-slate-50/50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* STATE 1: IDLE / EMPTY */}
        {stage === 'idle' && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#0F1E3D]">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0B1528]">
              Your Learning Playlist Will Appear Here
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Upload a PDF, JPG, or PNG syllabus above — or paste syllabus text directly — and SyllabusTube will automatically extract your topics and find matching YouTube lecture recommendations.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onGoToUpload}
                className="rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
              >
                Upload or Enter Syllabus
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: ANALYSING (LOADING) */}
        {stage === 'analysing' && (
          <div
            aria-busy="true"
            aria-label="Analysing syllabus and preparing YouTube recommendations"
            className="space-y-6"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0F1E3D] border-t-transparent" />
                <span className="text-sm font-semibold text-[#0F1E3D]">
                  Analysing syllabus topics to build your YouTube learning playlist...
                </span>
              </div>
              <div className="mt-5 h-7 w-72 max-w-full animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-100" />
            </div>

            {[1, 2].map((skeletonUnit) => (
              <div
                key={skeletonUnit}
                className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
                <div className="space-y-2.5">
                  <div className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-11 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATE 3: ERROR */}
        {stage === 'error' && (
          <div
            role="alert"
            className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 sm:p-10 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0B1528]">
              Unable to Analyse Syllabus
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {errorMessage ??
                'We could not structure the provided syllabus text. Please check that your syllabus contains readable topics and try again.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry Analysis</span>
              </button>
              <button
                type="button"
                onClick={onGoToUpload}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Edit Syllabus Input
              </button>
            </div>
          </div>
        )}

        {/* STATE 4 & 5: PRIMARY LEARNING PLAYLIST + COLLAPSIBLE SYLLABUS ANALYSIS BELOW */}
        {(stage === 'confirmed' || stage === 'review') &&
          (confirmedSyllabus || syllabus) && (
            <div className="space-y-10">
              {/* PRIMARY SECTION: YOUTUBE VIDEO RECOMMENDATIONS */}
              <TopicVideoRoadmap
                syllabus={confirmedSyllabus ?? syllabus!}
                preferences={preferences}
                topicVideoResults={topicVideoResults}
                isSearching={isSearchingVideos}
                isYoutubeConfigured={isYoutubeConfigured}
                configurationNotice={configurationNotice}
                preferencesDirty={preferencesDirty}
                onReanalyse={onReanalyse}
                onRefreshAllVideos={onRefreshAllVideos}
                onStopSearch={onStopVideoSearch}
                onSearchSingleTopic={onSearchSingleTopic}
                onEnableFallbackAndRetryTopic={onEnableFallbackAndRetryTopic}
              />

              {/* SECONDARY COLLAPSIBLE SECTION: VIEW SYLLABUS ANALYSIS */}
              {syllabus && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isAnalysisExpanded}
                    aria-controls="collapsible-syllabus-analysis"
                    onClick={() => setIsAnalysisExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="h-5 w-5 mt-0.5 shrink-0 text-[#0F1E3D]" />
                      <div className="min-w-0">
                        <span className="block text-base sm:text-lg font-bold text-[#0B1528]">
                          View syllabus analysis
                        </span>
                        <span className="mt-0.5 block text-xs sm:text-sm text-slate-600 tabular-nums">
                          {syllabus.subject || 'Extracted Syllabus'}
                          {syllabus.subjectCode ? ` (${syllabus.subjectCode})` : ''} ·{' '}
                          {syllabus.units.length}{' '}
                          {syllabus.units.length === 1 ? 'Unit' : 'Units'} ·{' '}
                          {totalTopicsCount}{' '}
                          {totalTopicsCount === 1 ? 'Topic' : 'Topics'}
                          {totalSubtopicsCount > 0
                            ? ` · ${totalSubtopicsCount} Subtopics`
                            : ''}
                          {syllabus.isIncomplete || syllabus.verificationFlags.length > 0
                            ? ' · Review flagged notes inside'
                            : ''}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3D] whitespace-nowrap shrink-0">
                      <span>{isAnalysisExpanded ? 'Hide' : 'Inspect & Edit'}</span>
                      {isAnalysisExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {isAnalysisExpanded && (
                    <div
                      id="collapsible-syllabus-analysis"
                      className="border-t border-slate-200 bg-slate-50/40 p-5 sm:p-6 space-y-6"
                    >
                      {/* Incomplete / Verification Flag Notice */}
                      {(syllabus.isIncomplete || syllabus.verificationFlags.length > 0) && (
                        <div
                          role="status"
                          className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-sm text-amber-950"
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-700" />
                            <div className="space-y-1.5">
                              <p className="font-semibold">
                                Flagged sections from syllabus extraction
                              </p>
                    {syllabus.isIncomplete && (
                      <p className="text-xs text-amber-900">
                        Parts of the uploaded or entered text appeared incomplete or truncated. Review and add any missing topics below.
                      </p>
                    )}
                    {syllabus.verificationFlags.length > 0 && (
                      <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1">
                        {syllabus.verificationFlags.map((flag, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{flag.location}:</span>{' '}
                            {flag.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Editable Subject Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>{syllabus.sourceLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {syllabus.units.length}{' '}
                      {syllabus.units.length === 1 ? 'Unit' : 'Units'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {totalTopicsCount} {totalTopicsCount === 1 ? 'Topic' : 'Topics'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-8">
                      <label
                        htmlFor="editable-subject-name"
                        className="block text-xs font-semibold text-slate-600 mb-1.5"
                      >
                        Subject Name
                      </label>
                      <input
                        id="editable-subject-name"
                        type="text"
                        value={syllabus.subject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        placeholder="Not specified in syllabus — enter subject name"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-lg font-bold text-[#0B1528] placeholder:font-normal placeholder:text-sm placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label
                        htmlFor="editable-subject-code"
                        className="block text-xs font-semibold text-slate-600 mb-1.5"
                      >
                        Subject Code
                      </label>
                      <input
                        id="editable-subject-code"
                        type="text"
                        value={syllabus.subjectCode}
                        onChange={(e) => handleSubjectCodeChange(e.target.value)}
                        placeholder="Optional (e.g. CS301)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base font-semibold text-[#0F1E3D] placeholder:font-sans placeholder:font-normal placeholder:text-sm placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 lg:pt-6">
                  <button
                    type="button"
                    onClick={onReanalyse}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-analyse Syllabus</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClick}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Topics &amp; Continue</span>
                  </button>
                </div>
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Editable Units List */}
            <div className="space-y-6">
              {syllabus.units.map((unit) => (
                <div
                  key={unit.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  {/* Editable Unit Heading */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="font-mono text-xs font-semibold text-[#1D4ED8] whitespace-nowrap shrink-0">
                        Unit {String(unit.unitNumber).padStart(2, '0')}
                      </span>
                      <label htmlFor={`unit-name-${unit.id}`} className="sr-only">
                        Unit {unit.unitNumber} Name
                      </label>
                      <input
                        id={`unit-name-${unit.id}`}
                        type="text"
                        value={unit.unitName}
                        onChange={(e) => handleUnitNameChange(unit.id, e.target.value)}
                        placeholder={`Unit ${unit.unitNumber} heading (optional)`}
                        className="flex-1 rounded-lg border border-transparent bg-slate-50/70 px-3 py-1.5 text-base sm:text-lg font-bold text-[#0B1528] placeholder:font-normal placeholder:text-sm placeholder:text-slate-400 hover:border-slate-200 focus:border-[#0F1E3D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/15"
                      />
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                      {unit.topics.length} {unit.topics.length === 1 ? 'topic' : 'topics'}
                    </span>
                  </div>

                  {/* Topics Under Unit */}
                  <div className="mt-4 space-y-3">
                    {unit.topics.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-xs text-slate-500 text-center">
                        No topics in this unit yet. Add a topic below.
                      </p>
                    ) : (
                      unit.topics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                            topic.needsVerification
                              ? 'border-amber-300 bg-amber-50/40'
                              : 'border-slate-200 bg-slate-50/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-2 font-mono text-xs font-semibold text-slate-500 tabular-nums shrink-0">
                              {unit.unitNumber}.{tIdx + 1}
                            </span>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <label htmlFor={`topic-name-${topic.id}`} className="sr-only">
                                  Topic name
                                </label>
                                <input
                                  id={`topic-name-${topic.id}`}
                                  type="text"
                                  value={topic.topicName}
                                  onChange={(e) =>
                                    handleTopicNameChange(unit.id, topic.id, e.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0B1528] focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/15"
                                />
                              </div>

                              {topic.needsVerification && (
                                <p className="text-xs font-medium text-amber-800">
                                  Flagged for verification — edit the text above if needed.
                                </p>
                              )}

                              {/* Subtopics */}
                              {topic.subtopics.length > 0 && (
                                <ul className="space-y-1.5 pl-1 pt-1">
                                  {topic.subtopics.map((sub, subIdx) => (
                                    <li
                                      key={`${topic.id}-sub-${subIdx}`}
                                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                                    >
                                      <span className="min-w-0 break-words">{sub}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveSubtopic(unit.id, topic.id, subIdx)
                                        }
                                        aria-label={`Remove subtopic ${sub}`}
                                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer shrink-0"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* Inline Add Subtopic */}
                              {addingSubtopicForId === topic.id ? (
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={newSubtopicByTopic[topic.id] ?? ''}
                                    onChange={(e) =>
                                      setNewSubtopicByTopic((prev) => ({
                                        ...prev,
                                        [topic.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) =>
                                      handleKeySubmit(e, () =>
                                        handleAddSubtopic(unit.id, topic.id)
                                      )
                                    }
                                    placeholder="Enter subtopic name..."
                                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddSubtopic(unit.id, topic.id)}
                                    className="rounded-lg bg-[#0F1E3D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#162B54] cursor-pointer whitespace-nowrap"
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingSubtopicForId(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAddingSubtopicForId(topic.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#0F1E3D] cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add subtopic</span>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(unit.id, topic.id)}
                              aria-label={`Delete topic ${topic.topicName}`}
                              className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Topic Manually */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-100">
                    <label htmlFor={`add-topic-${unit.id}`} className="sr-only">
                      Add topic to Unit {unit.unitNumber}
                    </label>
                    <input
                      id={`add-topic-${unit.id}`}
                      type="text"
                      value={newTopicByUnit[unit.id] ?? ''}
                      onChange={(e) =>
                        setNewTopicByUnit((prev) => ({
                          ...prev,
                          [unit.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleKeySubmit(e, () => handleAddTopic(unit.id))}
                      placeholder={`Add a topic manually to Unit ${unit.unitNumber}...`}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/15"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTopic(unit.id)}
                      disabled={!(newTopicByUnit[unit.id] ?? '').trim()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#0B1528] hover:border-[#0F1E3D] hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Topic</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <button
                type="button"
                onClick={handleAddUnit}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap cursor-pointer self-start"
              >
                <Plus className="h-4 w-4" />
                <span>Add Unit</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onReanalyse}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Re-analyse Syllabus</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmClick();
                    setIsAnalysisExpanded(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#162B54] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Edits &amp; Update Playlist</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
      </div>
    </section>
  );
}
