"use client";
import DashboardLayout from "@/components/DashboardLayout";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function HistoryPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('fitvision_history') || '[]');
        setHistory(stored);
    }, []);

    // Computed stats from real data
    const stats = useMemo(() => {
        if (history.length === 0) return { avg: 0, total: 0, best: 0, totalReps: 0, totalErrors: 0 };
        const avg = Math.round(history.reduce((a, s) => a + (s.avgScore || 0), 0) / history.length);
        const best = Math.max(...history.map(s => s.avgScore || 0));
        const totalReps = history.reduce((a, s) => a + (s.completedReps || 0), 0);
        const totalErrors = history.reduce((a, s) => a + (s.errorCount || 0), 0);
        return { avg, total: history.length, best, totalReps, totalErrors };
    }, [history]);

    // Filtered sessions
    const filteredSessions = useMemo(() => {
        if (filter === "all") return history;
        return history.filter(s => s.exercise?.toLowerCase() === filter.toLowerCase());
    }, [history, filter]);

    // Run animation AFTER React has rendered elements (triggered by data/filter changes)
    useEffect(() => {
        requestAnimationFrame(() => {
            
        });
    }, [filteredSessions]);

    // Build dynamic chart points from recent sessions (up to 10)
    const chartData = useMemo(() => {
        const recent = [...history].reverse().slice(0, 10);
        if (recent.length === 0) return { path: "", areaPath: "", points: [] as { x: number; y: number; score: number }[] };
        const w = 1000;
        const h = 200;
        const padding = 20;
        const step = recent.length > 1 ? (w - padding * 2) / (recent.length - 1) : 0;
        const pts = recent.map((s, i) => ({
            x: padding + i * step,
            y: h - ((s.avgScore || 0) / 100) * (h - padding * 2) - padding,
            score: s.avgScore || 0,
        }));

        // Build the SVG path
        let line = `M${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prevPt = pts[i - 1];
            const cp1x = prevPt.x + (pts[i].x - prevPt.x) * 0.4;
            const cp2x = prevPt.x + (pts[i].x - prevPt.x) * 0.6;
            line += ` C${cp1x},${prevPt.y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
        }
        const area = `${line} V${h} H${pts[0].x} Z`;
        return { path: line, areaPath: area, points: pts };
    }, [history]);

    // Exercise icon mapping
    const getExerciseIcon = (exercise: string) => {
        const e = exercise?.toLowerCase() || '';
        if (e.includes('bench')) return 'airline_seat_flat';
        if (e.includes('squat')) return 'downhill_skiing';
        return 'fitness_center';
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-primary drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]';
        if (score >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'from-primary/20 to-transparent';
        if (score >= 70) return 'from-yellow-400/20 to-transparent';
        return 'from-red-400/20 to-transparent';
    };

    return (
        <>
            <DashboardLayout>
                <div className="max-w-[1200px] mx-auto p-5 md:p-10 flex flex-col gap-6 pb-24">

                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 animate-stagger-history">
                        <div className="flex flex-col gap-1.5">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl md:text-4xl drop-shadow-[0_0_12px_rgba(57,255,20,0.4)]">history</span>
                                {t.history.title}
                            </h1>
                            <p className="text-slate-400 text-sm font-medium">{t.history.subtitle}</p>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {["all", "Bench Press", "Squat", "Deadlift"].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${filter === f
                                        ? "bg-primary text-black shadow-[0_0_12px_rgba(57,255,20,0.3)]"
                                        : "bg-white/5 border border-white/10 text-slate-300 hover:border-primary/40 hover:text-white"
                                        }`}
                                >
                                    {f === "all" ? t.history.filters.all : f}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {[
                            { icon: "speed", label: t.history.statsCards.avgScore, value: `${stats.avg}%`, color: "text-primary" },
                            { icon: "emoji_events", label: t.history.statsCards.bestScore, value: `${stats.best}%`, color: "text-yellow-400" },
                            { icon: "repeat", label: t.history.statsCards.totalReps, value: `${stats.totalReps}`, color: "text-blue-400" },
                            { icon: "done_all", label: t.history.statsCards.sessions, value: `${stats.total}`, color: "text-violet-400" },
                        ].map((stat, i) => (
                            <div key={i} className="animate-stagger-history bg-surface-dark rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-2xl pointer-events-none"></div>
                                <span className={`material-symbols-outlined text-xl md:text-2xl mb-2 block ${stat.color}`}>{stat.icon}</span>
                                <p className="text-xl md:text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chart Card */}
                    {history.length > 0 && (
                        <div className="animate-stagger-history bg-surface-dark rounded-2xl p-5 md:p-6 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>
                            <div className="flex justify-between items-center mb-4 relative z-10">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">{t.history.chart.title}</h2>
                                    <p className="text-slate-500 text-xs">{history.length} {t.history.chart.sessionsShown}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 text-sm font-semibold ${stats.avg >= 80 ? 'text-primary' : 'text-yellow-400'}`}>
                                    <span className="material-symbols-outlined text-base">trending_up</span>
                                    {stats.avg}% {t.history.avg}
                                </div>
                            </div>
                            <div className="w-full h-[180px] relative z-10">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 200">
                                    <defs>
                                        <linearGradient id="chartGradient2" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#39FF14" stopOpacity="0.15"></stop>
                                            <stop offset="100%" stopColor="#39FF14" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                    {/* Faint grid lines */}
                                    {[0, 50, 100, 150, 200].map(y => (
                                        <line key={y} stroke="#ffffff08" strokeWidth="1" x1="0" x2="1000" y1={y} y2={y} />
                                    ))}
                                    {/* Area */}
                                    {chartData.areaPath && <path d={chartData.areaPath} fill="url(#chartGradient2)" />}
                                    {/* Line */}
                                    {chartData.path && (
                                        <path
                                            d={chartData.path}
                                            fill="none"
                                            stroke="#39FF14"
                                            strokeLinecap="round"
                                            strokeWidth="2.5"
                                            vectorEffect="non-scaling-stroke"
                                            className="drop-shadow-[0_0_6px_rgba(57,255,20,0.5)]"
                                        />
                                    )}
                                    {/* Data points */}
                                    {chartData.points.map((pt, i) => (
                                        <g key={i}>
                                            <circle cx={pt.x} cy={pt.y} fill="#0a0f0a" r="5" stroke="#39FF14" strokeWidth="2" />
                                            {i === chartData.points.length - 1 && (
                                                <circle cx={pt.x} cy={pt.y} fill="#39FF14" r="4" className="animate-pulse" />
                                            )}
                                        </g>
                                    ))}
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Session List */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 animate-stagger-history">
                            <span className="material-symbols-outlined text-primary text-xl">list_alt</span>
                            {t.history.pastSessions.title}
                            {filteredSessions.length > 0 && (
                                <span className="text-xs text-slate-500 font-medium ml-1">({filteredSessions.length})</span>
                            )}
                        </h3>

                        {filteredSessions.length === 0 ? (
                            <div className="animate-stagger-history flex flex-col items-center justify-center gap-4 py-16 bg-surface-dark rounded-2xl border border-white/5">
                                <span className="material-symbols-outlined text-5xl text-slate-700">fitness_center</span>
                                <p className="text-slate-500 font-medium text-sm">{t.history.pastSessions.empty}</p>
                                <button
                                    onClick={() => router.push('/camera')}
                                    className="mt-2 px-6 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all active:scale-95"
                                >
                                    {t.history.startWorkout}
                                </button>
                            </div>
                        ) : (
                            filteredSessions.map((session, i) => (
                                <div
                                    key={session.id || i}
                                    onClick={() => {
                                        sessionStorage.setItem('fitvision_session_stats', JSON.stringify(session));
                                        sessionStorage.setItem('fitvision_errors', JSON.stringify(session.errors || []));
                                        router.push('/summary');
                                    }}
                                    className="animate-stagger-history group bg-surface-dark hover:bg-white/[0.03] border border-white/5 hover:border-primary/30 rounded-2xl p-4 md:p-5 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {/* Accent gradient on hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${getScoreBg(session.avgScore)} group-hover:opacity-100 transition-opacity pointer-events-none`}></div>

                                    <div className="relative z-10 flex items-center gap-4">
                                        {/* Exercise Icon */}
                                        <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all shrink-0">
                                            <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary transition-colors">
                                                {getExerciseIcon(session.exercise)}
                                            </span>
                                        </div>

                                        {/* Middle Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors capitalize truncate">
                                                    {session.exercise}
                                                </h4>
                                                {session.errorCount === 0 && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/15 text-primary rounded-full border border-primary/20 shrink-0">
                                                        {t.history.perfect}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    {new Date(session.timestamp).toLocaleDateString()} · {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {session.completedReps > 0 && (
                                                    <span className="flex items-center gap-1 text-blue-400/80">
                                                        <span className="material-symbols-outlined text-[14px]">replay</span>
                                                        {session.completedReps} {t.history.reps}
                                                    </span>
                                                )}
                                                {session.errorCount > 0 && (
                                                    <span className="flex items-center gap-1 text-orange-400/80">
                                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                                        {session.errorCount} {t.history.pastSessions.mistakes.toLowerCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Score Badge */}
                                        <div className="flex flex-col items-center gap-0.5 shrink-0 pl-3 border-l border-white/5">
                                            <span className={`text-2xl md:text-3xl font-black tabular-nums ${getScoreColor(session.avgScore)}`}>
                                                {session.avgScore}<span className="text-sm font-semibold">%</span>
                                            </span>
                                            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">{t.history.pastSessions.accuracy}</span>
                                        </div>

                                        {/* Arrow */}
                                        <span className="material-symbols-outlined text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all hidden md:block">
                                            chevron_right
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
