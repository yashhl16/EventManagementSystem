import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

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
    console.error('[Eventify ErrorBoundary] Uncaught component exception:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-rose-500/30 bg-white p-8 text-center shadow-lg dark:bg-zinc-900/70">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Something went wrong
            </h3>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              An unexpected error occurred while rendering this section. Your data and account session are intact.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-left text-[11px] font-mono text-rose-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-rose-400">
                {this.state.error.message}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Home className="h-3.5 w-3.5" />}
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
