"use client";

import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSend: (e?: React.FormEvent) => void;
    loading: boolean;
    placeholder: string;
}

export default function ChatInput({ input, setInput, onSend, loading, placeholder }: ChatInputProps) {
    return (
        <div className="px-4 py-4 shrink-0">
            <form 
                onSubmit={onSend}
                className="relative max-w-4xl mx-auto"
            >
                <div className="relative group rounded-[2rem] p-[1px] bg-gradient-to-r from-border via-border to-border focus-within:from-primary focus-within:to-indigo-500 transition-all duration-300 shadow-lg">
                    <div className="relative flex items-center bg-background/90 backdrop-blur-xl rounded-[calc(2rem-1px)] overflow-hidden">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={placeholder}
                            disabled={loading}
                            className="w-full bg-transparent py-4 pl-7 pr-16 focus:outline-none transition-all disabled:opacity-50 text-base placeholder:text-muted-foreground/50 font-medium"
                        />
                        <div className="absolute right-2 flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className={cn(
                                    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                                    input.trim() && !loading
                                        ? "btn-primary-gradient text-primary-foreground transform hover:scale-105 active:scale-95 hover:shadow-primary/40"
                                        : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5 transform -rotate-12 group-focus-within:rotate-0 transition-transform duration-300" />}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Subtle Hint */}
                <p className="text-[10px] text-center text-muted-foreground/40 mt-2 font-medium tracking-wide uppercase">
                    Jumpix AI can schedule meetings and analyze leads automatically
                </p>
            </form>
        </div>
    );
}
