import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (err: Error) => void;
};

type State = { hasError: boolean };

/** Small error boundary for optional UI (charts, embeds, etc.). */
export class InlineErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[InlineErrorBoundary] Caught error:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

