'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, X, Maximize2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSessions } from '@/features/ai-payofflab';
import { usePathname, Link } from '@/i18n/navigation';
import AIPayoffLabClient from './client';
import type { Session } from './types';

export function PayoffLabFloatingWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [hasFetched, setHasFetched] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('payofflab-widget-open');
        setIsOpen(saved === null ? true : saved === 'true');
        setHydrated(true);
    }, []);

    const toggle = useCallback(() => {
        setIsOpen(prev => {
            const next = !prev;
            localStorage.setItem('payofflab-widget-open', String(next));
            return next;
        });
    }, []);

    useEffect(() => {
        if (isOpen && !hasFetched) {
            setHasFetched(true);
            getSessions()
                .then(data => setSessions(data as Session[]))
                .catch(() => {});
        }
    }, [isOpen, hasFetched]);

    // Standalone ai-payofflab sayfasında veya hydration öncesinde gösterme
    if (!hydrated || pathname.includes('/admin/ai-payofflab')) return null;

    return (
        <motion.div
            initial={false}
            animate={{ x: isOpen ? 0 : 480 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 h-full w-[480px] z-50 flex flex-col shadow-2xl border-l border-border/60 bg-background"
        >
            {/* Sol kenara yapışık sekme butonu */}
            <button
                onClick={toggle}
                className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 z-[60] flex flex-col items-center gap-4 py-6 px-2.5 rounded-l-2xl btn-primary-gradient text-white shadow-2xl shadow-purple-500/40 border border-r-0 border-white/10 transition-all hover:pr-4 group overflow-hidden"
                aria-label={isOpen ? 'Payoff Lab AI kapat' : 'Payoff Lab AI aç'}
            >
                <div className="flex flex-col items-center gap-6">
                    <AnimatePresence mode="wait" initial={false}>
                        {isOpen ? (
                            <motion.div
                                key="close"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <X className="w-5 h-5" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="open"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="relative"
                            >
                                <Bot className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-white animate-pulse" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <span className="font-bold text-xs tracking-[0.1em] uppercase whitespace-nowrap [writing-mode:vertical-lr] rotate-180">
                        {isOpen ? 'Kapat' : 'Payoff Lab AI'}
                    </span>
                </div>
            </button>

            {/* Panel İçeriği */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-sm leading-none">Payoff Lab AI</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full btn-primary-gradient text-white font-bold uppercase tracking-wider">
                            Pro 1.5
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Link href="/admin/ai-payofflab">
                        <button
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            title="Tam ekranda aç"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </Link>
                    <button
                        onClick={toggle}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                        title="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <AIPayoffLabClient initialSessions={sessions} widgetMode />
            </div>
        </motion.div>
    );
}
