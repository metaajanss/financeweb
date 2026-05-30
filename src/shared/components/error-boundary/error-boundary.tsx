'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logError } from '@/core/errors/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary Component
 * Catches React component errors and logs them automatically
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Detect ChunkLoadError and reload
        const isChunkError = error.name === 'ChunkLoadError' || 
                            error.message.includes('Loading chunk') || 
                            error.message.includes('ChunkLoadError');

        if (isChunkError) {
            console.warn('ChunkLoadError detected. Attempting to recover by reloading page...');
            
            // Avoid infinite reload loop
            const lastReload = sessionStorage.getItem('last_chunk_error_reload');
            const now = Date.now();
            
            if (!lastReload || now - parseInt(lastReload) > 30000) { // 30 seconds threshold
                sessionStorage.setItem('last_chunk_error_reload', now.toString());
                window.location.reload();
                return;
            }
        }

        // Log the error to our error logging system
        logError({
            error_type: 'component_error',
            message: error.message,
            stack_trace: error.stack,
            metadata: {
                componentStack: errorInfo.componentStack,
                errorInfo: errorInfo,
                isChunkError
            },
        });

        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    handleGoHome = () => {
        window.location.href = '/admin';
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-md w-full">
                        <div className="glass-panel p-8 rounded-2xl border border-red-500/20">
                            <div className="flex flex-col items-center text-center space-y-6">
                                {/* Error Icon */}
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-red-500" />
                                </div>

                                {/* Error Message */}
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Something went wrong
                                    </h1>
                                    <p className="text-muted text-sm">
                                        We&apos;ve encountered an unexpected error. Our team has been notified and is working on a fix.
                                    </p>
                                </div>

                                {/* Error Details (only in development) */}
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="w-full p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                                        <p className="text-xs font-mono text-red-400 break-all">
                                            {this.state.error.message}
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={this.handleReset}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 btn-primary-gradient rounded-lg font-medium"
                                    >
                                        <RefreshCw size={16} />
                                        Try Again
                                    </button>
                                    <button
                                        onClick={this.handleGoHome}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface text-foreground rounded-lg hover:bg-surface/80 transition-colors font-medium border border-border"
                                    >
                                        <Home size={16} />
                                        Go Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
