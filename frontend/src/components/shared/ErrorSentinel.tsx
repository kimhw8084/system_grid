import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorSentinel extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Critical Runtime Error Captured:', error, errorInfo);
    // Log to frontend_critical.log (simulated via console for now, or could call a log API)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-10">
          <h2 className="text-2xl font-black text-rose-500 uppercase tracking-widest">System Failure</h2>
          <p className="mt-4 text-slate-400">A critical runtime error has occurred. State has been captured.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
