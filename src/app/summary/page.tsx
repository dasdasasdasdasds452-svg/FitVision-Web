"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";
import {
    ErrorRecord,
    WorkoutSession,
    cameraHref,
    groupErrors,
    loadCurrentSession,
    markCurrentSessionSeen,
    setCurrentSession,
    updateSessionInHistory,
} from "@/lib/workoutStore";

function renderMarkdown(text: string): string {
    const raw = marked.parse(text, { async: false, breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "code", "h1", "h2", "h3", "h4", "blockquote"],
        ALLOWED_ATTR: [],
    });
}

export default function SummaryPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [session, setSession] = useState<WorkoutSession | null>(null);
    const [fresh, setFresh] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [aiAdvice, setAiAdvice] = useState("");
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiFailed, setAiFailed] = useState(false);

    const exerciseLabel = session ? t.camera.exerciseName[session.exerciseId] : "";
    const errors = session?.errors ?? [];

    const fetchAIAdvice = useCallback(async (s: WorkoutSession) => {
        setIsLoadingAI(true);
        setAiFailed(false);
        try {
            const res = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "session",
                    language,
                    exercise: t.camera.exerciseName[s.exerciseId],
                    completedReps: s.completedReps,
                    repGoal: s.repGoal,
                    score: s.avgScore,
                    errors: s.errors.map((e) => ({
                        title: e.title,
                        detail: e.detail,
                        time: e.elapsedFormatted || e.time,
                        repNumber: e.repNumber,
                        riskFactors: e.riskFactors,
                    })),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.response) throw new Error(data.error || `HTTP ${res.status}`);
            setAiAdvice(data.response);
            // Cache so revisiting this session doesn't call the AI again
            updateSessionInHistory(s.id, { aiAdvice: data.response });
            setCurrentSession({ ...s, aiAdvice: data.response }, false);
        } catch (err) {
            console.error("AI advice error:", err);
            setAiFailed(true);
        } finally {
            setIsLoadingAI(false);
        }
    }, [language, t]);

    useEffect(() => {
        const { session: current, fresh: isFresh } = loadCurrentSession();
        setSession(current);
        setFresh(isFresh);
        setLoaded(true);
        if (!current) return;
        if (current.aiAdvice) {
            setAiAdvice(current.aiAdvice);
        } else if (isFresh && current.errors.length > 0) {
            // Only auto-analyse a session that was just recorded; older ones get a button.
            fetchAIAdvice(current);
        }
        if (isFresh) {
            markCurrentSessionSeen();
            // Clips finish recording up to 3 s after the set ends — pick them up.
            const id = setTimeout(() => {
                const again = loadCurrentSession().session;
                if (again && again.id === current.id) setSession((prev) => (prev ? { ...prev, errors: again.errors } : prev));
            }, 3500);
            return () => clearTimeout(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const grouped = useMemo(() => groupErrors(errors), [errors]);
    const top = grouped[0];
    const topRecords = top ? errors.filter((e) => e.title === top[0]) : [];
    const topExample: ErrorRecord | undefined = topRecords.find((e) => e.url) || topRecords[0];
    const clips = errors.filter((e) => e.url);

    // Which reps had a problem (repNumber = reps completed when it was detected → the next rep)
    const repCount = session ? Math.max(session.completedReps, 0) : 0;
    const badReps = useMemo(() => {
        const set = new Set<number>();
        errors.forEach((e) => {
            if (e.repNumber === undefined) return;
            set.add(Math.min(Math.max(1, e.repNumber + 1), Math.max(1, repCount)));
        });
        return set;
    }, [errors, repCount]);

    const openDetail = (error: ErrorRecord) => {
        sessionStorage.setItem("fitvision_history_detail_data", JSON.stringify({ ...error, exercise: exerciseLabel }));
        router.push("/history/detail");
    };

    if (!loaded) return <DashboardLayout><div className="min-h-[50vh]" /></DashboardLayout>;

    if (!session) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto px-5 py-20 text-center flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-slate-500">insights</span>
                    <h1 className="text-2xl font-semibold text-white">{t.summary.noSessionTitle}</h1>
                    <p className="text-slate-300">{t.summary.noSessionDesc}</p>
                    <Link href="/" className="mt-2 h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold flex items-center">
                        {t.summary.startWorkout}
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const score = session.avgScore;
    const goalReached = session.repGoal > 0 && session.completedReps >= session.repGoal;
    const locale = language === "th" ? "th-TH" : "en-US";

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 pb-16">
                {/* ── Header: score + what was done ── */}
                <header className="flex items-center gap-5">
                    {score === null ? (
                        <div className="size-24 rounded-full border-4 border-white/10 flex items-center justify-center text-center text-xs text-slate-400 p-2 shrink-0">
                            {t.home.noScore}
                        </div>
                    ) : (
                        <div
                            className="size-24 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `conic-gradient(#39FF14 0 ${score}%, rgba(255,255,255,0.1) ${score}% 100%)` }}
                            role="img"
                            aria-label={`${t.summary.formAccuracy} ${score}%`}
                        >
                            <div className="size-[78px] rounded-full bg-background-dark flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white tabular-nums leading-none">{score}</span>
                                <span className="text-xs text-slate-400 mt-0.5">{t.summary.formAccuracy}</span>
                            </div>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm text-slate-400">
                            {new Date(session.timestamp).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight">
                            {exerciseLabel} {session.completedReps}/{session.repGoal} {t.home.repsUnit}
                        </h1>
                        <p className="text-sm mt-1">
                            {goalReached && <span className="text-primary font-medium mr-2">{t.summary.goalReached}</span>}
                            {errors.length === 0 ? (
                                <span className="text-primary">{t.summary.errorReplays.flawlessTitle}</span>
                            ) : (
                                <span className="text-orange-300">{errors.length} {t.summary.capturedMistakes}</span>
                            )}
                        </p>
                        {score === null && <p className="text-xs text-slate-400 mt-1">{t.summary.scoreUnavailable}</p>}
                    </div>
                </header>

                {/* ── Rep-by-rep strip ── */}
                {repCount > 0 && (
                    <section aria-label={t.summary.workoutProgress}>
                        <h2 className="text-sm text-slate-300 font-medium mb-2">{t.summary.workoutProgress}</h2>
                        <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(repCount, 12)}, minmax(0, 1fr))` }}>
                            {Array.from({ length: repCount }, (_, i) => i + 1).map((n) => {
                                const bad = badReps.has(n);
                                return (
                                    <li
                                        key={n}
                                        title={`${t.summary.repPrefix}${n}`}
                                        className={`h-9 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${bad ? "bg-orange-400 text-black" : "bg-primary/10 text-primary border border-primary/25"}`}
                                    >
                                        {bad ? "!" : n}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                )}

                {/* ── Fix #1 ── */}
                {top && topExample && (
                    <section className="rounded-3xl p-5 bg-orange-500/10 border border-orange-400/30 flex flex-col gap-3">
                        <p className="text-sm font-semibold text-orange-300">
                            {t.summary.topFix} · {t.summary.foundTimes.replace("{n}", String(top[1]))}
                        </p>
                        <h2 className="text-xl font-semibold text-white">{top[0]}</h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {topExample.url && (
                                <video src={topExample.url} className="w-full sm:w-56 aspect-video rounded-xl bg-black object-cover" controls loop muted playsInline />
                            )}
                            <div className="text-sm text-slate-200 leading-relaxed flex flex-col gap-2">
                                <p>{topExample.detail}</p>
                                {topExample.recommendation && <p className="text-slate-300">{topExample.recommendation}</p>}
                                <button type="button" onClick={() => openDetail(topExample)} className="self-start text-orange-300 font-semibold hover:underline min-h-11 cursor-pointer">
                                    {t.summary.deepAnalysis} →
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Other mistakes ── */}
                {grouped.length > 1 && (
                    <section>
                        <h2 className="text-sm text-slate-300 font-medium mb-2">{t.summary.frequentMistakes}</h2>
                        <ul className="rounded-2xl border border-white/10 bg-surface-dark divide-y divide-white/5">
                            {grouped.slice(1).map(([title, count]) => {
                                const example = errors.find((e) => e.title === title);
                                return (
                                    <li key={title}>
                                        <button
                                            type="button"
                                            onClick={() => example && openDetail(example)}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.04] cursor-pointer"
                                        >
                                            <span className="text-white">{title}</span>
                                            <span className="text-sm text-slate-400 shrink-0">×{count} <span className="material-symbols-outlined align-middle text-base">chevron_right</span></span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* ── AI coach analysis ── */}
                {errors.length > 0 && (
                    <section className="rounded-3xl p-5 bg-surface-dark border border-white/10">
                        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">smart_toy</span>
                            {t.summary.aiAnalysisTitle}
                        </h2>
                        {isLoadingAI ? (
                            <div className="flex items-center gap-3 py-4" role="status">
                                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-slate-300">{t.summary.aiAnalyzing}</span>
                            </div>
                        ) : aiAdvice ? (
                            <div className="prose-chat" dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAdvice) }} />
                        ) : (
                            <div className="flex flex-col items-start gap-2">
                                {aiFailed && <p className="text-sm text-orange-300">{t.detail.aiFailed}</p>}
                                <button
                                    type="button"
                                    onClick={() => fetchAIAdvice(session)}
                                    className="h-11 px-5 rounded-xl border border-white/15 text-white font-medium flex items-center gap-2 hover:bg-white/5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                                    {aiFailed ? t.detail.retry : t.summary.getAiAdvice}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* ── Clips ── */}
                {errors.length > 0 && (
                    <section>
                        <h2 className="text-sm text-slate-300 font-medium mb-2">{t.summary.errorReplays.title}</h2>
                        {clips.length === 0 ? (
                            <p className="text-sm text-slate-400">{fresh ? t.summary.errorReplays.clipDesc : t.summary.clipUnavailable}</p>
                        ) : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {clips.map((error, idx) => (
                                    <li key={`${error.time}-${idx}`} className="rounded-2xl overflow-hidden border border-white/10 bg-surface-dark">
                                        <video src={error.url} className="w-full aspect-video bg-black object-cover" controls loop muted playsInline preload="metadata" />
                                        <button type="button" onClick={() => openDetail(error)} className="w-full text-left p-3 hover:bg-white/[0.04] cursor-pointer">
                                            <span className="block text-sm font-semibold text-white">{error.title}</span>
                                            <span className="block text-xs text-slate-400">
                                                {error.elapsedFormatted || error.time}
                                                {error.repNumber !== undefined ? ` · ${t.summary.repPrefix}${Math.min(error.repNumber + 1, Math.max(1, repCount))}` : ""}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {/* ── Next step ── */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                        href={cameraHref(session.exerciseId, session.repGoal || 12)}
                        className="flex-1 h-14 bg-primary text-background-dark font-semibold text-lg rounded-2xl flex items-center justify-center gap-2 hover:brightness-110"
                    >
                        <span className="material-symbols-outlined">replay</span>
                        {t.summary.actions.tryAgain}
                    </Link>
                    <Link
                        href="/"
                        className="flex-1 h-14 border border-white/15 text-white font-medium text-lg rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5"
                    >
                        <span className="material-symbols-outlined">home</span>
                        {t.summary.actions.backToDashboard}
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
