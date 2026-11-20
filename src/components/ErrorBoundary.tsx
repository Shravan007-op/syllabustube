import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-surface-app">
          <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-error-bg text-error-text">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="mt-3 text-base font-semibold text-text-main">
              Something went wrong
            </h2>
            <p className="mt-1 text-xs text-text-muted leading-relaxed">
              An unexpected error occurred while rendering this view. You can reload to reset the application state.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
