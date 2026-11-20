import { useEffect, useRef, useState } from 'react';
import {
  AnalysisStage,
  ExtractionProgress,
  ExtractionResult,
  ExtractionStatus,
  InputMode,
  SearchPreferences,
  StructuredSyllabus,
  StructuredTopic,
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
import { StructuredSyllabusReview } from './components/StructuredSyllabusReview';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Footer } from './components/Footer';

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
  stage: 'Preparing document...',
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

  const [preferences, setPreferences] = useState<SearchPreferences>(DEFAULT_PREFERENCES);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [structuredSyllabus, setStructuredSyllabus] =
    useState<StructuredSyllabus | null>(null);
  const [confirmedSyllabus, setConfirmedSyllabus] =
    useState<StructuredSyllabus | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [topicVideoResults, setTopicVideoResults] = useState<
    Record<string, TopicVideoSearchState>
  >({});
  const [isSearchingVideos, setIsSearchingVideos] = useState<boolean>(false);
  const [configurationNotice, setConfigurationNotice] = useState<string | null>(null);
  const [preferencesDirtySinceSearch, setPreferencesDirtySinceSearch] =
    useState<boolean>(false);

  const lastAnalyzedInputRef = useRef<{
    text: string;
    sourceFileName?: string;
    sourceLabel: string;
  } | null>(null);

  const extractionAbortRef = useRef<AbortController | null>(null);
  const extractionCleanupRef = useRef<(() => void) | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const analysisInFlightRef = useRef<boolean>(false);
  const videoSearchAbortRef = useRef<AbortController | null>(null);
  const videoSearchSessionRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      extractionAbortRef.current?.abort();
      extractionCleanupRef.current?.();
      analysisAbortRef.current?.abort();
      videoSearchAbortRef.current?.abort();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const abortActiveExtraction = () => {
    extractionAbortRef.current?.abort();
    extractionAbortRef.current = null;
    extractionCleanupRef.current?.();
    extractionCleanupRef.current = null;
  };

  const handleClearDocument = () => {
    abortActiveExtraction();
    setUploadedFile(null);
    setExtractionStatus('idle');
    setExtractionProgress(INITIAL_PROGRESS);
    setExtractionMeta(null);
    setExtractedText('');
    setUploadError(null);
  };

  const handleCancelExtraction = () => {
    abortActiveExtraction();
    setExtractionStatus('cancelled');
    setExtractionProgress(INITIAL_PROGRESS);
    setUploadError(null);
  };

  const handleFileUploadStart = async (file: File) => {
    const validationErr = validateSyllabusFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    abortActiveExtraction();

    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
    setUploadError(null);
    setUploadedFile({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || ext,
      extension: ext,
    });
    setExtractionMeta(null);
    setExtractedText('');
    setExtractionStatus('extracting');
    setExtractionProgress({ percent: 4, stage: 'Preparing document extraction...' });

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
      } else {
        setExtractionStatus('completed');
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setExtractionStatus('cancelled');
        return;
      }

      const friendlyMessage =
        err instanceof Error
          ? err.message
          : 'Unable to extract text from this file. Please verify the file is not corrupted.';
      setExtractionStatus('error');
      setUploadError(friendlyMessage);
    } finally {
      if (extractionAbortRef.current === controller) {
        extractionAbortRef.current = null;
        extractionCleanupRef.current = null;
      }
    }
  };

  const abortActiveVideoSearch = () => {
    videoSearchSessionRef.current += 1;
    videoSearchAbortRef.current?.abort();
    videoSearchAbortRef.current = null;
    setIsSearchingVideos(false);
  };

  const fetchVideosForTopic = async (
    subject: string,
    topic: StructuredTopic,
    prefs: SearchPreferences,
    signal: AbortSignal,
    sessionId: number
  ) => {
    if (signal.aborted || videoSearchSessionRef.current !== sessionId) return;

    setTopicVideoResults((prev) => ({
      ...prev,
      [topic.id]: {
        status: 'loading',
        videos: prev[topic.id]?.videos ?? [],
      },
    }));

    const attemptSearch = () =>
      searchTopicVideosWithAppsScript(
        {
          subject,
          topicName: topic.topicName,
          subtopics: topic.subtopics,
          preferences: prefs,
        },
        { signal }
      );

    try {
      let result;
      try {
        result = await attemptSearch();
      } catch (firstErr) {
        const errCode =
          firstErr && typeof firstErr === 'object' && 'code' in firstErr
            ? String((firstErr as { code?: unknown }).code)
            : '';
        if (errCode === 'REQUEST_BUSY' && !signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          result = await attemptSearch();
        } else {
          throw firstErr;
        }
      }

      if (signal.aborted || videoSearchSessionRef.current !== sessionId) return;

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
        if (videoSearchSessionRef.current === sessionId) {
          setTopicVideoResults((prev) => ({
            ...prev,
            [topic.id]:
              prev[topic.id]?.videos && prev[topic.id].videos.length > 0
                ? { ...prev[topic.id], status: 'loaded' }
                : { status: 'idle', videos: [] },
          }));
        }
        return;
      }

      if (videoSearchSessionRef.current !== sessionId) return;

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to search YouTube videos for this topic.';
      const errCode =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';

      if (
        errCode === 'ENDPOINT_NOT_CONFIGURED' ||
        errCode === 'SERVER_NOT_CONFIGURED' ||
        errCode === 'YOUTUBE_AUTH_ERROR'
      ) {
        setConfigurationNotice(message);
        videoSearchAbortRef.current?.abort();
      }

      setTopicVideoResults((prev) => ({
        ...prev,
        [topic.id]: {
          status: 'error',
          videos: [],
          errorMessage: message,
          errorCode: errCode,
        },
      }));
    }
  };

  const runTopicWiseVideoSearch = async (
    syllabusToSearch: StructuredSyllabus,
    prefsToUse: SearchPreferences
  ) => {
    abortActiveVideoSearch();
    setConfigurationNotice(null);

    if (!isAppsScriptConfigured()) {
      setTopicVideoResults({});
      setPreferencesDirtySinceSearch(false);
      setIsSearchingVideos(false);
      return;
    }

    const sessionId = videoSearchSessionRef.current;
    const controller = new AbortController();
    videoSearchAbortRef.current = controller;

    const allTopics = syllabusToSearch.units.flatMap((u) => u.topics);
    if (allTopics.length === 0) return;

    const initialMap: Record<string, TopicVideoSearchState> = {};
    for (const topic of allTopics) {
      initialMap[topic.id] = { status: 'idle', videos: [] };
    }
    setTopicVideoResults(initialMap);
    setPreferencesDirtySinceSearch(false);
    setIsSearchingVideos(true);

    let cursor = 0;
    const workerCount = Math.min(2, allTopics.length);

    const runWorker = async () => {
      while (
        cursor < allTopics.length &&
        !controller.signal.aborted &&
        videoSearchSessionRef.current === sessionId
      ) {
        const nextIndex = cursor;
        cursor += 1;
        const topic = allTopics[nextIndex];
        await fetchVideosForTopic(
          syllabusToSearch.subject,
          topic,
          prefsToUse,
          controller.signal,
          sessionId
        );
      }
    };

    try {
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    } finally {
      if (videoSearchSessionRef.current === sessionId) {
        setIsSearchingVideos(false);
        if (videoSearchAbortRef.current === controller) {
          videoSearchAbortRef.current = null;
        }
      }
    }
  };

  const runGeminiAnalysis = async (params: {
    text: string;
    sourceFileName?: string;
    sourceLabel: string;
  }) => {
    // Prevent duplicate concurrent Gemini API requests
    if (analysisInFlightRef.current) {
      return;
    }

    abortActiveVideoSearch();
    analysisInFlightRef.current = true;
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    lastAnalyzedInputRef.current = params;
    setAnalysisError(null);
    setConfigurationNotice(null);
    setAnalysisStage('analysing');
    scrollToSection('roadmap-section');

    try {
      const structured = await analyzeSyllabusViaApi(params.text, {
        sourceFileName: params.sourceFileName,
        sourceLabel: params.sourceLabel,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      // Automatically proceed to topic-wise YouTube recommendations
      setStructuredSyllabus(structured);
      setConfirmedSyllabus(structured);
      setTopicVideoResults({});
      setPreferencesDirtySinceSearch(false);
      setAnalysisStage('confirmed');
      void runTopicWiseVideoSearch(structured, preferences);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to analyse syllabus with Gemini. Please try again.';
      setAnalysisError(message);
      setAnalysisStage('error');
    } finally {
      analysisInFlightRef.current = false;
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
    }
  };

  const getCurrentPipelineInput = (): {
    text: string;
    sourceFileName?: string;
    sourceLabel: string;
  } | null => {
    if (inputMode === 'upload') {
      if (!uploadedFile) {
        setUploadError(
          'Please upload a PDF, JPG, JPEG, or PNG syllabus file, or switch to "Enter Syllabus Text".'
        );
        return null;
      }
      if (extractionStatus === 'extracting') {
        return null;
      }

      const trimmedExtracted = extractedText.trim();
      if (!trimmedExtracted) {
        setUploadError(
          'Extracted text is empty. Please correct or type your syllabus topics in the text box above before continuing.'
        );
        return null;
      }
      if (countMeaningfulChars(trimmedExtracted) < 10) {
        setUploadError(
          'Extracted syllabus text is too short or incomplete. Please add more detail before analysing.'
        );
        return null;
      }

      return {
        text: trimmedExtracted,
        sourceFileName: uploadedFile.name,
        sourceLabel: `Extracted Document · ${uploadedFile.name}`,
      };
    }

    const trimmedManual = manualText.trim();
    if (!trimmedManual) {
      setUploadError(
        'Please enter or paste your syllabus units and topics before analysing.'
      );
      return null;
    }
    if (countMeaningfulChars(trimmedManual) < 10) {
      setUploadError(
        'Syllabus text is too short or incomplete. Please enter at least a subject or topic list.'
      );
      return null;
    }

    return {
      text: trimmedManual,
      sourceLabel: 'Manual Syllabus Entry',
    };
  };

  const handleContinueToAnalysis = () => {
    const input = getCurrentPipelineInput();
    if (!input) return;

    setUploadError(null);
    void runGeminiAnalysis(input);
  };

  const handleReanalyse = () => {
    if (analysisInFlightRef.current) return;

    // Prefer current live editor input if valid, otherwise retry last submitted text
    const currentInput =
      inputMode === 'upload' && uploadedFile && extractedText.trim()
        ? {
            text: extractedText.trim(),
            sourceFileName: uploadedFile.name,
            sourceLabel: `Extracted Document · ${uploadedFile.name}`,
          }
        : inputMode === 'manual' && manualText.trim()
          ? {
              text: manualText.trim(),
              sourceLabel: 'Manual Syllabus Entry',
            }
          : lastAnalyzedInputRef.current;

    if (!currentInput || countMeaningfulChars(currentInput.text) < 10) {
      setAnalysisError('Syllabus text is empty or incomplete. Please provide valid syllabus text.');
      setAnalysisStage('error');
      return;
    }

    void runGeminiAnalysis(currentInput);
  };

  const handlePreferencesChange = (next: SearchPreferences) => {
    setPreferences(next);
    if (analysisStage === 'confirmed' && confirmedSyllabus) {
      setPreferencesDirtySinceSearch(true);
    }
  };

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    if (analysisStage === 'confirmed' && confirmedSyllabus) {
      setPreferencesDirtySinceSearch(true);
    }
  };

  const handleConfirmAndContinue = (cleanedSyllabus: StructuredSyllabus) => {
    setConfirmedSyllabus(cleanedSyllabus);
    setAnalysisStage('confirmed');
    void runTopicWiseVideoSearch(cleanedSyllabus, preferences);
  };

  const handleRefreshAllVideos = () => {
    if (!confirmedSyllabus) return;
    void runTopicWiseVideoSearch(confirmedSyllabus, preferences);
  };

  const handleSearchSingleTopic = (
    topic: StructuredTopic,
    prefsOverride?: SearchPreferences
  ) => {
    if (!confirmedSyllabus) return;
    setConfigurationNotice(null);
    const effectivePrefs = prefsOverride ?? preferences;
    const sessionId = videoSearchSessionRef.current;
    const signal =
      videoSearchAbortRef.current?.signal ?? new AbortController().signal;
    void fetchVideosForTopic(
      confirmedSyllabus.subject,
      topic,
      effectivePrefs,
      signal,
      sessionId
    );
  };

  const handleEnableFallbackAndRetryTopic = (topic: StructuredTopic) => {
    const nextPrefs: SearchPreferences = {
      ...preferences,
      allowFallbackChannels: true,
    };
    setPreferences(nextPrefs);
    handleSearchSingleTopic(topic, nextPrefs);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-white text-[#0B1528]">
      <Navbar />

      <main className="flex-1">
        <HeroUploader
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          uploadedFile={uploadedFile}
          onFileUploadStart={handleFileUploadStart}
          onClearDocument={handleClearDocument}
          onCancelExtraction={handleCancelExtraction}
          extractionStatus={extractionStatus}
          extractionProgress={extractionProgress}
          extractionMeta={extractionMeta}
          extractedText={extractedText}
          onExtractedTextChange={setExtractedText}
          manualText={manualText}
          onManualTextChange={setManualText}
          uploadError={uploadError}
          onUploadError={setUploadError}
          isAnalysing={analysisStage === 'analysing'}
          onContinueToAnalysis={handleContinueToAnalysis}
        />

        <SearchPreferencesPanel
          preferences={preferences}
          onChange={handlePreferencesChange}
          onReset={handleResetPreferences}
        />

        <StructuredSyllabusReview
          stage={analysisStage}
          syllabus={structuredSyllabus}
          confirmedSyllabus={confirmedSyllabus}
          preferences={preferences}
          topicVideoResults={topicVideoResults}
          isSearchingVideos={isSearchingVideos}
          isYoutubeConfigured={isAppsScriptConfigured()}
          configurationNotice={configurationNotice}
          preferencesDirty={preferencesDirtySinceSearch}
          errorMessage={analysisError}
          onUpdateSyllabus={setStructuredSyllabus}
          onReanalyse={handleReanalyse}
          onConfirmAndContinue={handleConfirmAndContinue}
          onRefreshAllVideos={handleRefreshAllVideos}
          onStopVideoSearch={abortActiveVideoSearch}
          onSearchSingleTopic={(topic) => handleSearchSingleTopic(topic)}
          onEnableFallbackAndRetryTopic={handleEnableFallbackAndRetryTopic}
          onRetry={handleReanalyse}
          onGoToUpload={() => scrollToSection('upload-section')}
        />

        <HowItWorksSection />
      </main>

      <Footer />
    </div>
  );
}
