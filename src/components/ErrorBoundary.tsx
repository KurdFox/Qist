import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this['state'] = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this['state'].hasError) {
      let errorMessage = "ببورە، هەڵەیەک ڕوویدا.";
      try {
        const parsedError = JSON.parse(this['state'].error?.message || "");
        if (parsedError.error) {
          errorMessage = `هەڵەی داتابەیس: ${parsedError.error}`;
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center border border-red-100 dark:border-red-900/30">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">هەڵەیەک ڕوویدا</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
            >
              <RefreshCcw size={18} />
              دووبارە بارکردنەوە
            </button>
          </div>
        </div>
      );
    }

    return this['props'].children;
  }
}

export default ErrorBoundary;
