import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  ArrowRight,
  Type,
  Loader2,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import {
  ExtractionProgress,
  ExtractionResult,
  ExtractionStatus,
  InputMode,
  UploadedSyllabusFile,
} from '../types/syllabus';

interface HeroUploaderProps {
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  uploadedFile: UploadedSyllabusFile | null;
  onFileUploadStart: (file: File) => void;
  onClearDocument: () => void;
  onCancelExtraction: () => void;
  extractionStatus: ExtractionStatus;
  extractionProgress: ExtractionProgress;
  extractionMeta: Omit<ExtractionResult, 'text'> | null;
  extractedText: string;
  onExtractedTextChange: (text: string) => void;
  manualText: string;
  onManualTextChange: (text: string) => void;
  uploadError: string | null;
  onUploadError: (error: string | null) => void;
  isAnalysing: boolean;
  onContinueToAnalysis: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMethodLabel(meta: Omit<ExtractionResult, 'text'>): string {
  const pages = `${meta.pageCount} ${meta.pageCount === 1 ? 'page' : 'pages'}`;
  switch (meta.method) {
    case 'pdf-text':
      return `PDF Text Extraction · ${pages}`;
    case 'pdf-ocr':
      return `Scanned PDF OCR · ${pages}`;
    case 'pdf-hybrid':
      return `PDF Text (${meta.textPages}) + OCR (${meta.ocrPages}) · ${pages}`;
    case 'image-ocr':
      return `Image OCR · ${pages}`;
  }
}

export function HeroUploader({
  inputMode,
  onInputModeChange,
  uploadedFile,
  onFileUploadStart,
  onClearDocument,
  onCancelExtraction,
  extractionStatus,
  extractionProgress,
  extractionMeta,
  extractedText,
  onExtractedTextChange,
  manualText,
  onManualTextChange,
  uploadError,
  onUploadError,
  isAnalysing,
  onContinueToAnalysis,
}: HeroUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileUploadStart(droppedFile);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileUploadStart(selected);
    }
    e.target.value = '';
  };

  const isExtracting = extractionStatus === 'extracting';
  const showExtractedEditor =
    uploadedFile !== null &&
    (extractionStatus === 'completed' ||
      extractionStatus === 'empty' ||
      extractionStatus === 'cancelled');

  return (
    <section
      id="upload-section"
      className="border-b border-slate-200 bg-gradient-to-b from-slate-50/80 via-white to-white py-14 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Hero Title & Subtitle */}
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0B1528]"
            style={{ textWrap: 'balance' }}
          >
            Turn Your Syllabus Into a Learning Roadmap.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Upload your university syllabus as a PDF, JPG, or PNG — or enter your course
            topics directly — to find structured YouTube video lectures for every unit.
          </p>
        </div>

        {/* Prominent Upload & Text Entry Workspace */}
        <div className="mt-10 sm:mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {/* Dark Navy Structural Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0F1E3D] px-6 py-4 sm:px-8">
            <div
              role="tablist"
              aria-label="Syllabus input method"
              className="inline-flex rounded-lg bg-[#192D57] p-1 self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'upload'}
                onClick={() => {
                  onInputModeChange('upload');
                  onUploadError(null);
                }}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-white text-[#0B1528] shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload Syllabus File</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'manual'}
                onClick={() => {
                  onInputModeChange('manual');
                  onUploadError(null);
                }}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  inputMode === 'manual'
                    ? 'bg-white text-[#0B1528] shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Type className="h-4 w-4" />
                <span>Enter Syllabus Text</span>
              </button>
            </div>

            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
              Local Browser Extraction · PDF, JPG, JPEG, PNG
            </span>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {/* Input Zone */}
            <div>
              {inputMode === 'upload' ? (
                <div className="space-y-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileInputChange}
                    className="sr-only"
                    id="syllabus-file-input"
                  />

                  {!uploadedFile ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 sm:py-20 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] ${
                        isDragging
                          ? 'border-[#0F1E3D] bg-slate-50'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#0F1E3D] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F1E3D] text-white shadow-xs">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <p className="mt-5 text-base sm:text-lg font-semibold text-[#0B1528]">
                        Drag and drop your syllabus here, or{' '}
                        <span className="text-[#1D4ED8] underline underline-offset-4">
                          browse files
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Accepted formats: PDF, JPG, JPEG, PNG · Maximum size 20 MB
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Uploaded Document Metadata Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0F1E3D] text-white">
                            {uploadedFile.extension === 'PDF' ? (
                              <FileText className="h-6 w-6" />
                            ) : (
                              <ImageIcon className="h-6 w-6" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0B1528]">
                              {uploadedFile.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                              {uploadedFile.extension} · {formatFileSize(uploadedFile.sizeBytes)}
                              {extractionMeta ? ` · ${formatMethodLabel(extractionMeta)}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isExtracting ? (
                            <button
                              type="button"
                              onClick={onCancelExtraction}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Cancel Processing</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Replace File
                              </button>
                              <button
                                type="button"
                                onClick={onClearDocument}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-red-200 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Clear Document</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Extraction Processing Indicator & Progress Bar */}
                      {isExtracting && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Loader2 className="h-5 w-5 animate-spin text-[#0F1E3D] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0B1528] truncate">
                                  {extractionProgress.stage}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Running locally in your browser — document is never uploaded to external servers.
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-[#0F1E3D] tabular-nums shrink-0">
                              {extractionProgress.percent}%
                            </span>
                          </div>

                          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-[#0F1E3D] transition-all duration-200"
                              style={{ width: `${extractionProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Editable Extracted Text Area */}
                      {showExtractedEditor && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {extractionStatus === 'completed' && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                              )}
                              <label
                                htmlFor="extracted-syllabus-textarea"
                                className="text-sm font-semibold text-[#0B1528]"
                              >
                                Extracted Syllabus Text
                              </label>
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums">
                              {extractedText.length.toLocaleString()} characters · Editable for OCR corrections
                            </span>
                          </div>

                          {extractionStatus === 'empty' && (
                            <div
                              role="status"
                              className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            >
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
                              <span>
                                No readable text was detected in this document. It may be blank, too blurry, or handwritten. You can type or paste your syllabus below, or clear and try a clearer scan.
                              </span>
                            </div>
                          )}

                          {extractionStatus === 'cancelled' && (
                            <div
                              role="status"
                              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                            >
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-slate-600" />
                              <span>
                                Document extraction was cancelled. You can enter syllabus text below, replace the file, or clear the document.
                              </span>
                            </div>
                          )}

                          <textarea
                            id="extracted-syllabus-textarea"
                            rows={10}
                            value={extractedText}
                            onChange={(e) => {
                              onExtractedTextChange(e.target.value);
                              if (uploadError) onUploadError(null);
                            }}
                            placeholder="Extracted syllabus text will appear here. Review unit headings and fix any OCR typos before continuing..."
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20 leading-relaxed"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label
                      htmlFor="manual-syllabus-textarea"
                      className="text-sm font-semibold text-[#0B1528]"
                    >
                      Paste or type your syllabus units and topics
                    </label>
                    {manualText.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => onManualTextChange('')}
                        className="text-xs font-medium text-slate-500 hover:text-[#0B1528] cursor-pointer"
                      >
                        Clear text
                      </button>
                    )}
                  </div>
                  <textarea
                    id="manual-syllabus-textarea"
                    rows={8}
                    value={manualText}
                    onChange={(e) => {
                      onManualTextChange(e.target.value);
                      if (uploadError) onUploadError(null);
                    }}
                    placeholder="Enter your subject title, units, and syllabus topics here (one topic per line)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20 leading-relaxed"
                  />
                  <p className="mt-2.5 text-xs text-slate-500">
                    Tip: Start unit headings with &ldquo;Unit 1:&rdquo; followed by topic lines to organise your results automatically.
                  </p>
                </div>
              )}

              {/* Inline Validation / Upload Error Banner */}
              {uploadError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* Primary Action Row */}
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                All PDF and OCR processing runs privately inside your browser.
              </p>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {inputMode === 'upload' && uploadedFile && !isExtracting && (
                  <button
                    type="button"
                    onClick={onClearDocument}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Clear Document
                  </button>
                )}

                <button
                  type="button"
                  onClick={onContinueToAnalysis}
                  disabled={isAnalysing || isExtracting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F1E3D] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#162B54] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] focus-visible:ring-offset-2"
                >
                  <span>
                    {isExtracting
                      ? 'Extracting Text...'
                      : isAnalysing
                        ? 'Building Playlist...'
                        : 'Build Learning Playlist'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
