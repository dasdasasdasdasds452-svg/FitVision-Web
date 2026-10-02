"use client";
import DashboardLayout from "@/components/DashboardLayout";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import {
    EXERCISE_IDS,
    ExerciseId,
    WorkoutSession,
    averageScore,
    bestScore,
    loadHistory,
    setCurrentSession,
    totalReps,
} from "@/lib/workoutStore";

export default function HistoryPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [history, setHistory] = useState<WorkoutSession[]>([]);
    const [filter, setFilter] = useState<"all" | ExerciseId>("all");

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    // Filter by exercise id (works in both languages and for old records)
    const filteredSessions = useMemo(() => {
        if (filter === "all") return history;
        return history.filter(s => s.exerciseId === filter);
    }, [history, filter]);

    // Stats follow the selected filter
    const stats = useMemo(() => ({
        avg: averageScore(filteredSessions),
        best: bestScore(filteredSessions),
        totalReps: totalReps(filteredSessions),
        total: filteredSessions.length,
    }), [filteredSessions]);

    const fmtScore = (v: number | null) => (v === null ? "—" : `${v}%`);

    // Chart: the 10 MOST RECENT scored sessions, oldest → newest left to right.
    // x/y are percentages so HTML markers stay round at any width.
    const Y_MIN = 40;
    const chartData = useMemo(() => {
        const recent = filteredSessions.filter(s => s.avgScore !== null).slice(0, 10).reverse();
        const pts = recent.map((s, i) => {
            const score = s.avgScore ?? 0;
            return {
                id: s.id,
                x: recent.length > 1 ? (i / (recent.length - 1)) * 100 : 50,
                y: 100 - ((Math.max(Y_MIN, score) - Y_MIN) / (100 - Y_MIN)) * 100,
                score,
                session: s,
            };
        });
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        return { path, points: pts };
    }, [filteredSessions]);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    // Exercise icon mapping
    const getExerciseIcon = (id: ExerciseId) => {
        if (id === 'benchpress') return 'airline_seat_flat';
        if (id === 'squat') return 'accessibility_new';
        return 'fitness_center';
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-slate-400';
        if (score >= 90) return 'text-primary';
        if (score >= 70) return 'text-white';
        return 'text-orange-300';
    };

    const locale = language === 'th' ? 'th-TH' : 'en-US';
    const openSession = (session: WorkoutSession) => {
        setCurrentSession(session, false);
        router.push('/summary');
    };

    const statCards = [
        { label: t.history.statsCards.avgScore, value: fmtScore(stats.avg) },
        { label: t.history.statsCards.bestScore, value: fmtScore(stats.best) },
        { label: t.history.statsCards.totalReps, value: `${stats.totalReps}` },
        { label: t.history.statsCards.sessions, value: `${stats.total}` },
    ];
    const fmtDate = (ts: string) => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const last = chartData.points[chartData.points.length - 1];
    const hovered = hoverIdx !== null ? chartData.points[hoverIdx] : null;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 pb-16">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white">{t.history.title}</h1>
                        <p className="text-slate-300 mt-1">{t.history.subtitle}</p>
                    </div>
                    <div role="group" aria-label={t.home.step1} className="flex gap-2 overflow-x-auto pb-1">
                        {(["all", ...EXERCISE_IDS] as const).map(f => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={filter === f}
                                onClick={() => setFilter(f)}
                                className={`h-10 px-4 rounded-full text-sm font-medium whitespace-nowrap border transition-colors cursor-pointer ${filter === f
                                    ? "bg-white text-background-dark border-white"
                                    : "border-white/15 text-slate-200 hover:border-white/40"
                                    }`}
                            >
                                {f === "all" ? t.history.filters.all : t.camera.exerciseName[f]}
                            </button>
                        ))}
                    </div>
                </header>

                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statCards.map((c) => (
                        <div key={c.label} className="rounded-2xl bg-surface-dark border border-white/10 p-4">
                            <dt className="text-sm text-slate-300">{c.label}</dt>
                            <dd className="text-2xl font-bold text-white tabular-nums mt-1">{c.value}</dd>
                        </div>
                    ))}
                </dl>

                {chartData.points.length > 1 && (
                    <section aria-labelledby="trend-h" className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6">
                        <div className="flex items-baseline justify-between gap-3 mb-4">
                            <h2 id="trend-h" className="text-base font-semibold text-white">{t.history.chart.title}</h2>
                            <p className="text-sm text-slate-300 tabular-nums">
                                {hovered ? `${fmtDate(hovered.session.timestamp)} · ${hovered.score}%` : `${chartData.points.length} ${t.history.chart.sessionsShown}`}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {/* y axis */}
                            <div className="relative w-8 h-44 text-xs text-slate-400 tabular-nums shrink-0" aria-hidden="true">
                                {[100, 70, 40].map(v => (
                                    <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - ((v - Y_MIN) / (100 - Y_MIN)) * 100}%` }}>{v}</span>
                                ))}
                            </div>
                            <div className="relative flex-1 h-44" onMouseLeave={() => setHoverIdx(null)}>
                                <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                    {[100, 70, 40].map(v => {
                                        const y = 100 - ((v - Y_MIN) / (100 - Y_MIN)) * 100;
                                        return <line key={v} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                                    })}
                                    {hovered && <line x1={hovered.x} x2={hovered.x} y1="0" y2="100" stroke="rgba(255,255,255,0.25)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
                                    <path d={chartData.path} fill="none" stroke="#39FF14" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                </svg>
                                {chartData.points.map((p, i) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onMouseEnter={() => setHoverIdx(i)}
                                        onFocus={() => setHoverIdx(i)}
                                        onBlur={() => setHoverIdx(null)}
                                        onClick={() => openSession(p.session)}
                                        aria-label={`${t.camera.exerciseName[p.session.exerciseId]} ${fmtDate(p.session.timestamp)} ${p.score}%`}
                                        className="absolute size-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-primary"
                                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                    >
                                        <span className={`block rounded-full border-2 border-surface-dark bg-primary ${hoverIdx === i || i === chartData.points.length - 1 ? "size-3" : "size-2.5"}`} />
                                    </button>
                                ))}
                                {last && hoverIdx === null && (
                                    <span className="absolute text-sm font-semibold text-white tabular-nums -translate-x-full -translate-y-7 pr-1" style={{ left: `${last.x}%`, top: `${last.y}%` }} aria-hidden="true">
                                        {last.score}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between pl-11 mt-2 text-xs text-slate-400" aria-hidden="true">
                            <span>{fmtDate(chartData.points[0].session.timestamp)}</span>
                            <span>{fmtDate(last.session.timestamp)}</span>
                        </div>
                    </section>
                )}

                <section aria-labelledby="past-h" className="flex flex-col gap-3">
                    <h2 id="past-h" className="text-lg font-semibold text-white">
                        {t.history.pastSessions.title} <span className="text-slate-400 font-normal text-base">({filteredSessions.length})</span>
                    </h2>
                    {filteredSessions.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 rounded-2xl border border-white/10 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-500">fitness_center</span>
                            <p className="text-slate-300">{t.history.pastSessions.empty}</p>
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="h-11 px-5 rounded-xl bg-primary text-background-dark font-semibold cursor-pointer hover:brightness-110"
                            >
                                {t.history.startWorkout}
                            </button>
                        </div>
                    ) : (
                        <ul className="rounded-2xl border border-white/10 bg-surface-dark divide-y divide-white/5 overflow-hidden">
                            {filteredSessions.map((session) => (
                                <li key={session.id}>
                                    <button
                                        type="button"
                                        onClick={() => openSession(session)}
                                        className="w-full grid grid-cols-[40px_minmax(0,1fr)_auto_20px] items-center gap-3 md:gap-4 px-4 md:px-5 py-4 text-left hover:bg-white/[0.04] cursor-pointer"
                                    >
                                        <span className="size-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-300">
                                            <span className="material-symbols-outlined text-xl">{getExerciseIcon(session.exerciseId)}</span>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-white truncate">{t.camera.exerciseName[session.exerciseId]}</span>
                                            <span className="block text-sm text-slate-400 truncate">
                                                {new Date(session.timestamp).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(session.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                                {" · "}{session.completedReps}/{session.repGoal} {t.history.reps}
                                                {" · "}
                                                {session.errorCount === 0
                                                    ? <span className="text-primary">{t.history.perfect}</span>
                                                    : <span className="text-orange-300">{session.errorCount} {t.history.pastSessions.mistakes}</span>}
                                            </span>
                                        </span>
                                        <span className={`text-xl font-bold tabular-nums ${getScoreColor(session.avgScore)}`}>
                                            {session.avgScore === null ? "—" : `${session.avgScore}%`}
                                        </span>
                                        <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
}
