"use client";

import { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/shared/utils';
import { Message } from './types';

interface MessageBubbleProps {
    message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                "flex gap-4 w-full group",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-auto z-10 transition-transform duration-300 group-hover:scale-105",
                isUser 
                    ? "btn-primary-gradient text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background" 
                    : "bg-gradient-to-br from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-inner ring-2 ring-background"
            )}>
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={cn(
                "max-w-[85%] lg:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed relative shadow-md transition-all duration-300",
                isUser 
                    ? "btn-primary-gradient text-white rounded-tr-none hover:shadow-primary/20" 
                    : "bg-card/80 backdrop-blur-md text-foreground rounded-tl-none border border-border/50 hover:border-primary/30"
            )}>
                {/* Visual Depth Overlay */}
                <div className={cn(
                    "absolute inset-0 rounded-2xl pointer-events-none border border-white/5",
                    isUser ? "highlight-white/10" : ""
                )} />
                
                <div className={cn(
                    "markdown-content prose prose-sm dark:prose-invert max-w-none relative z-10",
                    "prose-p:m-0 prose-pre:my-2 prose-ol:my-2 prose-ul:my-2 [&>*:last-child]:mb-0",
                    isUser ? "prose-headings:text-primary-foreground prose-strong:text-primary-foreground text-primary-foreground" : "prose-headings:text-foreground prose-strong:text-primary"
                )}>
                    <ReactMarkdown>
                        {message.content}
                    </ReactMarkdown>
                </div>
                
                <div className={cn(
                    "text-[10px] mt-1.5 opacity-60 flex items-center gap-1 font-medium",
                    isUser ? "text-white/80 justify-end" : "text-muted-foreground"
                )}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </motion.div>
    );
}

export default memo(MessageBubble);
