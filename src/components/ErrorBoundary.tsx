import React from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  LifeBuoy, 
  ArrowLeft,
  Terminal
} from 'lucide-react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  title?: string;
  isNested?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log to console
    console.error('Uncaught rendering error in component tree:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private resetErrorBoundary = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
  };

  private handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const errorDetails = `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}
Location: ${typeof window !== 'undefined' ? window.location.href : 'Unknown'}
Stack:
${error?.stack || 'No stack available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(errorDetails).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }).catch(() => {
        // Ignore clipboard failure
      });
    }
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleGoBack = (): void => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      this.handleGoHome();
    }
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom render prop or custom fallback provided
      if (typeof this.props.fallback === 'function' && this.state.error) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (this.props.fallback && typeof this.props.fallback !== 'function') {
        return this.props.fallback;
      }

      const { error, errorInfo, copied, showDetails } = this.state;
      const isNested = this.props.isNested;

      if (isNested) {
        return (
          <div className="my-4 p-4 rounded-lg bg-rose-50/70 border border-rose-200 text-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-md shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-rose-900">
                  {this.props.title || 'Component failed to render'}
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  {error?.message || 'An unexpected rendering error occurred in this section.'}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={this.resetErrorBoundary}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Try Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-800 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy details'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Full Page Error Fallback UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-800 selection:bg-rose-100 selection:text-rose-900">
          <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
            {/* Top Color Banner */}
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-blue-500" />

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {this.props.title || 'Something went wrong'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    An unexpected application error prevented this page from loading properly.
                  </p>
                </div>
              </div>

              {/* Error Message Box */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3.5 mb-5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  <span>Error Summary</span>
                  <span className="text-[10px] text-rose-600 font-mono lowercase">
                    {error?.name || 'runtime error'}
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-medium font-mono break-words">
                  {error?.message || 'Unknown runtime error occurred during rendering.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                <button
                  type="button"
                  onClick={this.resetErrorBoundary}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Reload Page</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Go to Homepage</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleGoBack}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors cursor-pointer ml-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>
              </div>

              {/* Technical Details Toggle */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>{showDetails ? 'Hide technical details' : 'View technical details'}</span>
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Copy full error stack to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied to clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy error</span>
                      </>
                    )}
                  </button>
                </div>

                {showDetails && (
                  <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 space-y-2 select-text shadow-inner">
                    {error?.stack && (
                      <div>
                        <div className="text-slate-400 font-bold mb-1">// Stack Trace:</div>
                        <pre className="whitespace-pre-wrap leading-relaxed text-rose-300/90">{error.stack}</pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-slate-400 font-bold mb-1">// Component Stack:</div>
                        <pre className="whitespace-pre-wrap leading-relaxed text-amber-200/80">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Helpful footer note */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <LifeBuoy className="w-3 h-3 text-blue-500" />
                  Need assistance? Contact customer support.
                </span>
                <span>Error Code: ERR_RENDER_FAIL</span>
              </div>

            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
