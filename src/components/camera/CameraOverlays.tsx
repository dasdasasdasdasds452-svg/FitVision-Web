import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import type { en } from "@/locales/en";

type Dict = typeof en;

interface RiskLevelData {
    level: string;
    label: string;
    label_th: string;
    score: number;
    color: string;
    factors: string[];
    recommendation: string;
}

export interface CameraOverlayProps {
    t: Dict;
    isTrackingStarted: boolean;
    isGoodForm: boolean;
    formScore: number;
    feedbackTitle: string;
    feedbackDetail: string;
    currentReps: number;
    repGoal: number;
    exerciseName: string;
    endWorkoutData: () => void;
    riskLevel: RiskLevelData | null;
    /** Specific body-part issue from formAnalyzer, already translated. */
    issue?: { title: string; cue: string } | null;
    /** e.g. "Set 2/3" when training multiple sets. */
    setLabel?: string | null;
    /** e.g. "Focus: left knee caves in" while a fix-it mission is active. */
    missionFocus?: string | null;
    /** Ghost rep (best rep replayed as a dashed skeleton). */
    ghost?: { available: boolean; on: boolean; toggle: () => void } | null;
}

/** On/off switch for the ghost rep. */
function GhostToggle({ t, ghost, className }: { t: Dict; ghost: NonNullable<CameraOverlayProps["ghost"]>; className: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={ghost.on}
            aria-label={t.ghost.toggle}
            onClick={ghost.toggle}
            className={`${className} inline-flex items-center gap-2 rounded-full border font-medium backdrop-blur-md transition-colors cursor-pointer ${ghost.on ? "bg-sky-300/20 border-sky-300/50 text-sky-100" : "bg-black/55 border-white/15 text-slate-200"}`}
        >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">{ghost.on ? "visibility" : "visibility_off"}</span>
            {t.ghost.label}: {ghost.on ? t.ghost.on : t.ghost.off}
        </button>
    );
}

/**
 * End button that needs two taps (within 3 s). A single accidental tap while
 * setting up under the bar must not throw away the whole set.
 */
function EndWorkoutButton({ t, endWorkoutData, className }: { t: Dict; endWorkoutData: () => void; className: string }) {
    const [armed, setArmed] = useState(false);
    const router = useRouter();
    useEffect(() => {
        if (!armed) return;
        const id = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(id);
    }, [armed]);
    return (
        <button
            type="button"
            onClick={() => {
                if (!armed) { setArmed(true); return; }
                endWorkoutData();
                router.push("/summary");
            }}
            aria-live="polite"
            className={`${className} ${armed ? "bg-orange-400 text-background-dark border-orange-300" : "bg-black/60 backdrop-blur-md text-white border-white/20 hover:bg-black/75"}`}
        >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">{armed ? "warning" : "stop_circle"}</span>
            {armed ? t.camera.confirmEnd : t.camera.endWorkout}
        </button>
    );
}

function riskText(riskLevel: RiskLevelData | null, language: string): string {
    if (!riskLevel) return "";
    return language === "th" ? riskLevel.label_th : riskLevel.label || riskLevel.label_th;
}

export function CameraMobileHUD({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, endWorkoutData, riskLevel, issue, setLabel, missionFocus, ghost } = props;
    const { language } = useLanguage();

    if (!isTrackingStarted) return null;

    // A specific body-part issue is more useful than the generic verdict, so it wins the banner.
    const warn = !!issue || !isGoodForm;
    const bannerTitle = issue ? issue.title : feedbackTitle;
    const bannerDetail = issue ? issue.cue : feedbackDetail;
    const progress = Math.min(100, (currentReps / Math.max(1, repGoal)) * 100);

    return (
        <>
            {/* Top row under the header: ghost switch (left), big rep counter (right) — readable from 2–3 m */}
            {ghost?.available && (
                <GhostToggle t={t} ghost={ghost} className="lg:hidden absolute top-[4.75rem] left-3 z-20 h-10 px-3 text-sm" />
            )}
            <div className="lg:hidden absolute top-[4.75rem] right-3 z-20 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 px-3.5 py-2 text-right" aria-live="polite">
                <div className="leading-none">
                    <span key={currentReps} className="animate-rep text-white font-bold text-6xl tabular-nums">{currentReps}</span>
                    <span className="text-slate-300 font-semibold text-2xl tabular-nums">/{repGoal}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-300">{setLabel ? `${t.camera.reps} · ${setLabel}` : t.camera.reps}</p>
            </div>

            {/* Bottom stack: the body stays clear in the middle of the frame */}
            <div className="lg:hidden relative z-20 mt-auto px-3 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-2.5">
                {missionFocus && (
                    <p className="self-start max-w-full text-sm text-white bg-black/55 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-lg shrink-0" aria-hidden="true">flag</span>
                        <span className="truncate">{missionFocus}</span>
                    </p>
                )}

                <div role="status" className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${warn ? "bg-orange-400 text-background-dark" : "bg-black/60 backdrop-blur-md border border-primary/40"}`}>
                    <span className={`material-symbols-outlined text-3xl shrink-0 filled ${warn ? "text-background-dark" : "text-primary"}`} aria-hidden="true">{warn ? "warning" : "check_circle"}</span>
                    <div className="min-w-0">
                        <p className={`font-semibold text-lg leading-tight ${warn ? "" : "text-primary"}`}>{bannerTitle}</p>
                        {bannerDetail && <p className={`mt-0.5 text-sm leading-snug line-clamp-2 ${warn ? "text-background-dark/85" : "text-slate-200"}`}>{bannerDetail}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-between px-1 text-sm">
                    <span className="text-slate-200">
                        {t.camera.formScore} <span className="font-semibold text-white tabular-nums">{formScore}%</span>
                    </span>
                    {riskLevel && (
                        <span className="flex items-center gap-1 font-medium" style={{ color: riskLevel.color }}>
                            <span className="material-symbols-outlined text-base" aria-hidden="true">health_and_safety</span>{riskText(riskLevel, language)}
                        </span>
                    )}
                </div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>

                <EndWorkoutButton t={t} endWorkoutData={endWorkoutData}
                    className="mt-1 w-full h-14 rounded-2xl border font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]" />
            </div>
        </>
    );
}

export function CameraDesktopPanel({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, exerciseName, endWorkoutData, riskLevel, issue, setLabel, missionFocus, ghost } = props;
    const { language } = useLanguage();

    if (!isTrackingStarted) return null;

    // Derive risk display from API data or fall back to form-based
    const riskLabel = riskLevel ? riskText(riskLevel, language) : (isGoodForm ? t.camera.lowRisk : t.camera.highRisk);
    const riskColor = riskLevel ? riskLevel.color : (isGoodForm ? "#22c55e" : "#f97316");
    const riskIcon = riskLevel
        ? (riskLevel.level === "low" ? "verified_user" : riskLevel.level === "critical" ? "emergency" : "health_and_safety")
        : "health_and_safety";
    const progress = Math.min(100, (currentReps / Math.max(1, repGoal)) * 100);
    const card = "rounded-2xl bg-surface-dark border border-white/10";

    return (
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-surface-darker border-l border-white/10 p-5 xl:p-6 gap-4 overflow-y-auto">
            <div className={`${card} flex items-center gap-3 p-4`}>
                <span className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">fitness_center</span>
                </span>
                <div className="min-w-0">
                    <h3 className="text-white font-semibold text-lg leading-tight truncate">{exerciseName}</h3>
                    <p className="text-slate-400 text-sm">{setLabel || t.camera.aiPowered}</p>
                </div>
            </div>

            {/* Reps — the number people look for first */}
            <div className={`${card} p-5`}>
                <p className="text-sm text-slate-400">{t.camera.repCount}</p>
                <div className="mt-1 leading-none" aria-live="polite">
                    <span key={currentReps} className="animate-rep text-6xl font-bold text-white tabular-nums">{currentReps}</span>
                    <span className="text-2xl font-semibold text-slate-500 tabular-nums">/{repGoal}</span>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className={`rounded-2xl p-4 border flex items-start gap-3 ${isGoodForm ? "bg-primary/[0.06] border-primary/25" : "bg-orange-500/10 border-orange-400/30"}`}>
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-400">{t.camera.formScore}</p>
                    <p className={`text-4xl font-bold leading-tight tabular-nums ${isGoodForm ? "text-primary" : "text-orange-300"}`}>{formScore}<span className="text-lg">%</span></p>
                    <p className={`mt-2 font-semibold text-sm ${isGoodForm ? "text-primary" : "text-orange-300"}`}>{feedbackTitle}</p>
                    {feedbackDetail && <p className="text-sm mt-0.5 leading-relaxed text-slate-300">{feedbackDetail}</p>}
                </div>
                <span className={`material-symbols-outlined text-3xl shrink-0 filled ${isGoodForm ? "text-primary" : "text-orange-300"}`} aria-hidden="true">{isGoodForm ? "check_circle" : "warning"}</span>
            </div>

            {issue && (
                <div role="status" className="rounded-2xl p-4 bg-orange-400 text-background-dark">
                    <p className="text-xs font-semibold opacity-80">{t.body.whereTitle}</p>
                    <p className="font-semibold text-lg leading-tight mt-0.5">{issue.title}</p>
                    <p className="text-sm mt-1">{issue.cue}</p>
                </div>
            )}
            {missionFocus && (
                <p className={`${card} text-sm text-slate-100 px-4 py-3 flex items-start gap-2`}>
                    <span className="material-symbols-outlined text-primary text-lg shrink-0" aria-hidden="true">flag</span>{missionFocus}
                </p>
            )}

            {ghost && (
                <div className={`${card} p-4 flex flex-col gap-2`}>
                    {ghost.available ? (
                        <>
                            <GhostToggle t={t} ghost={ghost} className="self-start h-10 px-3 text-sm" />
                            {ghost.on && <p className="text-xs text-slate-400">{t.ghost.legend}</p>}
                        </>
                    ) : (
                        <p className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="material-symbols-outlined text-sky-300 text-lg shrink-0" aria-hidden="true">accessibility_new</span>{t.ghost.none}
                        </p>
                    )}
                </div>
            )}

            {/* ── Injury Risk Assessment ── */}
            <div className={`${card} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-xl" style={{ color: riskColor }} aria-hidden="true">{riskIcon}</span>
                    <div>
                        <p className="font-semibold text-sm" style={{ color: riskColor }}>{riskLabel}</p>
                        <p className="text-slate-400 text-xs">{t.camera.injuryRisk}</p>
                    </div>
                    {riskLevel && (
                        <div className="ml-auto text-right">
                            <span className="text-lg font-bold tabular-nums" style={{ color: riskColor }}>{riskLevel.score}</span>
                            <span className="text-slate-500 text-xs ml-0.5">/100</span>
                        </div>
                    )}
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden" aria-hidden="true">
                    <div className="h-full transition-all duration-500 rounded-full" style={{
                        width: `${riskLevel ? riskLevel.score : (isGoodForm ? 10 : 60)}%`,
                        backgroundColor: riskColor,
                    }} />
                </div>
                {riskLevel && riskLevel.factors.length > 0 && (
                    <ul className="mt-3 space-y-1">
                        {riskLevel.factors.slice(0, 3).map((factor, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-slate-500" aria-hidden="true">•</span>
                                <span>{factor}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-auto pt-2">
                <EndWorkoutButton t={t} endWorkoutData={endWorkoutData}
                    className="w-full h-14 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]" />
            </div>
        </aside>
    );
}
