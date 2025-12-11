import React, { Component } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100 flex flex-col items-center">
                        <div className="bg-red-50 p-4 rounded-full mb-6">
                            <AlertTriangle size={48} className="text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-500 mb-6">
                            An unexpected error occurred in the application. We've logged the issue and notified our team.
                        </p>

                        {/* Optional: Show technical error details in development */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-gray-100 p-3 rounded text-left text-xs text-gray-700 w-full mb-6 overflow-auto max-h-32">
                                <code>{this.state.error.toString()}</code>
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium w-full justify-center"
                        >
                            <RefreshCcw size={18} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
