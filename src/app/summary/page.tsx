"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

interface ErrorRecord {
    url: string;
    title: string;
    detail: string;
    time: string;
}

// Group errors by title to show most frequent
const groupErrors = (errorList: ErrorRecord[]) => {
    const counts: Record<string, number> = {};
    errorList.forEach(err => {
        counts[err.title] = (counts[err.title] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

export default function SummaryPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [errors, setErrors] = useState<ErrorRecord[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Refs for animated numbers
    const accuracyRef = useRef<HTMLParagraphElement>(null);
    const mistakesRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        // Retrieve stored errors and stats from sessionStorage
        const storedErrors = JSON.parse(sessionStorage.getItem('fitvision_errors') || '[]');
        const storedStatsString = sessionStorage.getItem('fitvision_session_stats');
        let currentStats = null;

        if (storedStatsString) {
            currentStats = JSON.parse(storedStatsString);
            setStats(currentStats);
        }
        setErrors(storedErrors);

        // Save to global history (localStorage)
        if (currentStats && currentStats.id) {
            const history = JSON.parse(localStorage.getItem('fitvision_history') || '[]');
            // Prevent duplicate saving
            if (!history.find((h: any) => h.id === currentStats.id)) {
                // Prepend to top
                localStorage.setItem('fitvision_history', JSON.stringify([currentStats, ...history]));
            }
        }

        // Staggered Entrance Animations with Anime.js
        

        // Animated Number Counters
        const finalAccuracy = currentStats ? Math.round(currentStats.avgScore) : 100;
        const finalMistakes = storedErrors.length;

        const counters = {
            accuracy: 0,
            mistakes: 0
        };

        

    }, []);

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen">
                <div className="max-w-4xl mx-auto w-full p-6 md:p-8 flex flex-col gap-10">
                    <div className="text-center flex flex-col items-center gap-4 animate-stagger-summary">
                        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-primary text-5xl font-bold">check_circle</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-100 flex flex-col items-center gap-2">
                            <span>{t.summary.title}</span>
                            {stats && <span className="text-xl md:text-2xl text-primary font-medium tracking-normal mt-1 capitalize">{stats.exercise}</span>}
                        </h1>
                        <p className="text-slate-400 max-w-md mx-auto">
                            {t.summary.subtitle}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {/* Summary Widget: Form Accuracy */}
                        <div className="bg-black/40 rounded-2xl p-6 md:p-8 border border-white/10 flex flex-col items-center text-center shadow-lg animate-stagger-summary">
                            <span className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">{t.summary.formAccuracy}</span>
                            <div className="flex items-start">
                                <p className="text-4xl lg:text-5xl font-bold text-primary">{stats ? Math.round(stats.avgScore) : 0}%</p>
                            </div>
                        </div>

                        {/* Summary Widget: Repetition Progress */}
                        <div className="bg-black/40 rounded-2xl p-6 md:p-8 border border-white/10 flex flex-col items-center justify-center text-center shadow-lg animate-stagger-summary">
                            <span className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">{t.summary.workoutProgress}</span>
                            <div className="flex items-end gap-1">
                                <p className="text-4xl lg:text-5xl font-bold text-blue-400">{stats?.completedReps || 0}</p>
                                <p className="text-xl md:text-2xl font-medium text-slate-500 mb-1">/ {stats?.repGoal || 0}</p>
                            </div>
                            {stats?.repGoal > 0 && stats?.completedReps >= stats?.repGoal && (
                                <span className="mt-2 text-[10px] md:text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">{t.summary.goalReached}</span>
                            )}
                        </div>

                        {/* Summary Widget: Total Mistakes */}
                        <div className="bg-black/40 rounded-2xl p-6 md:p-8 border border-white/10 flex flex-col items-center text-center shadow-lg animate-stagger-summary">
                            <span className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">{t.summary.capturedMistakes}</span>
                            <div className="flex flex-col items-center">
                                <p className="text-4xl lg:text-5xl font-bold text-red-400">{errors.length}</p>
                                <span className={`mt-2 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border ${errors.length > 3 ? 'text-red-500 bg-red-500/10 border-red-500/20' : errors.length > 0 ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' : 'text-primary bg-primary/10 border-primary/20'}`}>
                                    {errors.length > 3 ? t.summary.riskLevels.high : errors.length > 0 ? t.summary.riskLevels.moderate : t.summary.riskLevels.safe}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown of Frequent Errors */}
                    {errors.length > 0 && (
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-6 animate-stagger-summary">
                            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-400">troubleshoot</span>
                                {t.summary.frequentMistakes}
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {groupErrors(errors).map(([title, count], idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3 min-w-[200px] flex-1">
                                        <span className="text-sm font-bold text-slate-300 truncate mr-3">{title}</span>
                                        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded">x{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <section className="flex flex-col gap-6 animate-stagger-summary">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <h3 className="text-2xl font-bold text-slate-100">{t.summary.errorReplays.title}</h3>
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                                {errors.length > 0 ? t.summary.errorReplays.reviewRecommended : t.summary.errorReplays.perfectSet}
                            </span>
                        </div>

                        {errors.length === 0 ? (
                            <div className="p-8 bg-black/40 rounded-xl border border-primary/20 flex flex-col items-center text-center">
                                <span className="material-symbols-outlined text-primary text-5xl mb-4">emoji_events</span>
                                <h4 className="text-xl font-bold text-white mb-2">{t.summary.errorReplays.flawlessTitle}</h4>
                                <p className="text-slate-400">{t.summary.errorReplays.flawlessDesc}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {errors.map((error, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
                                        <div className="md:w-1/2 bg-black relative aspect-video flex-shrink-0">
                                            <video
                                                src={error.url}
                                                className="w-full h-full object-cover"
                                                controls
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-bold text-red-400 border border-red-500/30 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                {t.summary.errorReplays.mistakeClip}
                                            </div>
                                        </div>
                                        <div className="p-5 md:p-6 flex flex-col justify-center gap-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-xl font-bold text-red-400">{error.title}</h4>
                                                <span className="text-xs text-slate-500 bg-black/50 px-2 py-1 rounded">{error.time}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-red-500/50 pl-3">
                                                {error.detail}
                                            </p>
                                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">info</span>
                                                {t.summary.errorReplays.clipDesc}
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        sessionStorage.setItem('fitvision_history_detail_data', JSON.stringify(error));
                                                        router.push('/history/detail');
                                                    }}
                                                    className="w-full bg-slate-800 hover:bg-primary/20 hover:text-primary text-white border border-slate-700 hover:border-primary/50 text-sm font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">troubleshoot</span>
                                                    {t.summary.deepAnalysis}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-12 animate-stagger-summary">
                        <Link
                            href="/camera"
                            className="flex-1 h-14 bg-primary text-background-dark font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined">replay</span>
                            {t.summary.actions.tryAgain}
                        </Link>
                        <Link
                            href="/"
                            className="flex-1 h-14 bg-transparent text-slate-100 border-2 border-primary/20 font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined">home</span>
                            {t.summary.actions.backToDashboard}
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
