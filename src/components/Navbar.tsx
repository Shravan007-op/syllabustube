import { useEffect, useState } from 'react';
import { Moon, Printer, RotateCcw, Sun } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface NavbarProps {
  subjectName?: string;
  subjectCode?: string;
  overallProgress?: {
    watched: number;
    total: number;
    percent: number;
  } | null;
  onResetSyllabus?: () => void;
  onPrint?: () => void;
}

export function Navbar({
  subjectName,
  subjectCode,
  overallProgress,
  onResetSyllabus,
  onPrint,
}: NavbarProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, 'light');
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              if (onResetSyllabus && (subjectName || subjectCode)) {
                e.preventDefault();
                onResetSyllabus();
              }
            }}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-text-main hover:text-accent transition-colors cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white font-mono text-xs font-bold"
            >
              ST
            </span>
            <span className="font-sans">SyllabusTube</span>
          </a>

          {(subjectName || subjectCode) && (
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-border-subtle text-xs text-text-muted">
              {subjectCode && (
                <span className="font-mono font-medium text-text-main">{subjectCode}</span>
              )}
              {subjectCode && subjectName && <span>·</span>}
              {subjectName && <span className="truncate max-w-[220px]">{subjectName}</span>}
            </div>
          )}
        </div>

        {/* Center: Overall Progress if available */}
        {overallProgress && overallProgress.total > 0 && (
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs mx-auto">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted border border-border-subtle">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${overallProgress.percent}%` }}
              />
            </div>
            <span className="font-mono text-xs text-text-muted whitespace-nowrap tabular-nums">
              {overallProgress.watched}/{overallProgress.total} watched ({overallProgress.percent}%)
            </span>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {onPrint && (subjectName || subjectCode) && (
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Export or print syllabus roadmap"
              title="Print / Export Roadmap"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {onResetSyllabus && (subjectName || subjectCode) && (
            <button
              type="button"
              onClick={onResetSyllabus}
              aria-label="Start with a new syllabus"
              title="New Syllabus"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">New Syllabus</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-muted hover:border-border-strong hover:text-text-main transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
