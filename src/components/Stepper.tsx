import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, CircleDashed, FileSearch, Sparkles, Youtube } from 'lucide-react';

export type StepperStageId = 'reading' | 'extracting' | 'structuring' | 'searching';

export interface StepperStageInfo {
  id: StepperStageId;
  label: string;
  detail?: string;
  current?: number;
  total?: number;
}

interface StepperProps {
  currentStage: StepperStageId;
  progressPercent: number; // 0 to 100
  detailMessage?: string;
  currentCount?: number;
  totalCount?: number;
  onCancel?: () => void;
}

export function Stepper({
  currentStage,
  progressPercent,
  detailMessage,
  currentCount,
  totalCount,
  onCancel,
}: StepperProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ''}${s}s`;
  };

  const stages: Array<{ id: StepperStageId; name: string; icon: typeof FileSearch }> = [
    { id: 'reading', name: 'Reading file', icon: FileSearch },
    { id: 'extracting', name: 'Extracting text', icon: FileSearch },
    { id: 'structuring', name: 'Structuring syllabus', icon: Sparkles },
    { id: 'searching', name: 'Finding videos', icon: Youtube },
  ];

  const stageOrder: StepperStageId[] = ['reading', 'extracting', 'structuring', 'searching'];
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-border-subtle bg-surface p-5 sm:p-6"
    >
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <CircleDashed className="h-4 w-4 animate-spin text-accent" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-text-main">
            Processing Syllabus
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-muted tabular-nums">
            Elapsed: {formatElapsed(elapsedSeconds)}
          </span>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-md border border-error-border bg-error-bg/60 px-2.5 py-1 text-xs font-medium text-error-text hover:bg-error-bg transition-colors cursor-pointer"
            >
              <Ban className="h-3 w-3" strokeWidth={1.75} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Steps Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
        {stages.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                isCurrent
                  ? 'bg-accent-subtle/50 text-accent-text border border-accent/20'
                  : isDone
                    ? 'text-text-main'
                    : 'text-text-subtle'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
              ) : isCurrent ? (
                <CircleDashed className="h-4 w-4 animate-spin text-accent shrink-0" strokeWidth={1.75} />
              ) : (
                <div className="h-4 w-4 rounded-full border border-border-strong shrink-0 flex items-center justify-center text-[10px] font-mono">
                  {idx + 1}
                </div>
              )}

              <span className="text-xs font-medium truncate">
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Determinate Progress Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="truncate pr-2">
            {detailMessage || (currentCount && totalCount ? `Step ${currentCount} of ${totalCount}` : 'Working...')}
          </span>
          <span className="font-mono tabular-nums shrink-0 font-medium text-text-main">
            {Math.min(100, Math.max(0, Math.round(progressPercent)))}%
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted border border-border-subtle">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
