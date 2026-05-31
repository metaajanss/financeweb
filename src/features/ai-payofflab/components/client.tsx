"use client";

import { SidebarTrigger } from '@/shared/components/ui/sidebar';
import { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Plus, 
    Sparkles, 
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { sendMessage, createNewSession, getMessages } from '@/features/ai-payofflab';
import { useTranslations } from 'next-intl';

// New Components
import HistorySidebar from './history-sidebar';
import MessageList from './message-list';
import ChatInput from './chat-input';
import { Message, Session } from './types';

export default function AIPayoffLabClient({ initialSessions, widgetMode = false }: { initialSessions: Session[]; widgetMode?: boolean }) {
    const t = useTranslations('PayoffLabAssistant');
    
    // State
    const [sessions, setSessions] = useState<Session[]>(initialSessions);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessions[0]?.id || null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFetchingMessages, setIsFetchingMessages] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(!widgetMode);
    
    // Cache for messages to prevent redundant fetching and provide instant UI
    const messageCache = useRef<Record<string, Message[]>>({});

    // Load messages when session changes
    const loadMessages = useCallback(async (sessionId: string) => {
        // If already in cache, show it immediately but refresh in background if needed
        // For simplicity, we'll just show cache if exists, or show loader if not.
        if (messageCache.current[sessionId]) {
            setMessages(messageCache.current[sessionId]);
            setIsFetchingMessages(false);
            return;
        }

        setIsFetchingMessages(true);
        try {
            const msgs = await getMessages(sessionId);
            const formattedMsgs = msgs as unknown as Message[];
            setMessages(formattedMsgs);
            messageCache.current[sessionId] = formattedMsgs;
        } catch (error) {
            console.error("Failed to load messages:", error);
            setMessages([]);
        } finally {
            setIsFetchingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (currentSessionId) {
            loadMessages(currentSessionId);
        } else {
            setMessages([]);
            setIsFetchingMessages(false);
        }
    }, [currentSessionId, loadMessages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        let sessionId = currentSessionId;
        
        // If no session, create one first
        if (!sessionId) {
            const res = (await createNewSession(input.slice(0, 30) + '...')) as any;
            if (res.data) {
                sessionId = res.data.id;
                setCurrentSessionId(sessionId);
                setSessions(prev => [res.data, ...prev]);
            } else {
                return;
            }
        }

        const userMsg: Message = {
            id: 'temp-' + Math.random(),
            role: 'user',
            content: input,
            created_at: new Date().toISOString()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        // Update cache
        if (sessionId) {
            messageCache.current[sessionId] = updatedMessages;
        }
        
        setInput('');
        setLoading(true);

        try {
            const res = (await sendMessage(sessionId!, input)) as any;
            if (res.data) {
                const finalMessages = [...updatedMessages, res.data as Message];
                setMessages(finalMessages);
                messageCache.current[sessionId!] = finalMessages;
            } else if (res.error) {
                const errorMsg: Message = {
                    id: 'error-' + Math.random(),
                    role: 'assistant',
                    content: `❌ **Error:** ${res.error}`,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (err) {
            console.error("Post message error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setInput('');
    };

    const handleSessionSelect = (id: string) => {
        if (id === currentSessionId) return;
        setCurrentSessionId(id);
    };

    return (
        <div className={`flex flex-row h-full overflow-hidden bg-background relative selection:bg-primary/20 ${widgetMode ? 'rounded-none' : ''}`}>
            
            {/* Background Mesh Gradient (Premium Feel) */}
            {!widgetMode && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#4F46E5] blur-[120px] rounded-full" />
                </div>
            )}

            {!widgetMode && (
                <HistorySidebar 
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                    historyOpen={historyOpen}
                    setHistoryOpen={setHistoryOpen}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-transparent min-w-0 min-h-0 z-10">
                
                {/* Header — hidden in widget mode (widget has its own header) */}
                {!widgetMode && (
                <header className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-background/60 backdrop-blur-xl z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
                        <div className="w-px h-5 bg-border/60" />
                        
                        <button 
                            onClick={() => setHistoryOpen(!historyOpen)}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all group shrink-0"
                            title={historyOpen ? "Menüyü Gizle" : "Menüyü Göster"}
                        >
                            {historyOpen ? (
                                <PanelLeftClose className="w-5 h-5 group-hover:text-primary transition-colors" />
                            ) : (
                                <PanelLeftOpen className="w-5 h-5 group-hover:text-primary transition-colors" />
                            )}
                        </button>

                        <div className="flex items-center gap-3 ml-2">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 ring-1 ring-primary/5">
                                <Sparkles className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="font-bold text-sm tracking-tight flex items-center gap-2 text-foreground/90">
                                    {t('title')}
                                    <span className="text-[10px] px-2 py-0.5 rounded-full btn-primary-gradient text-white font-bold uppercase tracking-wider shadow-sm">
                                        Pro 1.5
                                    </span>
                                </h2>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5 opacity-70">
                                    {t('subtitle')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleNewChat}
                        className="hidden md:flex items-center gap-2 py-2 px-4 bg-background/50 hover:bg-background border border-border/60 rounded-xl transition-all duration-300 font-bold text-xs shadow-sm hover:shadow-md hover:border-primary/30 group"
                    >
                        <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-300" />
                        <span>{t('newChat')}</span>
                    </button>
                </header>
                )}

                <MessageList 
                    messages={messages}
                    loading={loading}
                    isFetchingMessages={isFetchingMessages}
                    onSuggestionClick={setInput}
                />

                <ChatInput 
                    input={input}
                    setInput={setInput}
                    onSend={handleSendMessage}
                    loading={loading}
                    placeholder={t('placeholder')}
                />
            </div>
        </div>
    );
}
