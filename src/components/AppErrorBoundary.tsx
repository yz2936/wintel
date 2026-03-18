import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application crashed', error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,0,204,0.18),_transparent_35%),linear-gradient(135deg,_#07011f_0%,_#0B004E_52%,_#1d0b59_100%)] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-magenta">Runtime Error</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">The app crashed in the browser.</h1>
            <p className="mt-4 text-sm leading-7 text-white/75">
              {this.state.error.message || 'Unknown client-side error.'}
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              <p>Open the browser console for the full stack trace.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
