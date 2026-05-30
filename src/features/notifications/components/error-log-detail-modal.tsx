'use client';

import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { ErrorLog } from '@/shared/types/error-logs.types';

interface ErrorLogDetailModalProps {
    error: ErrorLog;
    onClose: () => void;
}

export function ErrorLogDetailModal({ error, onClose }: ErrorLogDetailModalProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high':
                return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium':
                return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'low':
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default:
                return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">Error Details</h2>
                        <span
                            className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${getSeverityColor(
                                error.severity
                            )}`}
                        >
                            {error.severity}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar space-y-6">
                    {/* Error Message */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider">
                                Error Message
                            </label>
                            <button
                                onClick={() => copyToClipboard(error.message)}
                                className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground transition-colors flex items-center gap-1 text-xs"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="p-4 bg-surface/50 border border-border rounded-lg">
                            <p className="text-sm break-words">{error.message}</p>
                        </div>
                    </div>

                    {/* Stack Trace */}
                    {error.stack_trace && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-muted uppercase tracking-wider">
                                    Stack Trace
                                </label>
                                <button
                                    onClick={() => copyToClipboard(error.stack_trace || '')}
                                    className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground transition-colors flex items-center gap-1 text-xs"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <div className="p-4 bg-surface/50 border border-border rounded-lg overflow-x-auto">
                                <pre className="text-xs font-mono text-muted whitespace-pre-wrap break-words">
                                    {error.stack_trace}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Error Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Error Type */}
                        <div>
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                Error Type
                            </label>
                            <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                <p className="text-sm">{error.error_type}</p>
                            </div>
                        </div>

                        {/* Timestamp */}
                        <div>
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                Timestamp
                            </label>
                            <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                <p className="text-sm">{new Date(error.created_at).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Tenant ID */}
                        {error.tenant_id && (
                            <div>
                                <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                    Tenant ID
                                </label>
                                <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                    <p className="text-sm font-mono">{error.tenant_id}</p>
                                </div>
                            </div>
                        )}

                        {/* User ID */}
                        {error.user_id && (
                            <div>
                                <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                    User ID
                                </label>
                                <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                    <p className="text-sm font-mono">{error.user_id}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* URL */}
                    {error.url && (
                        <div>
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                URL
                            </label>
                            <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                <a
                                    href={error.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline break-all"
                                >
                                    {error.url}
                                </a>
                            </div>
                        </div>
                    )}

                    {/* User Agent */}
                    {error.user_agent && (
                        <div>
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                User Agent
                            </label>
                            <div className="p-3 bg-surface/50 border border-border rounded-lg">
                                <p className="text-xs text-muted break-all">{error.user_agent}</p>
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    {error.metadata && Object.keys(error.metadata).length > 0 && (
                        <div>
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider block mb-2">
                                Additional Metadata
                            </label>
                            <div className="p-4 bg-surface/50 border border-border rounded-lg overflow-x-auto">
                                <pre className="text-xs font-mono text-muted">
                                    {JSON.stringify(error.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-surface/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
