import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the fallback, e.g. the view name */
  label?: string;
  /** Reset key — when it changes, the boundary clears its error (e.g. on view switch) */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/runtime errors in its subtree so one broken component doesn't
 * white-screen the whole app. Shows a recoverable fallback with a retry button.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI error caught by boundary:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // Clear the error when the reset key changes (e.g. user navigates away)
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(220,80,80,0.12)', border: '1px solid rgba(220,80,80,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--tp)' }}>
              Something went wrong{this.props.label ? ` in ${this.props.label}` : ''}
            </p>
            <p className="text-[11px] mt-1.5 max-w-[360px]" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2 rounded-[7px] text-[11px] font-bold tracking-[0.07em] uppercase cursor-pointer transition-colors"
            style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
