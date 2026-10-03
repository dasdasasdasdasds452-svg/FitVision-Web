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
import { DayPart, currentStreak, dayPart, lastWeekRecap, loadWeeklyGoal, saveWeeklyGoal, weekProgress } from "@/lib/progress";
import { describeIssue, parseIssueKey } from "@/lib/formAnalyzer";
import { Mission, MissionState, loadMissions, missionProgress, refreshMissions, saveMissions, skipActiveMission } from "@/lib/missions";

const REP_PRESETS = [5, 8, 10, 12];
const REST_PRESETS = [60, 90, 120, 180];

export default function Home() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const profile = useProfile();
    const [exercise, setExercise] = useState<ExerciseId>("squat");
    const [repGoal, setRepGoal] = useState<number>(12);
    const [history, setHistory] = useState<WorkoutSession[]>([]);
    const [weeklyGoal, setWeeklyGoal] = useState(3);
    const [sets, setSets] = useState(1);
    const [rest, setRest] = useState(90);
    const [weight, setWeight] = useState("");
    const [missions, setMissions] = useState<MissionState>({ active: null, completed: [], skipped: [] });
    const [part, setPart] = useState<DayPart | null>(null);
    const [onboardDismissed, setOnboardDismissed] = useState(true);

    useEffect(() => {
        const h = loadHistory();
        setHistory(h);
        setWeeklyGoal(loadWeeklyGoal());
        const { state } = refreshMissions(loadMissions(), h);
        saveMissions(state);
        setMissions(state);
        setPart(dayPart());
        try {
            setOnboardDismissed(localStorage.getItem("fitvision_onboarded") === "true");
        } catch {
            setOnboardDismissed(false);
        }
        // Remember the last exercise / rep goal so a repeat set is one tap.
        try {
            const saved = JSON.parse(getUserItem("fitvision_last_setup") || "null");
            if (saved && EXERCISE_IDS.includes(saved.exercise)) setExercise(saved.exercise);
            if (saved && Number.isFinite(saved.reps)) setRepGoal(Math.min(50, Math.max(1, saved.reps)));
            if (saved && Number.isFinite(saved.sets)) setSets(Math.min(10, Math.max(1, saved.sets)));
            if (saved && REST_PRESETS.includes(saved.rest)) setRest(saved.rest);
            if (saved && Number.isFinite(saved.kg) && saved.kg > 0) setWeight(String(saved.kg));
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        setUserItem("fitvision_last_setup", JSON.stringify({ exercise, reps: repGoal, sets, rest, kg: parseFloat(weight) || null }));
    }, [exercise, repGoal, sets, rest, weight]);

    const exerciseLabel = (id: ExerciseId) => t.camera.exerciseName[id];
    const week = useMemo(() => sessionsSince(history, 7), [history]);
    const weekAvg = averageScore(week);
    const topError = useMemo(() => mostFrequentError(history, 5), [history]);
    const locale = language === "th" ? "th-TH" : "en-US";

    const openSession = (s: WorkoutSession) => {
        setCurrentSession(s, false);
        router.push("/summary");
    };

    /** Mission names follow the current language when the mistake is a body-part issue. */
    const missionLabel = (m: Mission) => {
        const parsed = parseIssueKey(m.key);
        return parsed ? describeIssue(parsed, t.body).title : m.label;
    };
    const coachTopic = missions.active ? { exerciseId: missions.active.exerciseId, title: missionLabel(missions.active) } : topError;
    const coachHref = coachTopic
        ? `/chat?q=${encodeURIComponent(
            t.home.coachPrompt.replace("{exercise}", exerciseLabel(coachTopic.exerciseId)).replace("{error}", coachTopic.title)
        )}`
        : "/chat";

    const greetingName = profile.name ? ` ${profile.name}` : "";
    const streak = useMemo(() => currentStreak(history), [history]);
    const week7 = useMemo(() => weekProgress(history, weeklyGoal), [history, weeklyGoal]);
    const greeting = part ? t.motivation.greet[part] : t.dashboard.greeting;
    const headline = streak.trainedToday
        ? t.motivation.headlineDone
        : streak.days > 0
            ? t.motivation.headlineStreak.replace("{n}", String(streak.days))
            : t.motivation.headlineFresh;
    const changeGoal = (delta: number) => {
        const next = Math.min(7, Math.max(1, weeklyGoal + delta));
        setWeeklyGoal(next);
        saveWeeklyGoal(next);
    };
    const dismissOnboarding = () => {
        setOnboardDismissed(true);
        try { localStorage.setItem("fitvision_onboarded", "true"); } catch { /* ignore */ }
    };
    const showOnboarding = history.length === 0 && !onboardDismissed;
    const kg = parseFloat(weight);
    const kgValid = Number.isFinite(kg) && kg > 0 && kg < 1000 ? kg : null;
    const startHref = cameraHref(exercise, repGoal, { sets, rest: sets > 1 ? rest : undefined, kg: kgValid });
    const active: Mission | null = missions.active;
    const activeProgress = active ? missionProgress(active, history) : null;
    const recap = useMemo(() => {
        const day = new Date().getDay(); // show Mon–Wed
        return day >= 1 && day <= 3 ? lastWeekRecap(history) : null;
    }, [history]);
    const skipMission = () => {
        const next = refreshMissions(skipActiveMission(missions), history).state;
        saveMissions(next);
        setMissions(next);
    };

    return (
        <DashboardLayout>
            <div className="px-4 md:px-10 max-w-6xl mx-auto pt-4 md:pt-2 pb-10 flex flex-col gap-6 md:gap-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                    <div>
                        <p className="text-sm text-slate-400">
                            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        <h1 className="text-2xl md:text-4xl font-semibold text-white leading-tight mt-1">
                            {greeting}{greetingName} <span className="text-slate-300">{headline}</span>
                        </h1>
                    </div>
                    <Link href="/tutorial" className="text-primary text-sm font-medium inline-flex items-center gap-1.5 min-h-11 hover:underline">
                        <span className="material-symbols-outlined text-lg">play_circle</span>
                        {t.home.howToSetup}
                    </Link>
                </header>

                {showOnboarding && (
                    <section aria-labelledby="onboard-h" className="rounded-3xl p-5 md:p-6 border border-primary/30 bg-primary/[0.06] flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <h2 id="onboard-h" className="text-lg font-semibold text-white">{t.motivation.onboardTitle}</h2>
                            <button type="button" onClick={dismissOnboarding} className="min-h-10 px-3 rounded-lg text-sm text-slate-200 hover:bg-white/10 cursor-pointer">
                                {t.motivation.onboardDismiss}
                            </button>
                        </div>
                        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[t.motivation.onboard1, t.motivation.onboard2, t.motivation.onboard3].map((text, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <span className="size-8 shrink-0 rounded-full bg-primary text-background-dark font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                                    <span className="text-slate-100 leading-snug pt-1">
                                        {text}
                                        {i === 1 && <> <Link href="/tutorial" className="text-primary font-medium hover:underline">{t.motivation.onboard2Link}</Link></>}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

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

                        <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-4 items-start">
                            <div className="flex flex-col gap-2">
                                <p id="sets-label" className="text-sm text-slate-300 font-medium">
                                    <span className="text-white font-bold mr-1.5">3</span>{t.sets.setsLabel}
                                </p>
                                <div className="flex items-center gap-1" role="group" aria-labelledby="sets-label">
                                    <button type="button" aria-label={`${t.sets.setsLabel} −`} onClick={() => setSets((n) => Math.max(1, n - 1))} className="size-12 rounded-xl border border-white/15 bg-white/[0.04] text-2xl text-white hover:bg-white/10 cursor-pointer">−</button>
                                    <span aria-live="polite" className="w-12 text-center text-3xl font-bold text-white tabular-nums">{sets}</span>
                                    <button type="button" aria-label={`${t.sets.setsLabel} +`} onClick={() => setSets((n) => Math.min(10, n + 1))} className="size-12 rounded-xl border border-white/15 bg-white/[0.04] text-2xl text-white hover:bg-white/10 cursor-pointer">+</button>
                                </div>
                            </div>
                            {sets > 1 && (
                                <div className="flex flex-col gap-2">
                                    <p id="rest-label" className="text-sm text-slate-300 font-medium">{t.sets.restLabel}</p>
                                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rest-label">
                                        {REST_PRESETS.map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                aria-pressed={rest === r}
                                                onClick={() => setRest(r)}
                                                className={`h-12 min-w-14 px-3 rounded-xl border text-sm font-semibold tabular-nums cursor-pointer ${rest === r ? "bg-white text-background-dark border-white" : "border-white/15 text-slate-200 hover:border-white/40"}`}
                                            >
                                                {t.sets.restSeconds.replace("{s}", String(r))}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <label htmlFor="weight" className="text-sm text-slate-300 font-medium">{t.sets.weightLabel}</label>
                                <input
                                    id="weight"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={0.5}
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    aria-describedby="weight-hint"
                                    className="w-full sm:w-40 h-12 bg-white/[0.04] border border-white/15 rounded-xl px-4 text-white text-lg tabular-nums focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                />
                                <p id="weight-hint" className="text-xs text-slate-400">{t.sets.weightHint}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-slate-300 font-medium">
                                <span className="text-white font-bold mr-1.5">4</span>{t.home.step3}
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
                            href={startHref}
                            className="h-14 rounded-2xl bg-primary text-background-dark text-lg font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition"
                        >
                            <span className="material-symbols-outlined">videocam</span>
                            {t.home.openCamera} · {exerciseLabel(exercise)} {sets > 1 ? `${sets}×${repGoal}` : `${repGoal} ${t.home.repsUnit}`}{kgValid ? ` · ${kgValid} ${t.sets.kg}` : ""}
                        </Link>
                    </section>

                    <div className="flex flex-col gap-6">
                        {/* ── Last week recap (Mon–Wed) ── */}
                        {recap && (
                            <section aria-labelledby="recap-h" className="rounded-3xl p-5 bg-surface-dark border border-white/10 flex flex-col gap-1.5">
                                <h2 id="recap-h" className="text-sm font-semibold text-slate-300">{t.recap.title}</h2>
                                <p className="text-lg font-semibold text-white">
                                    {t.recap.body.replace("{days}", String(recap.days)).replace("{sessions}", String(recap.sessions)).replace("{score}", recap.avgScore === null ? "—" : `${recap.avgScore}%`)}
                                </p>
                                {recap.change !== null && recap.change !== 0 && (
                                    <p className={`text-sm font-medium ${recap.change > 0 ? "text-primary" : "text-orange-300"}`}>
                                        {(recap.change > 0 ? t.recap.better : t.recap.worse).replace("{n}", String(Math.abs(recap.change)))}
                                    </p>
                                )}
                                {active && <p className="text-sm text-slate-300">{t.recap.focus.replace("{issue}", missionLabel(active))}</p>}
                            </section>
                        )}

                        {/* ── Fix-it mission: the most common mistake becomes a goal ── */}
                        <section aria-labelledby="mission-h" className={`rounded-3xl p-5 flex flex-col gap-3 ${active ? "bg-orange-500/10 border border-orange-400/30" : "bg-surface-dark border border-white/10"}`}>
                            <h2 id="mission-h" className="text-sm font-semibold text-orange-300 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-lg">flag</span>
                                {t.missions.title}
                            </h2>
                            {active && activeProgress ? (
                                <>
                                    <p className="text-lg font-semibold text-white leading-snug">
                                        {t.missions.goal.replace("{exercise}", exerciseLabel(active.exerciseId)).replace("{n}", String(active.target)).replace("{issue}", missionLabel(active))}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <ol className="flex gap-1.5" aria-label={t.missions.progress.replace("{done}", String(activeProgress.done)).replace("{n}", String(activeProgress.target))}>
                                            {Array.from({ length: activeProgress.target }, (_, i) => (
                                                <li key={i} className={`size-7 rounded-full flex items-center justify-center ${i < activeProgress.done ? "bg-primary text-background-dark" : "border-2 border-white/20"}`}>
                                                    {i < activeProgress.done && <span aria-hidden="true" className="material-symbols-outlined text-base">check</span>}
                                                </li>
                                            ))}
                                        </ol>
                                        <span className="text-sm text-slate-200 tabular-nums">{t.missions.progress.replace("{done}", String(activeProgress.done)).replace("{n}", String(activeProgress.target))}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setExercise(active.exerciseId); document.getElementById("start-h")?.scrollIntoView({ behavior: "smooth" }); }}
                                            className="h-11 px-4 rounded-xl bg-orange-400 text-black font-semibold cursor-pointer hover:brightness-110"
                                        >
                                            {t.missions.start}
                                        </button>
                                        <Link href={coachHref} className="h-11 px-3 inline-flex items-center text-sm font-medium text-orange-200 hover:underline">{t.home.askCoach}</Link>
                                        <button type="button" onClick={skipMission} className="h-11 px-3 text-sm text-slate-300 hover:text-white cursor-pointer">{t.missions.skip}</button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-slate-300">{history.length > 0 && !topError ? t.home.allGood : t.missions.empty}</p>
                            )}
                            {missions.completed.length > 0 && (
                                <div className="pt-3 mt-1 border-t border-white/10">
                                    <p className="text-xs text-slate-400 mb-2">{t.missions.badges} ({missions.completed.length})</p>
                                    <ul className="flex flex-wrap gap-2">
                                        {missions.completed.slice(0, 6).map((m) => (
                                            <li key={m.id} title={missionLabel(m)} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-primary/10 border border-primary/30 text-xs text-white max-w-full">
                                                <span className="material-symbols-outlined filled text-primary text-base">military_tech</span>
                                                <span className="truncate">{missionLabel(m)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>

                        {/* ── Progress: streak + weekly goal ── */}
                        <section aria-labelledby="week-h" className="rounded-3xl p-5 bg-surface-dark border border-white/10 flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <span className={`size-12 rounded-2xl flex items-center justify-center ${streak.days > 0 ? "bg-orange-500/15 text-orange-300" : "bg-white/[0.06] text-slate-400"}`}>
                                    <span className={`material-symbols-outlined text-3xl ${streak.days > 0 ? "filled" : ""}`}>local_fire_department</span>
                                </span>
                                <div>
                                    <p className="text-xl font-bold text-white tabular-nums">
                                        {streak.days > 0 ? t.motivation.streakDays.replace("{n}", String(streak.days)) : t.motivation.streakStart}
                                    </p>
                                    <p className="text-sm text-slate-300">{t.motivation.streakHint}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-baseline justify-between gap-2">
                                    <h2 id="week-h" className="text-base font-semibold text-white">{t.motivation.weekTitle}</h2>
                                    <span className="text-sm text-slate-300 tabular-nums">
                                        {t.motivation.weekCount.replace("{done}", String(week7.daysTrained)).replace("{goal}", String(week7.goal))}
                                    </span>
                                </div>
                                <ol className="grid grid-cols-7 gap-1.5" aria-label={t.motivation.weekTitle}>
                                    {week7.week.map((d, i) => (
                                        <li key={i} className="flex flex-col items-center gap-1">
                                            <span
                                                className={`size-8 rounded-full flex items-center justify-center ${d.trained
                                                    ? "bg-primary text-background-dark"
                                                    : d.isToday
                                                        ? "border-2 border-primary/60 text-slate-300"
                                                        : "bg-white/[0.06] text-slate-500"
                                                    }`}
                                            >
                                                {d.trained && <span aria-hidden="true" className="material-symbols-outlined text-lg">check</span>}
                                            </span>
                                            <span className={`text-xs ${d.isToday ? "text-white font-semibold" : "text-slate-400"}`}>{t.motivation.days[i]}</span>
                                        </li>
                                    ))}
                                </ol>
                                <p className={`text-sm ${week7.reached ? "text-primary font-medium" : "text-slate-300"}`}>
                                    {week7.reached
                                        ? t.motivation.weekReached
                                        : t.motivation.weekLeft.replace("{n}", String(week7.goal - week7.daysTrained))}
                                </p>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <span id="goal-label" className="text-sm text-slate-300">{t.motivation.goalLabel}</span>
                                    <div className="flex items-center gap-1" role="group" aria-labelledby="goal-label">
                                        <button type="button" aria-label={t.motivation.lessGoal} onClick={() => changeGoal(-1)} disabled={weeklyGoal <= 1} className="size-10 rounded-lg border border-white/15 text-white disabled:opacity-40 cursor-pointer">−</button>
                                        <span className="w-8 text-center font-bold text-white tabular-nums" aria-live="polite">{weeklyGoal}</span>
                                        <button type="button" aria-label={t.motivation.moreGoal} onClick={() => changeGoal(1)} disabled={weeklyGoal >= 7} className="size-10 rounded-lg border border-white/15 text-white disabled:opacity-40 cursor-pointer">+</button>
                                    </div>
                                </div>
                            </div>

                            <dl className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.avgForm}</dt>
                                    <dd className="text-xl font-bold text-white tabular-nums">{weekAvg === null ? "—" : `${weekAvg}%`}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.sessions}</dt>
                                    <dd className="text-xl font-bold text-white tabular-nums">{week.length}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">{t.home.totalReps}</dt>
                                    <dd className="text-xl font-bold text-white tabular-nums">{totalReps(week)}</dd>
                                </div>
                            </dl>
                        </section>

                        {/* ── Friends: weekly leaderboard (also the mobile entry point) ── */}
                        <Link
                            href="/friends"
                            className="rounded-3xl p-5 bg-surface-dark border border-white/10 flex items-center gap-4 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-primary"
                        >
                            <span className="size-11 rounded-2xl bg-sky-300/15 text-sky-300 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined">group</span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-white">{t.friends.homeLink}</span>
                                <span className="block text-sm text-slate-400">{t.friends.homeLinkDesc}</span>
                            </span>
                            <span className="material-symbols-outlined text-slate-400" aria-hidden="true">chevron_right</span>
                        </Link>
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
