"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";
import { cameraHref, toExerciseId } from "@/lib/workoutStore";

interface AIAnalysis {
    severity: string;
    summary: string;
    corrections: { title: string; description: string; icon: string }[];
    trainerNote: string;
    warmupTip: string;
}

export default function ErrorReplayPage() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [errorData, setErrorData] = useState<{ url?: string; title: string; detail: string; time: string; exercise?: string } | null>(null);
    const [hasChecked, setHasChecked] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('fitvision_history_detail_data');
            if (stored) setErrorData(JSON.parse(stored));
        } catch {
            setErrorData(null);
        }
        setHasChecked(true);
    }, []);

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
        } catch (err) {
            console.error('AI Analysis Error:', err);
            setAiError(err instanceof Error ? err.message : 'Failed to get AI analysis');
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
            case 'high': return { text: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30' };
            case 'moderate': return { text: 'text-yellow-200', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
            case 'low': return { text: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/20' };
            default: return { text: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' };
        }
    };

    if (!hasChecked) {
        return <DashboardLayout><div className="min-h-[50vh]" /></DashboardLayout>;
    }

    if (!errorData) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto px-5 py-20 flex flex-col items-center text-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-slate-500">search_off</span>
                    <h1 className="text-2xl font-semibold text-white">{t.detail.noDataTitle}</h1>
                    <p className="text-slate-300">{t.detail.noDataDesc}</p>
                    <button type="button" onClick={() => router.push('/history')} className="mt-2 h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold cursor-pointer hover:brightness-110">
                        {t.detail.goToHistory}
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const severity = getSeverityColor(aiAnalysis?.severity || '');
    const corrections = aiAnalysis?.corrections || [{ title: errorData.title, description: errorData.detail, icon: "fitness_center" }];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 pb-16">
                <nav aria-label="breadcrumb">
                    <button type="button" onClick={() => router.back()} className="min-h-11 inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm cursor-pointer">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                        {t.detail.back}
                    </button>
                </nav>

                <header>
                    <p className="text-sm text-orange-300 font-medium">{errorData.exercise ? `${errorData.exercise} · ` : ""}{errorData.time}</p>
                    <h1 className="text-2xl md:text-3xl font-semibold text-white mt-1">{errorData.title}</h1>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
                    {/* Clip */}
                    <section className="rounded-3xl overflow-hidden bg-surface-dark border border-white/10">
                        <div className="aspect-video bg-black flex items-center justify-center">
                            {errorData.url ? (
                                <video src={errorData.url} className="w-full h-full object-contain" controls loop playsInline muted />
                            ) : (
                                <p className="text-sm text-slate-400 px-6 text-center">{t.summary.clipUnavailable}</p>
                            )}
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-300">{t.detail.autoCaptured}</span>
                            {errorData.url && (
                                <a href={errorData.url} download={`fitvision-${Date.now()}.webm`} className="min-h-11 inline-flex items-center gap-1 text-primary hover:underline">
                                    <span className="material-symbols-outlined text-lg">download</span>{t.detail.export}
                                </a>
                            )}
                        </div>
                    </section>

                    {/* AI analysis */}
                    <section aria-labelledby="ai-h" aria-busy={isAnalyzing} className="rounded-3xl bg-surface-dark border border-white/10 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="ai-h" className="text-base font-semibold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">smart_toy</span>{t.detail.aiAnalysis}
                            </h2>
                            {aiAnalysis?.severity && (
                                <span className={`shrink-0 whitespace-nowrap text-sm font-semibold px-2.5 py-1 rounded-full ${severity.bg} ${severity.text}`}>
                                    {t.detail.severity}: {({ high: t.summary.riskLevels.high, moderate: t.summary.riskLevels.moderate, low: t.summary.riskLevels.safe } as Record<string, string>)[aiAnalysis.severity.toLowerCase()] || aiAnalysis.severity}
                                </span>
                            )}
                        </div>
                        {isAnalyzing ? (
                            <div role="status" className="flex items-center gap-3 py-2 text-slate-300">
                                <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                {t.detail.analyzingForm}
                            </div>
                        ) : aiError ? (
                            <div className="flex flex-col items-start gap-2">
                                <p className="text-sm text-orange-300">{t.detail.aiFailed}</p>
                                <button type="button" onClick={() => fetchAIAnalysis(errorData)} className="h-11 px-4 rounded-xl border border-white/20 text-white text-sm cursor-pointer hover:bg-white/5">
                                    {t.detail.retry}
                                </button>
                            </div>
                        ) : (
                            <p className="text-slate-200 leading-relaxed">{aiAnalysis?.summary || errorData.detail}</p>
                        )}
                    </section>
                </div>

                {/* How to fix */}
                {!isAnalyzing && (
                    <section aria-labelledby="fix-h">
                        <h2 id="fix-h" className="text-lg font-semibold text-white mb-3">{t.detail.aiCorrections}</h2>
                        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {corrections.map((card, i) => (
                                <li key={i} className="rounded-2xl p-4 bg-surface-dark border border-white/10 flex flex-col gap-2">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                                    <h3 className="font-semibold text-white">{card.title}</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{card.description}</p>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <section className="rounded-2xl p-4 bg-surface-dark border border-white/10">
                        <h2 className="text-sm font-semibold text-white mb-1.5">{t.detail.warmupRecommendation}</h2>
                        <p className="text-sm text-slate-300 leading-relaxed">{isAnalyzing ? t.detail.loadingSuggestion : (aiAnalysis?.warmupTip || t.detail.warmupFallback)}</p>
                    </section>
                    <section className="rounded-2xl p-4 bg-surface-dark border border-white/10">
                        <h2 className="text-sm font-semibold text-white mb-1.5">{t.detail.aiCoachNote}</h2>
                        <p className="text-sm text-slate-300 leading-relaxed">{isAnalyzing ? t.detail.generatingInsights : (aiAnalysis?.trainerNote || errorData.detail)}</p>
                    </section>
                </div>

                <button
                    type="button"
                    onClick={() => router.push(errorData.exercise ? cameraHref(toExerciseId(errorData.exercise), 12) : '/')}
                    className="self-start h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold flex items-center gap-2 cursor-pointer hover:brightness-110"
                >
                    <span className="material-symbols-outlined">videocam</span>
                    {t.detail.rerunAnalysis}
                </button>
            </div>
        </DashboardLayout>
    );
}
