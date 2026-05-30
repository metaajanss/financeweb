'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, X, ChevronRight } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { searchLeads, type Lead } from '@/features/leads';

export function GlobalSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Lead[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (query.length <= 1) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        let cancelled = false;

        const delayDebounceFn = setTimeout(async () => {
            try {
                const searchResults = await searchLeads(query);
                if (!cancelled) {
                    setResults(searchResults || []);
                    setIsSearching(false);
                }
            } catch {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(delayDebounceFn);
            setIsSearching(false);
        };
    }, [query]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/admin/leads?search=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    return (
        <div className="flex-1 max-w-xl relative group">
            <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search leads..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-1.5 bg-background/50 border border-border/60 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50 shadow-sm"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </form>

            {query.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-1">Search Results</span>
                        {isSearching && <Loader2 size={12} className="animate-spin text-primary" />}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.length === 0 && !isSearching ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No results found for &quot;{query}&quot;
                            </div>
                        ) : (
                            results.map((lead) => (
                                <button
                                    key={lead.id}
                                    onClick={() => {
                                        router.push(`/admin/leads?search=${lead.email}`);
                                        setQuery('');
                                    }}
                                    className="w-full p-3 border-b border-border last:border-0 hover:bg-muted/10 transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {lead.first_name?.[0]}{lead.last_name?.[0]}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{lead.first_name} {lead.last_name}</div>
                                            <div className="text-xs text-muted-foreground lowercase">{lead.email}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                </button>
                            ))
                        )}
                        <div className="p-2 bg-muted/5">
                            <button
                                onClick={() => {
                                    router.push(`/admin/leads?search=${query}`);
                                    setQuery('');
                                }}
                                className="w-full p-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors text-center uppercase tracking-widest"
                            >
                                View all in Leads
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
