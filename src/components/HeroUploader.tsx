import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { APP_CONFIG, resolveUserError, UserFriendlyError } from '../config';
import type {
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
  isProcessing: boolean;
  onSubmit: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  isProcessing,
  onSubmit,
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

  const resolvedError: UserFriendlyError | null = uploadError
    ? resolveUserError(uploadError)
    : null;

  return (
    <section className="py-6 sm:py-8 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="rounded-lg border border-border-subtle bg-surface">
        {/* Compact Mode Switcher Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 bg-surface-muted/40">
          <div role="tablist" aria-label="Input mode" className="flex items-center gap-1 bg-surface-muted p-1 rounded-md border border-border-subtle">
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'upload'}
              onClick={() => {
                onInputModeChange('upload');
                onUploadError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-surface text-text-main shadow-xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Upload Document</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'manual'}
              onClick={() => {
                onInputModeChange('manual');
                onUploadError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                inputMode === 'manual'
                  ? 'bg-surface text-text-main shadow-xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Type className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Paste Text</span>
            </button>
          </div>

          <span className="text-[11px] text-text-muted hidden sm:inline">
            Client-side extraction · Max {APP_CONFIG.MAX_FILE_SIZE_MB} MB
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {inputMode === 'upload' ? (
            <div>
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
                  className={`flex flex-col items-center justify-center rounded-md border border-dashed py-12 px-4 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-accent bg-accent-subtle/30'
                      : 'border-border-strong bg-surface-muted/30 hover:border-text-muted hover:bg-surface-muted/60'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface border border-border-subtle text-text-muted">
                    <Upload className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-text-main">
                    Drop syllabus PDF or image here, or <span className="text-accent underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Supported: PDF, JPG, PNG · Up to {APP_CONFIG.MAX_FILE_SIZE_MB} MB / {APP_CONFIG.MAX_PDF_PAGES} pages
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Metadata Bar */}
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-muted/40 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface border border-border-subtle text-text-muted">
                        {uploadedFile.extension === 'PDF' ? (
                          <FileText className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                          <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text-main">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[11px] text-text-muted font-mono tabular-nums">
                          {uploadedFile.extension} · {formatFileSize(uploadedFile.sizeBytes)}
                          {extractionMeta ? ` · ${extractionMeta.pageCount} page(s)` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isExtracting ? (
                        <button
                          type="button"
                          onClick={onCancelExtraction}
                          className="inline-flex items-center gap-1 rounded border border-error-border bg-error-bg/70 px-2 py-1 text-xs font-medium text-error-text hover:bg-error-bg transition-colors cursor-pointer"
                        >
                          <Ban className="h-3 w-3" strokeWidth={1.75} />
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={onClearDocument}
                            aria-label="Remove document"
                            className="rounded border border-border-subtle bg-surface p-1 text-text-muted hover:border-error-border hover:text-error-text transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Extraction Progress Bar */}
                  {isExtracting && (
                    <div className="rounded-md border border-border-subtle bg-surface p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">{extractionProgress.stage}</span>
                        <span className="font-mono tabular-nums text-text-main font-medium">
                          {extractionProgress.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted border border-border-subtle">
                        <div
                          className="h-full bg-accent transition-all duration-200"
                          style={{ width: `${extractionProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Editable Extracted Text Area */}
                  {showExtractedEditor && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="extracted-text-area" className="font-medium text-text-main flex items-center gap-1">
                          {extractionStatus === 'completed' && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                          )}
                          <span>Extracted Syllabus Content</span>
                        </label>
                        <span className="text-text-muted font-mono tabular-nums">
                          {extractedText.length.toLocaleString()} characters
                        </span>
                      </div>

                      <textarea
                        id="extracted-text-area"
                        rows={7}
                        value={extractedText}
                        onChange={(e) => {
                          onExtractedTextChange(e.target.value);
                          if (uploadError) onUploadError(null);
                        }}
                        placeholder="Extracted syllabus text appears here. You can edit unit headings or fix typos directly..."
                        className="w-full rounded-md border border-border-subtle bg-surface p-3 font-mono text-xs text-text-main leading-relaxed focus:border-accent focus:outline-none placeholder:text-text-subtle"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="manual-syllabus-text" className="font-medium text-text-main">
                  Course Syllabus Text
                </label>
                {manualText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onManualTextChange('')}
                    className="text-text-muted hover:text-text-main cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                id="manual-syllabus-text"
                rows={8}
                value={manualText}
                onChange={(e) => {
                  onManualTextChange(e.target.value);
                  if (uploadError) onUploadError(null);
                }}
                placeholder="Enter subject name, units, and topics. Example:&#10;&#10;CS301: Data Structures&#10;Unit 1: Linear Data Structures&#10;- Arrays and Linked Lists&#10;- Stacks and Queues&#10;&#10;Unit 2: Trees and Graphs&#10;- Binary Search Trees&#10;- Graph Traversals"
                className="w-full rounded-md border border-border-subtle bg-surface p-3 font-mono text-xs text-text-main leading-relaxed focus:border-accent focus:outline-none placeholder:text-text-subtle"
              />
            </div>
          )}

          {/* Inline Validation / Error Message */}
          {resolvedError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-error-border bg-error-bg p-3 text-xs text-error-text"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.75} />
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold">{resolvedError.title}</p>
                <p>{resolvedError.message}</p>
                {resolvedError.action && (
                  <p className="font-medium opacity-90">{resolvedError.action}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-xs text-text-muted">
              {inputMode === 'upload' && uploadedFile
                ? 'Review text above before structuring'
                : 'Upload or paste to build roadmap'}
            </span>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isProcessing || isExtracting}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none"
            >
              <span>{isProcessing ? 'Structuring...' : 'Generate Roadmap'}</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
