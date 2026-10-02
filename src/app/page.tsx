"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { getUserItem, setUserItem } from "@/lib/userStorage";
import { useProfile } from "@/components/UserAvatar";
import { useLanguage } from "@/context/LanguageContext";
import {
    EXERCISE_IDS,
    ExerciseId,
    WorkoutSession,
    averageScore,
    cameraHref,
    loadHistory,
    mostFrequentError,
    sessionsSince,
    setCurrentSession,
    totalReps,
} from "@/lib/workoutStore";

const REP_PRESETS = [5, 8, 10, 12];

export default function Home() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const profile = useProfile();
    const [exercise, setExercise] = useState<ExerciseId>("squat");
    const [repGoal, setRepGoal] = useState<number>(12);
    const [history, setHistory] = useState<WorkoutSession[]>([]);

    useEffect(() => {
        setHistory(loadHistory());
        // Remember the last exercise / rep goal so a repeat set is one tap.
        try {
            const saved = JSON.parse(getUserItem("fitvision_last_setup") || "null");
            if (saved && EXERCISE_IDS.includes(saved.exercise)) setExercise(saved.exercise);
            if (saved && Number.isFinite(saved.reps)) setRepGoal(Math.min(50, Math.max(1, saved.reps)));
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        setUserItem("fitvision_last_setup", JSON.stringify({ exercise, reps: repGoal }));
    }, [exercise, repGoal]);

    const exerciseLabel = (id: ExerciseId) => t.camera.exerciseName[id];
    const week = useMemo(() => sessionsSince(history, 7), [history]);
    const weekAvg = averageScore(week);
    const topError = useMemo(() => mostFrequentError(history, 5), [history]);
    const locale = language === "th" ? "th-TH" : "en-US";

    const openSession = (s: WorkoutSession) => {
        setCurrentSession(s, false);
        router.push("/summary");
    };

    const coachHref = topError
        ? `/chat?q=${encodeURIComponent(
            t.home.coachPrompt.replace("{exercise}", exerciseLabel(topError.exerciseId)).replace("{error}", topError.title)
        )}`
        : "/chat";

    const greetingName = profile.name ? ` ${profile.name}` : "";

    return (
        <DashboardLayout>
            <div className="px-4 md:px-10 max-w-6xl mx-auto pt-4 md:pt-2 pb-10 flex flex-col gap-6 md:gap-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                    <div>
                        <p className="text-sm text-slate-400">
                            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        <h1 className="text-2xl md:text-4xl font-semibold text-white leading-tight mt-1">
                            {t.dashboard.greeting}{greetingName} <span className="text-slate-300">{t.home.question}</span>
                        </h1>
                    </div>
                    <Link href="/tutorial" className="text-primary text-sm font-medium inline-flex items-center gap-1.5 min-h-11 hover:underline">
                        <span className="material-symbols-outlined text-lg">play_circle</span>
                        {t.home.howToSetup}
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6 items-start">
                    {/* ── Start panel: everything needed to begin a set, in one place ── */}
                    <section aria-labelledby="start-h" className="bg-surface-dark border border-white/10 rounded-3xl p-5 md:p-7 flex flex-col gap-6">
                        <h2 id="start-h" className="text-xl font-semibold text-white">{t.home.startTitle}</h2>

                        <fieldset className="flex flex-col gap-3">
                            <legend className="text-sm text-slate-300 font-medium mb-3">
                                <span className="text-white font-bold mr-1.5">1</span>{t.home.step1}
                            </legend>
                            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {EXERCISE_IDS.map((id) => {
                                    const selected = exercise === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => setExercise(id)}
                                            className={`flex items-center gap-3 min-h-14 px-4 py-3 rounded-2xl border-2 text-left transition-colors cursor-pointer ${selected
                                                ? "border-primary bg-primary/10"
                                                : "border-white/10 bg-white/[0.03] hover:border-white/25"
                                                }`}
                                        >
                                            <span aria-hidden="true" className={`size-5 rounded-full shrink-0 ${selected ? "border-[6px] border-primary bg-background-dark" : "border-2 border-slate-500"}`} />
                                            <span className="text-lg font-semibold text-white">{exerciseLabel(id)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="flex flex-col gap-3">
                            <p id="reps-label" className="text-sm text-slate-300 font-medium">
                                <span className="text-white font-bold mr-1.5">2</span>{t.home.step2}
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1" role="group" aria-labelledby="reps-label">
                                    <button
                                        type="button"
                                        aria-label={t.home.decreaseReps}
                                        onClick={() => setRepGoal((r) => Math.max(1, r - 1))}
                                        className="size-12 rounded-xl border border-white/15 bg-white/[0.04] text-2xl text-white hover:bg-white/10 cursor-pointer"
                                    >
                                        −
                                    </button>
                                    <span aria-live="polite" className="w-16 text-center text-3xl font-bold text-white tabular-nums">{repGoal}</span>
                                    <button
                                        type="button"
                                        aria-label={t.home.increaseReps}
                                        onClick={() => setRepGoal((r) => Math.min(50, r + 1))}
                                        className="size-12 rounded-xl border border-white/15 bg-white/[0.04] text-2xl text-white hover:bg-white/10 cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    {REP_PRESETS.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            aria-pressed={repGoal === n}
                                            onClick={() => setRepGoal(n)}
                                            className={`h-10 min-w-12 px-3 rounded-full border text-sm font-semibold tabular-nums cursor-pointer transition-colors ${repGoal === n
                                                ? "bg-white text-background-dark border-white"
                                                : "border-white/15 text-slate-200 hover:border-white/40"
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-slate-300 font-medium">
                                <span className="text-white font-bold mr-1.5">3</span>{t.home.step3}
                            </p>
                            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-200">
                                {[t.home.check1, t.home.check2, t.home.check3].map((c) => (
                                    <li key={c} className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.04]">
                                        <span className="material-symbols-outlined text-primary text-lg leading-none">check</span>
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Link
                            href={cameraHref(exercise, repGoal)}
                            className="h-14 rounded-2xl bg-primary text-background-dark text-lg font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition"
                        >
                            <span className="material-symbols-outlined">videocam</span>
                            {t.home.openCamera} · {exerciseLabel(exercise)} {repGoal} {t.home.repsUnit}
                        </Link>
                    </section>

                    <div className="flex flex-col gap-6">
                        {/* ── What to fix first: computed from real history ── */}
                        {topError ? (
                            <section aria-labelledby="fix-h" className="rounded-3xl p-5 bg-orange-500/10 border border-orange-400/30 flex flex-col gap-2">
                                <h2 id="fix-h" className="text-sm font-semibold text-orange-300 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-lg">warning</span>
                                    {t.home.fixFirst}
                                </h2>
                                <p className="text-lg font-semibold text-white leading-snug">
                                    {topError.title} <span className="text-slate-300 font-normal">({exerciseLabel(topError.exerciseId)})</span>
                                </p>
                                <p className="text-sm text-slate-300">
                                    {t.home.fixFoundIn.replace("{n}", String(topError.sessionCount)).replace("{total}", String(topError.inspected))}
                                </p>
                                <Link href={coachHref} className="text-sm font-semibold text-orange-300 hover:underline min-h-11 inline-flex items-center">
                                    {t.home.askCoach} →
                                </Link>
                            </section>
                        ) : (
                            <section className="rounded-3xl p-5 bg-surface-dark border border-white/10">
                                <h2 className="text-sm font-semibold text-slate-300 mb-1">{t.home.fixFirst}</h2>
                                <p className="text-sm text-slate-300">{history.length > 0 ? t.home.allGood : t.home.noFixYet}</p>
                            </section>
                        )}

                        {/* ── Last 7 days ── */}
                        <section aria-labelledby="week-h" className="rounded-3xl p-5 bg-surface-dark border border-white/10">
                            <div className="flex items-baseline justify-between mb-4">
                                <h2 id="week-h" className="text-base font-semibold text-white">{t.home.last7Days}</h2>
                                <Link href="/history" className="text-sm text-primary hover:underline">{t.dashboard.stats.viewAll}</Link>
                            </div>
                            <dl className="grid grid-cols-3 gap-3">
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.avgForm}</dt>
                                    <dd className="text-2xl font-bold text-white tabular-nums">{weekAvg === null ? "—" : `${weekAvg}%`}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.sessions}</dt>
                                    <dd className="text-2xl font-bold text-white tabular-nums">{week.length}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.totalReps}</dt>
                                    <dd className="text-2xl font-bold text-white tabular-nums">{totalReps(week)}</dd>
                                </div>
                            </dl>
                        </section>
                    </div>
                </div>

                {/* ── Recent sessions ── */}
                <section aria-labelledby="recent-h" className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                        <h2 id="recent-h" className="text-lg font-semibold text-white">{t.home.recent}</h2>
                        {history.length > 0 && (
                            <Link href="/history" className="text-sm text-primary hover:underline">{t.home.viewHistory}</Link>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p className="text-slate-300 p-5 rounded-2xl border border-white/10 text-center">{t.dashboard.stats.noSessions}</p>
                    ) : (
                        <ul className="rounded-2xl border border-white/10 bg-surface-dark overflow-hidden divide-y divide-white/5">
                            {history.slice(0, 3).map((s) => (
                                <li key={s.id}>
                                    <button
                                        type="button"
                                        onClick={() => openSession(s)}
                                        className="w-full grid grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-4 px-4 md:px-5 py-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                                    >
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-white">{exerciseLabel(s.exerciseId)}</span>
                                            <span className="block text-sm text-slate-400 truncate">
                                                {new Date(s.timestamp).toLocaleDateString(locale, { day: "numeric", month: "short" })} ·{" "}
                                                {s.completedReps}/{s.repGoal} {t.home.repsUnit} ·{" "}
                                                {s.errorCount === 0 ? (
                                                    <span className="text-primary">{t.dashboard.stats.flawlessSet}</span>
                                                ) : (
                                                    <span className="text-orange-300">{s.errorCount} {t.dashboard.stats.mistakesDetected}</span>
                                                )}
                                            </span>
                                        </span>
                                        <span className="text-xl font-bold text-white tabular-nums">
                                            {s.avgScore === null ? <span className="text-sm font-normal text-slate-400">{t.home.noScore}</span> : `${s.avgScore}%`}
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
