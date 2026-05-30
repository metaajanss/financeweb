'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function ImpersonationBar() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="fixed bottom-6 left-6 z-[9999]"
            >
                <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 dark:border-zinc-200 backdrop-blur-xl">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-60 leading-none mb-1">Super Admin Mode</span>
                        <span className="text-xs font-bold leading-none">Acme Inc.</span>
                    </div>

                    <div className="h-6 w-px bg-white/10 dark:bg-zinc-300"></div>

                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1.5 hover:bg-white/10 dark:hover:bg-zinc-200 rounded-lg transition-colors group"
                        title="Exit Impersonation"
                    >
                        <X size={14} className="opacity-60 group-hover:opacity-100" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
