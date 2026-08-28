"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useLanguage } from "@/context/LanguageContext";

marked.setOptions({ breaks: true, gfm: true });

const STORAGE_KEY = "fitvision_chat_history";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export default function ChatPage() {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Message[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }
        } catch {
            // ignore corrupt data
        }
        setIsHistoryLoaded(true);
    }, []);

    // Save to localStorage whenever messages change (after initial load)
    useEffect(() => {
        if (!isHistoryLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch {
            // ignore storage full
        }
    }, [messages, isHistoryLoaded]);

    // Run entry animations only when there are no messages (empty state)
    useEffect(() => {
        if (isHistoryLoaded && messages.length === 0) {
            
            
        }
    }, [isHistoryLoaded, messages.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = useCallback(async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: Message = { role: "user", content: messageText, timestamp: Date.now() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        if (inputRef.current) inputRef.current.style.height = "auto";

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(prev => [...prev, { role: "assistant", content: data.message, timestamp: Date.now() }]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ ${t.chat.errorMessage}${err.message || t.chat.errorFallback} ${t.chat.tryAgain}`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, t]);

    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        setShowClearConfirm(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const renderMarkdown = (text: string): string => {
        const raw = marked(text) as string;
        return DOMPurify.sanitize(raw, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
            ALLOW_DATA_ATTR: false,
        });
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateGroup = (ts: number) => {
        const d = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return t.chat.today;
        if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday;
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Group messages by date
    const groupedMessages: { date: string; msgs: Message[] }[] = [];
    messages.forEach(msg => {
        const dateLabel = formatDateGroup(msg.timestamp);
        const last = groupedMessages[groupedMessages.length - 1];
        if (!last || last.date !== dateLabel) {
            groupedMessages.push({ date: dateLabel, msgs: [msg] });
        } else {
            last.msgs.push(msg);
        }
    });

    if (!isHistoryLoaded) return null;

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100dvh-64px)] md:h-screen max-w-4xl mx-auto w-full relative">

                {/* Background ambient glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]"></div>
                </div>

                {/* Top bar: Clear history (only when messages exist) */}
                {messages.length > 0 && (
                    <div className="relative z-20 flex items-center justify-between px-4 md:px-8 py-2 border-b border-white/5 bg-background-dark/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="material-symbols-outlined text-sm">history</span>
                            <span>{messages.length} {t.chat.messagesCount}</span>
                        </div>
                        {showClearConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{t.chat.confirmClear}</span>
                                <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                                    {t.chat.clearNow}
                                </button>
                                <button onClick={() => setShowClearConfirm(false)} className="text-xs text-slate-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                                    {t.chat.cancelClear}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/5"
                            >
                                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                {t.chat.clearHistory}
                            </button>
                        )}
                    </div>
                )}

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 scrollbar-hide relative z-10">

                    {/* Empty State */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-8">
                            <div className="animate-chat-in relative">
                                <div className="animate-glow-pulse w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center relative z-10">
                                    <span className="material-symbols-outlined text-primary text-4xl">neurology</span>
                                </div>
                                <div className="absolute -inset-3 bg-primary/10 rounded-3xl blur-xl"></div>
                            </div>

                            <div className="text-center animate-chat-in">
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                                    FitVision <span className="text-primary">{t.chat.title}</span>
                                </h1>
                                <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                                    {t.chat.subtitle}
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-2 animate-chat-in">
                                {[t.chat.features.biomechanics, t.chat.features.formAnalysis, t.chat.features.injuryPrevention, t.chat.features.bilingualSupport].map((f, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[11px] text-slate-500 font-medium">{f}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                                {t.chat.suggestions.map((q: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q.text)}
                                        className="animate-chat-in flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-surface-dark hover:bg-white/[0.04] hover:border-primary/30 transition-all text-left group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all relative z-10">
                                            <span className="material-symbols-outlined text-primary text-lg">{q.icon}</span>
                                        </div>
                                        <div className="relative z-10 flex-1 min-w-0">
                                            <span className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">{q.tag}</span>
                                            <p className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors mt-0.5 leading-snug">{q.text}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grouped Messages with Date Separators */}
                    {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                            {/* Date separator */}
                            <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-white/5"></div>
                                <span className="text-[10px] text-slate-600 font-medium px-3 py-1 rounded-full border border-white/5 bg-surface-dark">
                                    {group.date}
                                </span>
                                <div className="flex-1 h-px bg-white/5"></div>
                            </div>

                            {/* Messages in this group */}
                            <div className="space-y-5">
                                {group.msgs.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        {msg.role === "assistant" && (
                                            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                                                <span className="material-symbols-outlined text-primary text-sm">neurology</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[70%]">
                                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                                ? "bg-primary text-black rounded-br-sm font-medium"
                                                : "bg-surface-dark border border-white/5 text-slate-300 rounded-bl-sm"
                                                }`}
                                            >
                                                {msg.role === "assistant" ? (
                                                    <div className="prose-chat" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                                ) : msg.content}
                                            </div>
                                            <span className={`text-[10px] text-slate-700 ${msg.role === "user" ? "text-right" : "text-left ml-1"}`}>
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                        {msg.role === "user" && (
                                            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/5 flex items-center justify-center shrink-0 mt-1">
                                                <span className="material-symbols-outlined text-slate-300 text-sm">person</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                                <span className="material-symbols-outlined text-primary text-sm animate-pulse">neurology</span>
                            </div>
                            <div className="bg-surface-dark border border-white/5 rounded-2xl rounded-bl-sm px-5 py-4">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                    <span className="text-[11px] text-slate-600 ml-2">{t.chat.aiThinking}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="relative z-10 border-t border-white/5 bg-gradient-to-t from-background-dark via-background-dark to-transparent p-4 md:p-5 pb-safe">
                    <div className="flex items-end gap-3 max-w-3xl mx-auto">
                        <div className="flex-1 relative group">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                placeholder={t.chat.inputPlaceholder}
                                rows={1}
                                className="w-full bg-surface-dark border border-white/10 focus:border-primary/40 rounded-2xl px-5 py-3.5 pr-12 text-sm text-white placeholder:text-slate-600 outline-none resize-none transition-all focus:shadow-[0_0_15px_rgba(57,255,20,0.08)]"
                                disabled={isLoading}
                            />
                            {input.length > 0 && (
                                <span className="absolute right-4 bottom-3.5 text-[10px] text-slate-700">{input.length}</span>
                            )}
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="h-[48px] w-[48px] rounded-2xl bg-primary text-black flex items-center justify-center shrink-0 disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_upward</span>
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-700 mt-2.5 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                        {t.chat.poweredBy}
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
