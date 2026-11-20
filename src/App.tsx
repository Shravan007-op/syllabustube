import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_CONFIG, resolveUserError, UserFriendlyError } from './config';
import type {
  AnalysisStage,
  ExtractionProgress,
  ExtractionResult,
  ExtractionStatus,
  InputMode,
  SearchPreferences,
  StructuredSyllabus,
  StructuredTopic,
  StructuredUnit,
  TopicVideoSearchState,
  UploadedSyllabusFile,
} from './types/syllabus';
import {
  extractSyllabusFromFile,
  isAbortError,
  validateSyllabusFile,
} from './utils/documentExtractor';
import { countMeaningfulChars } from './utils/textStructure';
import { analyzeSyllabusViaApi } from './utils/syllabusApi';
import {
  isAppsScriptConfigured,
  searchTopicVideosWithAppsScript,
} from './services/youtubeService';
import { Navbar } from './components/Navbar';
import { HeroUploader } from './components/HeroUploader';
import { SearchPreferencesPanel } from './components/SearchPreferencesPanel';
import { TopicVideoRoadmap } from './components/TopicVideoRoadmap';
import { Stepper, StepperStageId } from './components/Stepper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

const DEFAULT_PREFERENCES: SearchPreferences = {
  preferredCountry: 'India',
  languages: ['English', 'Hindi'],
  otherLanguageLabel: '',
  preferredChannels: [],
  videosPerTopic: 3,
  prioritizeIndianChannels: true,
  allowFallbackChannels: true,
};

const INITIAL_PROGRESS: ExtractionProgress = {
  percent: 0,
  stage: 'Reading document...',
};

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedSyllabusFile | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('idle');
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress>(INITIAL_PROGRESS);
  const [extractionMeta, setExtractionMeta] = useState<Omit<
    ExtractionResult,
    'text'
  > | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<SearchPreferences>(() => {
    try {
      const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.PREFERENCES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [structuredSyllabus, setStructuredSyllabus] =
    useState<StructuredSyllabus | null>(null);
  const [analysisError, setAnalysisError] = useState<UserFriendlyError | null>(null);
  const [transientBannerError, setTransientBannerError] = useState<UserFriendlyError | null>(null);

  // Stepper state
  const [stepperStage, setStepperStage] = useState<StepperStageId>('reading');
  const [stepperPercent, setStepperPercent] = useState<number>(0);
  const [stepperDetail, setStepperDetail] = useState<string>('');

  const [topicVideoResults, setTopicVideoResults] = useState<
    Record<string, TopicVideoSearchState>
  >({});
  const [isSearchingVideos, setIsSearchingVideos] = useState<boolean>(false);
  const [configurationNotice, setConfigurationNotice] = useState<string | null>(null);

  // Watched state to display top bar overall progress
  const [watchedTrigger, setWatchedTrigger] = useState<number>(0);

  const extractionAbortRef = useRef<AbortController | null>(null);
  const extractionCleanupRef = useRef<(() => void) | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const videoSearchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      extractionAbortRef.current?.abort();
      extractionCleanupRef.current?.();
      analysisAbortRef.current?.abort();
      videoSearchAbortRef.current?.abort();
    };
  }, []);

  const handlePreferencesChange = (next: SearchPreferences) => {
    setPreferences(next);
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.PREFERENCES, JSON.stringify(next));
    } catch {}
  };

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.PREFERENCES);
    } catch {}
  };

  const abortAllOperations = () => {
    extractionAbortRef.current?.abort();
    extractionAbortRef.current = null;
    extractionCleanupRef.current?.();
    extractionCleanupRef.current = null;

    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;

    videoSearchAbortRef.current?.abort();
    videoSearchAbortRef.current = null;

    setIsSearchingVideos(false);
  };

  const handleClearDocument = () => {
    abortAllOperations();
    setUploadedFile(null);
    setExtractionStatus('idle');
    setExtractionProgress(INITIAL_PROGRESS);
    setExtractionMeta(null);
    setExtractedText('');
    setUploadError(null);
    setAnalysisError(null);
    setTransientBannerError(null);
  };

  const handleResetSyllabus = () => {
    abortAllOperations();
    setStructuredSyllabus(null);
    setTopicVideoResults({});
    setAnalysisStage('idle');
    setAnalysisError(null);
    setTransientBannerError(null);
    handleClearDocument();
  };

  const handleCancelActiveProcess = () => {
    abortAllOperations();
    setExtractionStatus('cancelled');
    setAnalysisStage('idle');
    setTransientBannerError({
      code: 'ABORTED',
      title: 'Cancelled',
      message: 'Processing was stopped by the user.',
      action: 'You can modify your syllabus text and restart anytime.',
    });
  };

  const handleFileUploadStart = async (file: File) => {
    const validationErr = validateSyllabusFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    abortAllOperations();

    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
    setUploadError(null);
    setAnalysisError(null);
    setTransientBannerError(null);
    setUploadedFile({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || ext,
      extension: ext,
    });
    setExtractionMeta(null);
    setExtractedText('');
    setExtractionStatus('extracting');
    setExtractionProgress({ percent: 5, stage: 'Reading document...' });

    const controller = new AbortController();
    extractionAbortRef.current = controller;

    try {
      const result = await extractSyllabusFromFile(file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setExtractionProgress(progress);
          }
        },
        onRegisterCancelCleanup: (cleanup) => {
          extractionCleanupRef.current = cleanup;
        },
      });

      if (controller.signal.aborted) return;

      setExtractionMeta({
        pageCount: result.pageCount,
        method: result.method,
        textPages: result.textPages,
        ocrPages: result.ocrPages,
      });
      setExtractedText(result.text);

      if (countMeaningfulChars(result.text) === 0) {
        setExtractionStatus('empty');
        setUploadError('No readable text was detected in this document. Please verify the scan is clear or paste text.');
      } else {
        setExtractionStatus('completed');
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setExtractionStatus('cancelled');
        return;
      }
      const userErr = resolveUserError(err);
      setExtractionStatus('error');
      setUploadError(userErr.message);
    } finally {
      if (extractionAbortRef.current === controller) {
        extractionAbortRef.current = null;
        extractionCleanupRef.current = null;
      }
    }
  };

  /**
   * Searches videos for a single topic
   */
  const fetchVideosForTopic = async (
    subject: string,
    topic: StructuredTopic,
    prefs: SearchPreferences,
    signal: AbortSignal
  ) => {
    if (signal.aborted) return;

    setTopicVideoResults((prev) => ({
      ...prev,
      [topic.id]: {
        status: 'loading',
        videos: prev[topic.id]?.videos ?? [],
      },
    }));

    try {
      const result = await searchTopicVideosWithAppsScript(
        {
          subject,
          topicName: topic.topicName,
          subtopics: topic.subtopics,
          preferences: prefs,
        },
        { signal }
      );

      if (signal.aborted) return;

      setTopicVideoResults((prev) => ({
        ...prev,
        [topic.id]: {
          status: result.videos.length > 0 ? 'loaded' : 'empty',
          videos: result.videos,
          queryUsed: result.queryUsed,
          cached: result.cached,
        },
      }));
    } catch (err) {
      if (isAbortError(err) || signal.aborted) {
        return;
      }
      const userErr = resolveUserError(err);
      if (userErr.code === 'QUOTA_EXCEEDED' || userErr.code === 'RATE_LIMITED') {
        setConfigurationNotice(userErr.message);
      }
      setTopicVideoResults((prev) => ({
        ...prev,
        [topic.id]: {
          status: 'error',
          videos: [],
          errorMessage: userErr.message,
          errorCode: userErr.code,
        },
      }));
    }
  };

  /**
   * Lazy-loads videos for all topics in a specific unit
   */
  const handleSearchUnitTopics = async (unit: StructuredUnit) => {
    if (!structuredSyllabus || !isAppsScriptConfigured()) return;

    const controller = new AbortController();
    videoSearchAbortRef.current = controller;
    setIsSearchingVideos(true);

    try {
      for (const topic of unit.topics) {
        if (controller.signal.aborted) break;
        await fetchVideosForTopic(
          structuredSyllabus.subject,
          topic,
          preferences,
          controller.signal
        );
      }
    } finally {
      setIsSearchingVideos(false);
    }
  };

  /**
   * Runs structuring with AI and progressive rendering
   */
  const handleStartAnalysis = async () => {
    const rawText = inputMode === 'upload' ? extractedText.trim() : manualText.trim();
    if (!rawText || countMeaningfulChars(rawText) < APP_CONFIG.MIN_MEANINGFUL_CHARS) {
      setUploadError('Syllabus text is too short. Please upload a document or paste your syllabus content.');
      return;
    }

    abortAllOperations();
    setUploadError(null);
    setAnalysisError(null);
    setTransientBannerError(null);
    setAnalysisStage('analysing');

    // Stepper setup
    setStepperStage('structuring');
    setStepperPercent(10);
    setStepperDetail('Preparing text chunks for AI structuring...');

    const controller = new AbortController();
    analysisAbortRef.current = controller;

    try {
      const sourceFileName = uploadedFile?.name;
      const sourceLabel = sourceFileName
        ? `Document · ${sourceFileName}`
        : 'Manual Syllabus Entry';

      const structured = await analyzeSyllabusViaApi(rawText, {
        sourceFileName,
        sourceLabel,
        signal: controller.signal,
        onProgress: (info) => {
          if (!controller.signal.aborted) {
            const p = Math.round((info.chunkIndex / info.totalChunks) * 80) + 10;
            setStepperPercent(p);
            setStepperDetail(info.stage);
          }
        },
        onProgressiveUpdate: (intermediateSyllabus) => {
          if (!controller.signal.aborted) {
            setStructuredSyllabus(intermediateSyllabus);
          }
        },
      });

      if (controller.signal.aborted) return;

      setStructuredSyllabus(structured);
      setAnalysisStage('confirmed');

      // Automatically search first unit's topics
      if (structured.units.length > 0 && isAppsScriptConfigured()) {
        setStepperStage('searching');
        setStepperPercent(95);
        setStepperDetail('Finding recommended lectures for Unit 1...');
        await handleSearchUnitTopics(structured.units[0]);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setAnalysisStage('idle');
        return;
      }
      const userErr = resolveUserError(err);
      setAnalysisError(userErr);
      setAnalysisStage('error');
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
    }
  };

  // Overall watched progress calculation for top bar
  const overallProgress = useMemo(() => {
    if (!structuredSyllabus || structuredSyllabus.units.length === 0) return null;
    let totalTopics = 0;
    let watchedTopics = 0;

    const identifier = structuredSyllabus.subjectCode || structuredSyllabus.subject || 'default';
    const sKey = `${APP_CONFIG.STORAGE_KEYS.WATCHED_PREFIX}${identifier.replace(/[^a-z0-9]/gi, '_')}`;
    let savedWatched = new Set<string>();
    try {
      const raw = localStorage.getItem(sKey);
      if (raw) savedWatched = new Set(JSON.parse(raw));
    } catch {}

    for (const unit of structuredSyllabus.units) {
      for (const topic of unit.topics) {
        totalTopics += 1;
        const topicState = topicVideoResults[topic.id];
        const hasWatched = topicState?.videos?.some((v) => savedWatched.has(v.id || v.videoId || v.title));
        if (hasWatched) watchedTopics += 1;
      }
    }

    const percent = totalTopics > 0 ? Math.round((watchedTopics / totalTopics) * 100) : 0;
    return { watched: watchedTopics, total: totalTopics, percent };
  }, [structuredSyllabus, topicVideoResults, watchedTrigger]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-surface-app text-text-main">
        {/* Top bar with subject name, progress, theme toggle, and print */}
        <Navbar
          subjectName={structuredSyllabus?.subject}
          subjectCode={structuredSyllabus?.subjectCode}
          overallProgress={overallProgress}
          onResetSyllabus={handleResetSyllabus}
          onPrint={() => window.print()}
        />

        {/* Transient Dismissible Banner */}
        {transientBannerError && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4">
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-md border border-border-strong bg-surface p-3 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-text-main">
                  {transientBannerError.title}:{' '}
                </span>
                <span className="text-text-muted">{transientBannerError.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTransientBannerError(null)}
                aria-label="Dismiss message"
                className="rounded p-1 text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          {/* VIEW 1: Tool Screen (Upload / Paste Panel) */}
          {analysisStage === 'idle' && (
            <div className="space-y-6">
              <HeroUploader
                inputMode={inputMode}
                onInputModeChange={setInputMode}
                uploadedFile={uploadedFile}
                onFileUploadStart={handleFileUploadStart}
                onClearDocument={handleClearDocument}
                onCancelExtraction={handleCancelActiveProcess}
                extractionStatus={extractionStatus}
                extractionProgress={extractionProgress}
                extractionMeta={extractionMeta}
                extractedText={extractedText}
                onExtractedTextChange={setExtractedText}
                manualText={manualText}
                onManualTextChange={setManualText}
                uploadError={uploadError}
                onUploadError={setUploadError}
                isProcessing={false}
                onSubmit={handleStartAnalysis}
              />

              <div className="max-w-4xl mx-auto">
                <SearchPreferencesPanel
                  preferences={preferences}
                  onChange={handlePreferencesChange}
                  onReset={handleResetPreferences}
                />
              </div>
            </div>
          )}

          {/* VIEW 2: Stepper (Loading State) */}
          {analysisStage === 'analysing' && (
            <div className="max-w-3xl mx-auto py-8">
              <Stepper
                currentStage={stepperStage}
                progressPercent={stepperPercent}
                detailMessage={stepperDetail}
                onCancel={handleCancelActiveProcess}
              />
            </div>
          )}

          {/* VIEW 3: Analysis Error */}
          {analysisStage === 'error' && analysisError && (
            <div className="max-w-lg mx-auto py-12 text-center">
              <div className="rounded-lg border border-error-border bg-surface p-6 space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-error-bg text-error-text">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-semibold text-text-main">
                  {analysisError.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {analysisError.message}
                </p>
                {analysisError.action && (
                  <p className="text-xs font-medium text-text-main">
                    {analysisError.action}
                  </p>
                )}
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                    <span>Try Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisStage('idle')}
                    className="rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
                  >
                    Edit Input
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: Structured Roadmap View */}
          {analysisStage === 'confirmed' && structuredSyllabus && (
            <div className="space-y-6">
              <TopicVideoRoadmap
                syllabus={structuredSyllabus}
                preferences={preferences}
                topicVideoResults={topicVideoResults}
                isSearching={isSearchingVideos}
                isYoutubeConfigured={isAppsScriptConfigured()}
                configurationNotice={configurationNotice}
                onSearchSingleTopic={(topic) => {
                  const controller = new AbortController();
                  void fetchVideosForTopic(
                    structuredSyllabus.subject,
                    topic,
                    preferences,
                    controller.signal
                  );
                }}
                onSearchUnitTopics={handleSearchUnitTopics}
                onRefreshAllVideos={() => {
                  if (structuredSyllabus.units[0]) {
                    void handleSearchUnitTopics(structuredSyllabus.units[0]);
                  }
                }}
              />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}
