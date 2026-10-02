import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

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
    t: any;
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
}

/**
 * End button that needs two taps (within 3 s). A single accidental tap while
 * setting up under the bar must not throw away the whole set.
 */
function EndWorkoutButton({ t, endWorkoutData, className }: { t: any; endWorkoutData: () => void; className: string }) {
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
            className={`${className} ${armed ? "bg-orange-500 text-black border-orange-400" : "bg-black/70 text-white border-white/25 hover:bg-black/80"}`}
        >
            <span className="material-symbols-outlined text-xl">{armed ? "warning" : "stop_circle"}</span>
            {armed ? t.camera.confirmEnd : t.camera.endWorkout}
        </button>
    );
}

export function CameraMobileHUD({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, endWorkoutData, riskLevel } = props;
    const { language } = useLanguage();

    if (!isTrackingStarted) return null;

    const mobileRiskLabel = riskLevel
        ? (language === "th" ? riskLevel.label_th : (riskLevel.label || riskLevel.label_th))
        : "";

    return (
        <>
            {/* Big rep counter — readable from 2–3 m away */}
            <div className="lg:hidden absolute top-16 right-3 z-20 text-right leading-none pointer-events-none" aria-live="polite">
                <span className="text-white font-black text-6xl tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{currentReps}</span>
                <span className="text-white/70 font-bold text-2xl">/{repGoal}</span>
                <div className="text-white/80 text-sm font-semibold mt-1 drop-shadow">{t.camera.reps}</div>
            </div>

            {/* Form feedback banner — orange when something needs fixing */}
            <div role="status" className={`lg:hidden absolute top-40 left-3 right-3 z-20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl transition-colors ${isGoodForm ? "bg-black/70 border border-primary/40" : "bg-orange-400 text-black"}`}>
                <span className={`material-symbols-outlined text-3xl shrink-0 ${isGoodForm ? "text-primary" : "text-black"}`}>{isGoodForm ? "check_circle" : "warning"}</span>
                <div className="min-w-0">
                    <p className={`font-bold text-xl leading-tight ${isGoodForm ? "text-primary" : "text-black"}`}>{feedbackTitle}</p>
                    <p className={`text-base leading-snug line-clamp-2 ${isGoodForm ? "text-white/85" : "text-black/85"}`}>{feedbackDetail}</p>
                </div>
            </div>

            <div className="lg:hidden relative z-20 mt-auto p-3 pb-4">
                <div className="flex items-center justify-between mb-2 px-1 text-sm">
                    <span className="text-white/90 font-semibold drop-shadow">
                        {t.camera.formScore} <span className="font-black tabular-nums">{formScore}%</span>
                    </span>
                    {riskLevel && (
                        <span className="flex items-center gap-1 font-semibold" style={{ color: riskLevel.color }}>
                            <span className="material-symbols-outlined text-base">health_and_safety</span>{mobileRiskLabel}
                        </span>
                    )}
                </div>
                <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden mb-3">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (currentReps / Math.max(1, repGoal)) * 100)}%` }}></div>
                </div>
                <EndWorkoutButton t={t} endWorkoutData={endWorkoutData}
                    className="w-full h-14 rounded-2xl border font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]" />
            </div>
        </>
    );
}

export function CameraDesktopPanel({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, exerciseName, endWorkoutData, riskLevel } = props;
    const { language } = useLanguage();
    
    if (!isTrackingStarted) return null;

    // Derive risk display from API data or fall back to form-based
    const riskLabel = riskLevel 
        ? (language === "th" ? riskLevel.label_th : (riskLevel.label || riskLevel.label_th))
        : (isGoodForm ? t.camera.lowRisk : t.camera.highRisk);
    const riskColor = riskLevel ? riskLevel.color : (isGoodForm ? "#22c55e" : "#f97316");
    const riskIcon = riskLevel
        ? (riskLevel.level === "low" ? "verified_user" : riskLevel.level === "critical" ? "emergency" : "health_and_safety")
        : "health_and_safety";
    
    return (
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-[#0a0a0a] border-l border-white/5 p-5 xl:p-6 gap-5 overflow-y-auto">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                <span className="material-symbols-outlined text-primary text-3xl">fitness_center</span>
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{exerciseName}</h3>
                    <p className="text-white/40 text-xs">{t.camera.aiPowered}</p>
                </div>
            </div>

            <div className={`rounded-2xl p-5 border text-center ${isGoodForm ? "bg-primary/10 border-primary/20" : "bg-orange-500/10 border-orange-500/30"}`}>
                <span className={`text-xs uppercase tracking-[0.2em] font-bold ${isGoodForm ? "text-primary/60" : "text-orange-300"}`}>{t.camera.formScore}</span>
                <div className={`text-6xl font-black leading-none mt-1 ${isGoodForm ? "text-primary" : "text-orange-400"}`}>{formScore}<span className="text-xl">%</span></div>
            </div>

            <div className={`flex items-start gap-3 rounded-2xl p-4 border ${isGoodForm ? "bg-primary/5 border-primary/20" : "bg-orange-500/10 border-orange-500/30"}`}>
                <span className={`material-symbols-outlined text-2xl shrink-0 mt-0.5 ${isGoodForm ? "text-primary" : "text-orange-400"}`}>{isGoodForm ? "check_circle" : "warning"}</span>
                <div className="min-w-0">
                    <p className={`font-bold text-sm ${isGoodForm ? "text-primary" : "text-orange-300"}`}>{feedbackTitle}</p>
                    <p className={`text-xs mt-1 leading-relaxed ${isGoodForm ? "text-white/50" : "text-orange-100/80"}`}>{feedbackDetail}</p>
                </div>
            </div>

            {/* ── Injury Risk Assessment Card ── */}
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-xl" style={{ color: riskColor }}>{riskIcon}</span>
                    <div>
                        <p className="font-bold text-sm" style={{ color: riskColor }}>{riskLabel}</p>
                        <p className="text-white/30 text-xs">{t.camera.injuryRisk}</p>
                    </div>
                    {riskLevel && (
                        <div className="ml-auto text-right">
                            <span className="text-lg font-black" style={{ color: riskColor }}>{riskLevel.score}</span>
                            <span className="text-white/30 text-xs ml-0.5">/100</span>
                        </div>
                    )}
                </div>
                {/* Risk score bar */}
                <div className="w-full bg-white/5 rounded-full h-2 mb-2 border border-white/10 overflow-hidden">
                    <div className="h-full transition-all duration-500 rounded-full" style={{ 
                        width: `${riskLevel ? riskLevel.score : (isGoodForm ? 10 : 60)}%`,
                        backgroundColor: riskColor
                    }}></div>
                </div>
                {/* Risk factors list */}
                {riskLevel && riskLevel.factors.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {riskLevel.factors.slice(0, 3).map((factor, i) => (
                            <p key={i} className="text-xs text-white/40 flex items-start gap-1">
                                <span className="text-white/20 mt-px">•</span>
                                <span>{factor}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-auto pt-5">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider font-bold block">{t.camera.repCount}</span>
                        <div className="text-4xl font-black text-white mt-1">
                            <span className="text-white">{currentReps}</span>
                            <span className="text-white/20 text-2xl">/{repGoal}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 mb-6 border border-white/10 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, (currentReps / repGoal) * 100)}%` }}></div>
                </div>

                <EndWorkoutButton t={t} endWorkoutData={endWorkoutData}
                    className="w-full h-14 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]" />
            </div>
        </aside>
    );
}
