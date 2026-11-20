export type CountryOption = 'India' | 'United States' | 'United Kingdom' | 'Global';

export type LanguageOption = 'English' | 'Hindi' | 'Marathi' | 'Other';

export type VideosPerTopicOption = 3 | 5 | 10;

export type InputMode = 'upload' | 'manual';

export type ResultsViewState = 'ready' | 'loading' | 'empty' | 'error';

export interface SearchPreferences {
  preferredCountry: CountryOption;
  languages: LanguageOption[];
  otherLanguageLabel: string;
  preferredChannels: string[];
  videosPerTopic: VideosPerTopicOption;
  prioritizeIndianChannels: boolean;
  allowFallbackChannels: boolean;
}

export interface VideoResult {
  id: string;
  videoId?: string;
  videoUrl?: string;
  channelId?: string;
  channelCountry?: string;
  title: string;
  channelName: string;
  countryOrigin: string;
  isIndianEducator: boolean;
  language: LanguageOption | string;
  duration: string;
  viewsLabel: string;
  publishedLabel: string;
  thumbnailUrl: string;
  summary: string;
  coveredTopics?: string[];
  relevanceExplanation?: string;
  youtubeSearchQuery: string;
  relevanceScore: number;
}

export interface RankedVideoResult extends VideoResult {
  rankReason: string | null;
  isFallback: boolean;
}

export type TopicVideoStatus = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

export interface TopicVideoSearchState {
  status: TopicVideoStatus;
  videos: RankedVideoResult[];
  queryUsed?: string;
  errorMessage?: string;
  errorCode?: string;
  cached?: boolean;
}

export interface SyllabusTopic {
  id: string;
  topicCode: string;
  title: string;
  description: string;
  keywords: string[];
  videos: VideoResult[];
}

export interface SyllabusUnit {
  id: string;
  unitNumber: number;
  title: string;
  overview: string;
  topics: SyllabusTopic[];
}

export interface SyllabusDataset {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  semesterLabel: string;
  sourceLabel: string;
  units: SyllabusUnit[];
}

export interface UploadedSyllabusFile {
  name: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
}

export type ExtractionMethod = 'pdf-text' | 'pdf-ocr' | 'pdf-hybrid' | 'image-ocr';

export type ExtractionStatus =
  | 'idle'
  | 'extracting'
  | 'completed'
  | 'empty'
  | 'cancelled'
  | 'error';

export interface ExtractionProgress {
  percent: number;
  stage: string;
  currentPage?: number;
  totalPages?: number;
}

export interface ExtractionResult {
  text: string;
  pageCount: number;
  method: ExtractionMethod;
  textPages: number;
  ocrPages: number;
}

export interface StructuredTopic {
  id: string;
  topicName: string;
  subtopics: string[];
  needsVerification?: boolean;
}

export interface StructuredUnit {
  id: string;
  unitNumber: number;
  unitName: string;
  topics: StructuredTopic[];
}

export interface VerificationFlag {
  location: string;
  message: string;
}

export interface StructuredSyllabus {
  subject: string;
  subjectCode: string;
  units: StructuredUnit[];
  verificationFlags: VerificationFlag[];
  isIncomplete: boolean;
  sourceLabel: string;
}

export type AnalysisStage = 'idle' | 'analysing' | 'review' | 'confirmed' | 'error';


