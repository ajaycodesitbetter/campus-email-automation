import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-center mb-2">
            <div className="text-red-600 mr-2">⚠️</div>
            <h3 className="text-red-800 font-medium">
              Component Error: {this.props.componentName || 'Unknown Component'}
            </h3>
          </div>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
            <div className="bg-red-100 p-2 rounded text-xs font-mono">
              <p><strong>Error:</strong> {this.state.error?.message}</p>
              <p><strong>Stack:</strong></p>
              <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
            </div>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
