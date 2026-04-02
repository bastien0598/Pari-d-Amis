import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oups, un problème est survenu !</h2>
            <p className="text-gray-600 mb-4">
              Nous sommes désolés, mais une erreur inattendue s'est produite.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono text-gray-800 overflow-auto max-h-40 mb-4">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
