import React from 'react';
import { X } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('❌ Error Boundary caught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-red-400 p-8 text-center bg-gray-900">
                    <X size={48} className="mb-4 text-red-500" />
                    <p className="font-bold text-lg mb-2">Something went wrong</p>
                    <p className="text-sm text-gray-400 mb-4">{this.state.error?.message || 'Unknown error'}</p>
                    <details className="text-xs text-left bg-gray-800 p-4 rounded max-w-2xl mb-4 overflow-auto max-h-60">
                        <summary className="cursor-pointer mb-2 font-bold">Error Details</summary>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
