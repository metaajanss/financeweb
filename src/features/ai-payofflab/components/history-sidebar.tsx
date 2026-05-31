"use client";

import { motion } from 'framer-motion';
import { MessageSquare, Plus, PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/shared/utils';
import { useTranslations } from 'next-intl';
import { Session } from './types';
import { useState } from 'react';

interface HistorySidebarProps {
    sessions: Session[];
    currentSessionId: string | null;
    onSessionSelect: (id: string) => void;
    onNewChat: () => void;
    historyOpen: boolean;
    setHistoryOpen: (open: boolean) => void;
}

export default function HistorySidebar({ 
    sessions, 
    currentSessionId, 
    onSessionSelect, 
    onNewChat, 
    historyOpen, 
    setHistoryOpen
}: HistorySidebarProps) {
    const t = useTranslations('PayoffLabAssistant');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSessions = sessions.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div 
            animate={{ 
                width: historyOpen ? 320 : 0, 
                opacity: historyOpen ? 1 : 0,
                x: historyOpen ? 0 : -20
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="border-r border-border/40 bg-card/30 backdrop-blur-xl flex flex-col overflow-hidden shrink-0 h-full relative z-30 shadow-2xl"
        >
            {/* Sidebar Header */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                        {t('history')}
                    </p>
                    <button 
                        onClick={() => setHistoryOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-background/80 text-muted-foreground transition-colors md:hidden"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </div>

                <button 
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 btn-primary-gradient text-white rounded-2xl transition-all duration-300 font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] border border-white/10 group mb-2"
                >
                    <Plus className="w-4 h-4 transition-transform duration-500 group-hover:rotate-90" />
                    {t('newChat')}
                </button>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full bg-background/50 border border-border/40 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
                    />
                </div>
            </div>
            
            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 scrollbar-thin scrollbar-thumb-border/40 hover:scrollbar-thumb-border transition-colors">
                {filteredSessions.map((session, index) => {
                    const isActive = currentSessionId === session.id;
                    return (
                        <motion.button
                            key={session.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onSessionSelect(session.id)}
                            className={cn(
                                "w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 group border relative overflow-hidden",
                                isActive 
                                    ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-md ring-1 ring-primary/10" 
                                    : "border-transparent hover:bg-background/40 hover:border-border/60 text-foreground/60 hover:text-foreground"
                            )}
                        >
                            {/* Active Glow Effect */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full"
                                />
                            )}
                            
                            <div className={cn(
                                "p-2.5 rounded-xl shrink-0 transition-all duration-300",
                                isActive 
                                    ? "btn-primary-gradient text-white shadow-lg shadow-primary/20" 
                                    : "bg-muted/50 border border-border/40 text-muted-foreground group-hover:bg-background group-hover:text-primary"
                            )}>
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 overflow-hidden">
                                <span className={cn(
                                    "block truncate text-sm transition-colors",
                                    isActive ? "font-bold text-foreground" : "font-semibold group-hover:text-foreground"
                                )}>
                                    {session.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 font-medium">
                                    {new Date(session.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}

                {filteredSessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40 text-center">
                        <MessageSquare className="w-8 h-8 mb-2" />
                        <p className="text-xs font-medium">No conversations found</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
