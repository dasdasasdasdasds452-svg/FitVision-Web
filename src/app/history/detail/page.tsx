"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

interface AIAnalysis {
    severity: string;
    summary: string;
    corrections: { title: string; description: string; icon: string }[];
    trainerNote: string;
    warmupTip: string;
}

export default function ErrorReplayPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const [errorData, setErrorData] = useState<{ url: string; title: string; detail: string; time: string; exercise?: string } | null>(null);
    const [hasChecked, setHasChecked] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('fitvision_history_detail_data');
        if (stored) {
            setErrorData(JSON.parse(stored));
        }
        setHasChecked(true);
    }, [language]);

    // Fetch AI analysis when errorData loads
    const fetchAIAnalysis = useCallback(async (data: typeof errorData) => {
        if (!data) return;
        setIsAnalyzing(true);
        setAiError(null);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errorTitle: data.title,
                    errorDetail: data.detail,
                    exercise: data.exercise || 'Unknown',
                    timestamp: data.time, language: language,
                }),
            });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setAiAnalysis(result);
        } catch (err: any) {
            console.error('AI Analysis Error:', err);
            setAiError(err.message || 'Failed to get AI analysis');
        } finally {
            setIsAnalyzing(false);
        }
    }, [language]);

    useEffect(() => {
        if (errorData) {
            fetchAIAnalysis(errorData);
            
        }
    }, [errorData, fetchAIAnalysis]);

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'high': return { text: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' };
            case 'moderate': return { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/20' };
            case 'low': return { text: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/20' };
            default: return { text: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' };
        }
    };

    // --- Loading State ---
    if (!hasChecked) {
        return (
            <DashboardLayout>
                <div className="flex-1 max-w-5xl mx-auto w-full px-5 py-20 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-4 animate-pulse">hourglass_empty</span>
                    <h2 className="text-xl font-bold text-slate-300">Loading Analysis...</h2>
                </div>
            </DashboardLayout>
        );
    }

    // --- No Data State ---
    if (!errorData) {
        return (
            <DashboardLayout>
                <div className="flex-1 max-w-5xl mx-auto w-full px-5 py-20 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-red-400">search_off</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">No Analysis Data Found</h2>
                    <p className="text-slate-400 max-w-sm text-sm">Select a specific error clip from the Summary or History page to view its detailed analysis.</p>
                    <button onClick={() => router.push('/history')} className="mt-4 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all active:scale-95">
                        Go to History
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const severity = getSeverityColor(aiAnalysis?.severity || 'high');

    return (
        <DashboardLayout>
            <div className="flex-1 max-w-5xl mx-auto w-full px-5 py-6 md:px-10 pb-24">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-6 animate-stagger-replay">
                    <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors text-sm font-medium group">
                        <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        Back
                    </button>
                    <span className="text-slate-700 text-xs">/</span>
                    <span className="text-white text-sm font-medium truncate">{errorData.title}</span>
                </div>

                {/* Video Player */}
                <div className="animate-stagger-replay mb-6">
                    <div className="bg-surface-dark rounded-2xl overflow-hidden border border-white/5 relative">
                        <div className="absolute top-3 left-3 z-20 flex gap-2">
                            <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                <span className="material-symbols-outlined text-xs">error</span>
                                {errorData.title}
                            </span>
                            <span className="bg-black/50 backdrop-blur-md text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-lg">{errorData.time}</span>
                        </div>
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <video src={errorData.url} className="w-full h-full object-contain" controls autoPlay loop playsInline muted />
                        </div>
                        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-slate-600">videocam</span>
                                Auto-captured error snapshot
                            </span>
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = errorData.url;
                                    a.download = `fitvision-error-${Date.now()}.webm`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                className="text-xs text-slate-400 hover:text-primary font-medium flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Analysis Panel */}
                <div className="animate-stagger-replay bg-surface-dark rounded-2xl border border-white/5 overflow-hidden mb-6">
                    {/* Header */}
                    <div className="px-5 md:px-6 py-4 border-b border-white/5 bg-red-500/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-red-400">analytics</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                    Gemini AI Analysis
                                </p>
                                <h2 className="text-lg font-bold text-white">{errorData.title}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`text-center px-3 py-1.5 rounded-lg ${severity.bg} border ${severity.border}`}>
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Severity</p>
                                <p className={`text-sm font-bold capitalize ${severity.text}`}>{aiAnalysis?.severity || 'Analyzing...'}</p>
                            </div>
                            <div className="text-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Timestamp</p>
                                <p className="text-sm font-bold text-white">{errorData.time}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="px-5 md:px-6 py-5">
                        {isAnalyzing ? (
                            <div className="flex items-center gap-3 py-2">
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-sm text-slate-400">Gemini AI is analyzing your form...</span>
                            </div>
                        ) : aiError ? (
                            <div className="flex items-center gap-3 py-2">
                                <span className="material-symbols-outlined text-red-400 text-lg">warning</span>
                                <div>
                                    <p className="text-sm text-red-400 font-medium">AI Analysis failed</p>
                                    <p className="text-xs text-slate-500">{aiError}</p>
                                </div>
                                <button onClick={() => fetchAIAnalysis(errorData)} className="ml-auto text-xs text-primary font-medium hover:underline">Retry</button>
                            </div>
                        ) : aiAnalysis ? (
                            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-primary/40 pl-4">
                                {aiAnalysis.summary}
                            </p>
                        ) : (
                            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-red-500/40 pl-4 italic">
                                &ldquo;{errorData.detail}&rdquo;
                            </p>
                        )}
                    </div>

                    {/* AI Corrections */}
                    <div className="px-5 md:px-6 pb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary">lightbulb</span>
                            {isAnalyzing ? 'Generating Corrections...' : 'AI-Generated Corrections'}
                        </p>
                        {isAnalyzing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl p-4 border border-white/5 bg-white/[0.02] animate-pulse">
                                        <div className="w-9 h-9 rounded-lg bg-white/5 mb-3"></div>
                                        <div className="w-24 h-4 bg-white/5 rounded mb-2"></div>
                                        <div className="w-full h-3 bg-white/5 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {(aiAnalysis?.corrections || [
                                    { title: "Check Form", description: errorData.detail, icon: "fitness_center" }
                                ]).map((card, i) => (
                                    <button
                                        key={i}
                                        onClick={() => alert(`💡 ${card.title}\n\n${card.description}`)}
                                        className="text-left rounded-xl p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-lg text-primary">{card.icon || 'fitness_center'}</span>
                                        </div>
                                        <h4 className="text-white text-sm font-bold mb-1 group-hover:text-primary transition-colors">{card.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Warm-up Tip + AI Coach Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger-replay">
                    {/* Warm-up Suggestion */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-5">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-orange-400 text-lg">local_fire_department</span>
                            Warm-up Recommendation
                        </h3>
                        {isAnalyzing ? (
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin"></div>
                                <span className="text-xs text-slate-500">Loading suggestion...</span>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-400/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-orange-400 text-sm">exercise</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {aiAnalysis?.warmupTip || "Always warm up before heavy lifts. Dynamic stretching and activation exercises can help prevent form breakdown."}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* AI Coach Note */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-5">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                            AI Coach Note
                        </h3>
                        {isAnalyzing ? (
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-xs text-slate-500">Generating insights...</span>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {aiAnalysis?.trainerNote || errorData.detail}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* CTA Button */}
                <div className="flex justify-center mt-8 animate-stagger-replay">
                    <button
                        onClick={() => router.push('/camera')}
                        className="bg-primary text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:shadow-[0_0_25px_rgba(57,255,20,0.5)] transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">restart_alt</span>
                        Re-run Analysis
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}


