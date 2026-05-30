'use client';

import { X, Ghost, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import React, { useState } from 'react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;
}

export interface FilterState {
    statuses: string[];
    sources: string[];
    ghostStatus: 'all' | 'ghost' | 'active';
    willRespond: 'all' | 'likely' | 'unlikely';
}

export const FilterModal = React.memo(function FilterModal({ isOpen, onClose, onApply, currentFilters }: FilterModalProps) {
    const [filters, setFilters] = useState<FilterState>(currentFilters);

    const statuses = ['new', 'contacted', 'qualified', 'booked', 'unqualified'];
    const sources = ['manual', 'website', 'referral', 'social', 'email', 'google ads', 'instagram', 'tiktok'];

    const toggleStatus = (status: string) => {
        setFilters(prev => ({
            ...prev,
            statuses: prev.statuses.includes(status)
                ? prev.statuses.filter(s => s !== status)
                : [...prev.statuses, status]
        }));
    };

    const toggleSource = (source: string) => {
        setFilters(prev => ({
            ...prev,
            sources: prev.sources.includes(source)
                ? prev.sources.filter(s => s !== source)
                : [...prev.sources, source]
        }));
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        setFilters({ statuses: [], sources: [], ghostStatus: 'all', willRespond: 'all' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <h2 className="text-2xl font-bold">Filter Leads</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
                    {/* Status Filters */}
                    <div>
                        <h3 className="font-semibold mb-3">Status</h3>
                        <div className="space-y-2">
                            {statuses.map(status => (
                                <label key={status} className="flex items-center gap-3 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={filters.statuses.includes(status)}
                                        onChange={() => toggleStatus(status)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="capitalize">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Source Filters */}
                    <div>
                        <h3 className="font-semibold mb-3">Source</h3>
                        <div className="space-y-2">
                            {sources.map(source => (
                                <label key={source} className="flex items-center gap-3 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={filters.sources.includes(source)}
                                        onChange={() => toggleSource(source)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="capitalize">{source}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Ghost Lead Filter */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Ghost size={16} />
                            Ghost Status
                        </h3>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'All Leads', desc: 'Show all leads' },
                                { value: 'active', label: 'Active Only', desc: 'Leads that are responding' },
                                { value: 'ghost', label: 'Ghost Leads', desc: 'Leads that stopped responding' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="ghostStatus"
                                        checked={filters.ghostStatus === option.value}
                                        onChange={() => setFilters(prev => ({ ...prev, ghostStatus: option.value as FilterState['ghostStatus'] }))}
                                        className="w-4 h-4 mt-0.5 rounded-full border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <div>
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Will Respond Filter */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <MessageCircle size={16} />
                            Response Prediction
                        </h3>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'All Leads', desc: 'No prediction filter' },
                                { value: 'likely', label: 'Likely to Respond', desc: 'High response probability (70%+)' },
                                { value: 'unlikely', label: 'Unlikely to Respond', desc: 'Low response probability' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="willRespond"
                                        checked={filters.willRespond === option.value}
                                        onChange={() => setFilters(prev => ({ ...prev, willRespond: option.value as FilterState['willRespond'] }))}
                                        className="w-4 h-4 mt-0.5 rounded-full border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <div>
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-border shrink-0 bg-surface rounded-b-2xl">
                    <Button type="button" variant="outline" onClick={handleReset} className="flex-1">
                        Reset
                    </Button>
                    <Button onClick={handleApply} className="flex-1">
                        Apply Filters
                    </Button>
                </div>
            </div>
        </div>
    );
});
