import Link from "next/link";

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

export function CameraMobileHUD({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, endWorkoutData, riskLevel } = props;
    
    if (!isTrackingStarted) return null;
    
    return (
        <div className="lg:hidden relative z-20 mt-auto p-3 pb-4">
            <div className="bg-black/75 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${isGoodForm ? "bg-primary/15 border border-primary/30" : "bg-red-500/15 border border-red-500/30"}`}>
                        <span className={`text-2xl font-black leading-none ${isGoodForm ? "text-primary" : "text-red-400"}`}>{formScore}<span className="text-[10px]">%</span></span>
                        <span className={`text-[8px] uppercase tracking-wider font-bold ${isGoodForm ? "text-primary/70" : "text-red-400/70"}`}>{t.camera.form}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`material-symbols-outlined text-base ${isGoodForm ? "text-primary" : "text-red-400"}`}>{isGoodForm ? "check_circle" : "warning"}</span>
                            <span className={`font-bold text-sm truncate ${isGoodForm ? "text-primary" : "text-red-300"}`}>{feedbackTitle}</span>
                        </div>
                        <p className={`text-xs leading-tight line-clamp-2 ${isGoodForm ? "text-white/60" : "text-red-200/80"}`}>{feedbackDetail}</p>
                        {/* Injury Risk Badge (Mobile) */}
                        {riskLevel && (
                            <div className="flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-xs" style={{ color: riskLevel.color }}>health_and_safety</span>
                                <span className="text-[10px] font-bold" style={{ color: riskLevel.color }}>{riskLevel.label_th}</span>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 text-center">
                        <span className="text-blue-400 font-black text-2xl leading-none">{currentReps}</span>
                        <span className="text-white/40 text-xs font-medium">/{repGoal}</span>
                        <div className="text-[8px] text-white/40 uppercase tracking-wider font-bold">{t.camera.reps}</div>
                    </div>
                </div>
                <Link href="/summary" onClick={endWorkoutData}
                    className="mt-3 w-full h-12 bg-red-600/90 hover:bg-red-500 active:scale-[0.98] transition-all rounded-xl text-white font-bold text-sm shadow-lg border border-red-500/40 flex items-center justify-center gap-2 cursor-pointer">
                    <span className="material-symbols-outlined text-lg">stop_circle</span>{t.camera.endWorkout}
                </Link>
            </div>
        </div>
    );
}

export function CameraDesktopPanel({ props }: { props: CameraOverlayProps }) {
    const { t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, currentReps, repGoal, exerciseName, endWorkoutData, riskLevel } = props;
    
    if (!isTrackingStarted) return null;

    // Derive risk display from API data or fall back to form-based
    const riskLabel = riskLevel ? riskLevel.label_th : (isGoodForm ? t.camera.lowRisk : t.camera.highRisk);
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

            <div className={`rounded-2xl p-5 border text-center ${isGoodForm ? "bg-primary/10 border-primary/20" : "bg-red-500/10 border-red-500/20"}`}>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isGoodForm ? "text-primary/60" : "text-red-400/60"}`}>{t.camera.formScore}</span>
                <div className={`text-6xl font-black leading-none mt-1 ${isGoodForm ? "text-primary" : "text-red-400"}`}>{formScore}<span className="text-xl">%</span></div>
            </div>

            <div className={`flex items-start gap-3 rounded-2xl p-4 border ${isGoodForm ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20"}`}>
                <span className={`material-symbols-outlined text-2xl shrink-0 mt-0.5 ${isGoodForm ? "text-primary" : "text-red-400"}`}>{isGoodForm ? "check_circle" : "warning"}</span>
                <div className="min-w-0">
                    <p className={`font-bold text-sm ${isGoodForm ? "text-primary" : "text-red-300"}`}>{feedbackTitle}</p>
                    <p className={`text-xs mt-1 leading-relaxed ${isGoodForm ? "text-white/50" : "text-red-200/70"}`}>{feedbackDetail}</p>
                </div>
            </div>

            {/* ── Injury Risk Assessment Card ── */}
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-xl" style={{ color: riskColor }}>{riskIcon}</span>
                    <div>
                        <p className="font-bold text-sm" style={{ color: riskColor }}>{riskLabel}</p>
                        <p className="text-white/30 text-[10px]">{t.camera.injuryRisk}</p>
                    </div>
                    {riskLevel && (
                        <div className="ml-auto text-right">
                            <span className="text-lg font-black" style={{ color: riskColor }}>{riskLevel.score}</span>
                            <span className="text-white/30 text-[10px] ml-0.5">/100</span>
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
                            <p key={i} className="text-[10px] text-white/40 flex items-start gap-1">
                                <span className="text-white/20 mt-px">•</span>
                                <span>{factor}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                <span className="material-symbols-outlined text-xl text-blue-400">speed</span>
                <p className="text-white font-bold text-sm mt-1">{t.camera.normalSpeed}</p>
                <p className="text-white/30 text-[10px]">{t.camera.repTempo}</p>
            </div>

            <div className="mt-auto pt-5">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold block">{t.camera.repCount}</span>
                        <div className="text-4xl font-black text-white mt-1">
                            <span className="text-blue-400">{currentReps}</span>
                            <span className="text-white/20 text-2xl">/{repGoal}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 mb-6 border border-white/10 overflow-hidden">
                    <div className="bg-blue-400 h-full transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, (currentReps / repGoal) * 100)}%` }}></div>
                </div>

                <Link href="/summary" onClick={endWorkoutData}
                    className="w-full h-14 bg-red-600/90 hover:bg-red-500 active:scale-[0.98] transition-all rounded-xl text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-red-900/20 border border-red-500/40 flex items-center justify-center gap-2 cursor-pointer">
                    <span className="material-symbols-outlined">stop_circle</span>{t.camera.endWorkout}
                </Link>
            </div>
        </aside>
    );
}
