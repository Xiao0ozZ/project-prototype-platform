import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button, Result } from '@/ui/ant';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React platform render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="system-result-page">
        <Result
          status="error"
          title="页面暂时无法显示"
          subTitle={this.state.error.message}
          extra={<Button onClick={() => window.location.reload()}>重新加载</Button>}
        />
      </main>
    );
  }
}
