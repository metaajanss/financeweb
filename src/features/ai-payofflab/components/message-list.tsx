"use client";

import { useTranslations } from 'next-intl';
import { useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils';
import MessageBubble from './message-bubble';
import { Message } from './types';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface MessageListProps {
    messages: Message[];
    loading: boolean;
    isFetchingMessages: boolean;
    onSuggestionClick: (suggestion: string) => void;
}

function MessageList({ messages, loading, isFetchingMessages, onSuggestionClick }: MessageListProps) {
    const t = useTranslations('PayoffLabAssistant');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, isFetchingMessages]);

    if (isFetchingMessages) {
        return (
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("flex gap-4", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
                        <Skeleton className="w-10 h-10 rounded-2xl" />
                        <Skeleton className={cn("h-20 rounded-2xl w-[60%]", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="p-4 space-y-4 flex flex-col min-h-full justify-end">
                {(messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant')) && !loading && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 my-10"
                    >
                        {messages.length === 0 && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                    <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-b from-primary/10 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-xl">
                                        <Bot className="w-10 h-10" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                        {t('welcomeTitle')}
                                    </h3>
                                    <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                                        {t('welcomeDesc')}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3 w-full", messages.length > 0 ? "mt-4" : "mt-8")}>
                            {[
                                t('suggestions.leads'),
                                t('suggestions.meetings'),
                                t('suggestions.integration'),
                                t('suggestions.analysis')
                            ].map((suggestion, index) => (
                                <motion.button 
                                    key={suggestion}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="text-left p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg transition-all group flex items-start gap-3"
                                >
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <span className="text-muted-foreground group-hover:text-foreground font-medium transition-colors leading-relaxed">
                                        {suggestion}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner mt-auto ring-2 ring-background">
                            <Bot className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div className="bg-card/80 backdrop-blur-md p-4 lg:p-5 rounded-2xl rounded-bl-sm border border-border/50 shadow-lg flex items-center gap-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 w-6 h-6 bg-primary/20 rounded-full animate-ping" />
                                <Loader2 className="w-5 h-5 animate-spin text-primary relative z-10" />
                            </div>
                            <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                                {t('analyzing')}
                            </span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>
        </div>
    );
}

export default memo(MessageList);
