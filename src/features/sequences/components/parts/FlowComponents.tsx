'use client';

import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/shared/utils';

export function FlowNodeComp({ type, title, icon, ai, ab, active, onClick }: any) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            onClick={onClick}
            className={cn(
                "w-56 bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 shadow-sm relative cursor-pointer transition-all",
                active ? "ring-4 ring-primary/10 border-primary" : "border-slate-100 dark:border-slate-800"
            )}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black truncate uppercase tracking-tight">{title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{type}</p>
                </div>
            </div>
            <div className="flex gap-2">
                {ai && <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">AI</div>}
                {ab && <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">A/B</div>}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-full z-10" />
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-full z-10" />
        </motion.div>
    );
}

export function Connector({ onAddClick, onYesClick, onNoClick, isCondition, yesLabel = "YES", noLabel = "NO" }: any) {
    if (isCondition) {
        return (
            <div className="flex flex-col items-center py-6 w-full max-w-[700px] relative">
                <div className="h-10 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                <div className="w-full flex justify-between relative px-4">
                    <div className="flex flex-col items-center flex-1 pt-8 relative group">
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-widest border border-emerald-100 shadow-sm">{yesLabel}</div>
                        <button onClick={onYesClick} className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 flex items-center justify-center hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-lg active:scale-95 z-10">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex flex-col items-center flex-1 pt-8 relative group">
                        <div className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-widest border border-rose-100 shadow-sm">{noLabel}</div>
                        <button onClick={onNoClick} className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 flex items-center justify-center hover:border-rose-500 hover:text-rose-500 transition-all shadow-lg active:scale-95 z-10">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
                <div className="h-10"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center py-2">
            <div className="h-10 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
            <button onClick={onAddClick} className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95">
                <Plus size={14} />
            </button>
        </div>
    );
}

export function PaletteItem({ icon, title, desc, ai, onClick }: any) {
    return (
        <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-primary hover:ring-1 hover:ring-primary/20 transition-all group">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-500">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-tight">{title}</h4>
                    {ai && <Sparkles size={10} className="text-primary" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate font-medium">{desc}</p>
            </div>
        </div>
    );
}
