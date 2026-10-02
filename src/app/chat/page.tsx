"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useLanguage } from "@/context/LanguageContext";
import { getUserItem, removeUserItem, setUserItem } from "@/lib/userStorage";

marked.setOptions({ breaks: true, gfm: true });


interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export default function ChatPage() {
    const { t, language } = useLanguage();
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
            const stored = getUserItem("fitvision_chat_history");
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
        // Prefill from links like /chat?q=... (e.g. "Ask the AI coach about this" on Home)
        const q = new URLSearchParams(window.location.search).get("q");
        if (q) setInput(q.slice(0, 500));
    }, []);

    // Save to localStorage whenever messages change (after initial load)
    useEffect(() => {
        if (!isHistoryLoaded) return;
        try {
            setUserItem("fitvision_chat_history", JSON.stringify(messages));
        } catch {
            // ignore storage full
        }
    }, [messages, isHistoryLoaded]);

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
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
            setMessages(prev => [...prev, { role: "assistant", content: data.message, timestamp: Date.now() }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ ${t.chat.errorMessage}${err instanceof Error && err.message ? err.message : t.chat.errorFallback} ${t.chat.tryAgain}`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, t]);

    const clearHistory = () => {
        setMessages([]);
        removeUserItem("fitvision_chat_history");
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
        const locale = language === 'th' ? 'th-TH' : 'en-US';
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateGroup = (ts: number) => {
        const d = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return t.chat.today;
        if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday;
        const locale = language === 'th' ? 'th-TH' : 'en-US';
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
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
            <div className="flex flex-col h-[calc(100dvh-150px)] md:h-[calc(100dvh-80px)] max-w-4xl mx-auto w-full relative">

                {/* Top bar: Clear history (only when messages exist) */}
                {messages.length > 0 && (
                    <div className="relative z-20 flex items-center justify-between px-4 md:px-8 py-2 border-b border-white/5 bg-background-dark/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="material-symbols-outlined text-sm">history</span>
                            <span>{messages.length} {t.chat.messagesCount}</span>
                        </div>
                        {showClearConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{t.chat.confirmClear}</span>
                                <button onClick={clearHistory} className="text-sm text-orange-300 hover:text-orange-200 font-semibold transition-colors px-3 min-h-10 rounded-lg hover:bg-orange-500/10">
                                    {t.chat.clearNow}
                                </button>
                                <button onClick={() => setShowClearConfirm(false)} className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                                    {t.chat.cancelClear}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/5"
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
                        <div className="flex flex-col items-center justify-center min-h-full gap-6 py-2">
                            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center"><span className="material-symbols-outlined text-primary text-4xl">smart_toy</span></div>

                            <div className="text-center animate-chat-in">
                                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">
                                    {t.chat.title}
                                </h1>
                                <p className="text-slate-300 max-w-md leading-relaxed">
                                    {t.chat.subtitle}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                                {t.chat.suggestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q.text)}
                                        className="animate-chat-in flex items-start gap-3 p-4 rounded-2xl border border-white/10 bg-surface-dark hover:bg-white/[0.04] hover:border-white/25 transition-all text-left group relative overflow-hidden"
                                    >
                                        
                                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 transition-all relative z-10">
                                            <span className="material-symbols-outlined text-primary text-lg">{q.icon}</span>
                                        </div>
                                        <div className="relative z-10 flex-1 min-w-0">
                                            <span className="text-xs text-primary font-semibold">{q.tag}</span>
                                            <p className="text-sm text-slate-200 mt-0.5 leading-snug">{q.text}</p>
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
                                <span className="text-xs text-slate-400 font-medium px-3 py-1 rounded-full border border-white/5 bg-surface-dark">
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
                                                <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
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
                                            <span className={`text-xs text-slate-400 ${msg.role === "user" ? "text-right" : "text-left ml-1"}`}>
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
                                <span className="material-symbols-outlined text-primary text-sm animate-pulse">smart_toy</span>
                            </div>
                            <div className="bg-surface-dark border border-white/5 rounded-2xl rounded-bl-sm px-5 py-4">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                    <span className="text-xs text-slate-400 ml-2">{t.chat.aiThinking}</span>
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
                                aria-label={t.chat.inputPlaceholder}
                                rows={1}
                                className="w-full bg-surface-dark border border-white/10 focus:border-primary/40 rounded-2xl px-5 py-3.5 pr-12 text-sm text-white placeholder:text-slate-400 outline-none resize-none transition-all"
                                disabled={isLoading}
                            />
                            {input.length > 0 && (
                                <span className="absolute right-4 bottom-3.5 text-xs text-slate-400">{input.length}</span>
                            )}
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            aria-label={language === "th" ? "ส่งข้อความ" : "Send message"}
                            className="h-[48px] w-[48px] rounded-2xl bg-primary text-black flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_upward</span>
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-xs">auto_awesome</span>
                        {t.chat.poweredBy}
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
