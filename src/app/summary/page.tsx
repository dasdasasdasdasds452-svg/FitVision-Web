"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

interface ErrorRecord {
    url: string;
    title: string;
    detail: string;
    time: string;
    elapsedSeconds?: number;
    elapsedFormatted?: string;
    repNumber?: number;
    riskLevel?: string;
    riskScore?: number;
    riskLabelTh?: string;
    riskColor?: string;
    riskFactors?: string[];
    recommendation?: string;
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
    const { t, language } = useLanguage();
    const router = useRouter();
    const [errors, setErrors] = useState<ErrorRecord[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [aiAdvice, setAiAdvice] = useState<string>("");
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    useEffect(() => {
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
            if (!history.find((h: any) => h.id === currentStats.id)) {
                localStorage.setItem('fitvision_history', JSON.stringify([currentStats, ...history]));
            }
        }

        // Auto-request AI analysis if there are errors
        if (storedErrors.length > 0 && currentStats) {
            fetchAIAdvice(storedErrors, currentStats);
        }
    }, []);

    const fetchAIAdvice = async (errorList: ErrorRecord[], sessionStats: any) => {
        setIsLoadingAI(true);
        try {
            // Build a detailed error summary for the AI
            const errorSummary = errorList.map((err, i) => {
                const timestamp = err.elapsedFormatted || err.time;
                const rep = err.repNumber ? `Rep #${err.repNumber}` : '';
                const risk = err.riskLabelTh || err.riskLevel || '';
                const factors = err.riskFactors?.join(', ') || '';
                return `${i + 1}. [${timestamp}] ${rep} — ${err.title}: ${err.detail} (ความเสี่ยง: ${risk}, ปัจจัย: ${factors})`;
            }).join('\n');

            const prompt = `คุณเป็นโค้ชฟิตเนสผู้เชี่ยวชาญ ผู้ใช้เพิ่งออกกำลังกายท่า ${sessionStats.exercise} เสร็จ

ข้อมูลการออกกำลังกาย:
- ท่า: ${sessionStats.exercise}
- จำนวน Rep: ${sessionStats.completedReps || 0}/${sessionStats.repGoal || 0}
- คะแนนเฉลี่ย: ${Math.round(sessionStats.avgScore || 0)}%
- จำนวนข้อผิดพลาดที่พบ: ${errorList.length} ครั้ง

รายละเอียดข้อผิดพลาดตาม Timeline:
${errorSummary}

กรุณาวิเคราะห์และตอบกลับเป็นภาษา${language === 'th' ? 'ไทย' : 'อังกฤษ'}ในรูปแบบต่อไปนี้:
1. สรุปปัญหาหลักที่พบ (บอกว่าส่วนไหนของร่างกายผิด)
2. สาเหตุที่เป็นไปได้ของแต่ละข้อผิดพลาด
3. วิธีแก้ไขเฉพาะเจาะจงสำหรับแต่ละปัญหา (ให้คำแนะนำที่ปฏิบัติได้จริง)
4. ท่าบริหารเสริมที่ช่วยแก้ปัญหา (ถ้ามี)
5. คำแนะนำเพิ่มเติมเรื่องความปลอดภัย`;

            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: sessionStats.exercise,
                    errors: errorList.map(e => e.title),
                    score: Math.round(sessionStats.avgScore || 0),
                    question: prompt,
                    language: language,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAiAdvice(data.response || data.answer || '');
            }
        } catch (err) {
            console.error('AI advice error:', err);
        } finally {
            setIsLoadingAI(false);
        }
    };

    // Risk color helper
    const getRiskBadge = (level?: string, color?: string) => {
        const c = color || '#f59e0b';
        const l = level || 'unknown';
        return (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: c, borderColor: c + '40', backgroundColor: c + '15' }}>
                {l.toUpperCase()}
            </span>
        );
    };

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

                    {/* ── Error Timeline (NEW) ── */}
                    {errors.length > 0 && (
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-6 animate-stagger-summary">
                            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-400">timeline</span>
                                {language === 'th' ? 'ไทม์ไลน์ข้อผิดพลาด' : 'Error Timeline'}
                            </h3>
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10"></div>
                                <div className="space-y-4">
                                    {errors.map((error, idx) => (
                                        <div key={idx} className="relative pl-10">
                                            {/* Timeline dot */}
                                            <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2" style={{ borderColor: error.riskColor || '#f59e0b', backgroundColor: error.riskColor ? error.riskColor + '40' : '#f59e0b40' }}></div>
                                            
                                            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    {/* Timestamp badge */}
                                                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                                                        ⏱ {error.elapsedFormatted || error.time}
                                                    </span>
                                                    {/* Rep badge */}
                                                    {error.repNumber !== undefined && error.repNumber > 0 && (
                                                        <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                                            Rep #{error.repNumber}
                                                        </span>
                                                    )}
                                                    {/* Risk badge */}
                                                    {getRiskBadge(error.riskLevel, error.riskColor)}
                                                </div>
                                                
                                                <h4 className="text-sm font-bold text-red-400 mb-1">{error.title}</h4>
                                                <p className="text-xs text-slate-400 mb-2">{error.detail}</p>
                                                
                                                {/* Risk factors */}
                                                {error.riskFactors && error.riskFactors.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {error.riskFactors.map((factor, fi) => (
                                                            <span key={fi} className="text-[10px] text-orange-300/70 bg-orange-500/10 px-2 py-0.5 rounded">
                                                                {factor}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

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

                    {/* ── AI Correction Advice (NEW) ── */}
                    {errors.length > 0 && (
                        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6 animate-stagger-summary">
                            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">psychology</span>
                                {language === 'th' ? 'AI วิเคราะห์และแนะนำวิธีแก้ไข' : 'AI Analysis & Correction Advice'}
                            </h3>
                            {isLoadingAI ? (
                                <div className="flex items-center gap-3 py-8 justify-center">
                                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-purple-300">{language === 'th' ? 'AI กำลังวิเคราะห์ท่าทางของคุณ...' : 'AI is analyzing your form...'}</span>
                                </div>
                            ) : aiAdvice ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {aiAdvice}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <button
                                        onClick={() => stats && fetchAIAdvice(errors, stats)}
                                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                                        {language === 'th' ? 'ขอคำแนะนำจาก AI' : 'Get AI Advice'}
                                    </button>
                                </div>
                            )}
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
                                            {/* Timestamp overlay */}
                                            {error.elapsedFormatted && (
                                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded text-xs font-mono font-bold text-blue-400 border border-blue-500/30">
                                                    ⏱ {error.elapsedFormatted}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-5 md:p-6 flex flex-col justify-center gap-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-xl font-bold text-red-400">{error.title}</h4>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs text-slate-500 bg-black/50 px-2 py-1 rounded">{error.time}</span>
                                                    {error.riskLabelTh && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: error.riskColor, backgroundColor: (error.riskColor || '#f59e0b') + '15' }}>
                                                            {error.riskLabelTh}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-red-500/50 pl-3">
                                                {error.detail}
                                            </p>
                                            {/* Risk factors inline */}
                                            {error.riskFactors && error.riskFactors.length > 0 && (
                                                <div className="space-y-1">
                                                    {error.riskFactors.map((f, fi) => (
                                                        <p key={fi} className="text-[11px] text-orange-300/70 flex items-start gap-1">
                                                            <span className="material-symbols-outlined text-xs mt-0.5 text-orange-400/50">warning</span>
                                                            {f}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Recommendation */}
                                            {error.recommendation && (
                                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mt-1">
                                                    <p className="text-[11px] text-blue-300/80 flex items-start gap-1">
                                                        <span className="material-symbols-outlined text-xs mt-0.5 text-blue-400/60">tips_and_updates</span>
                                                        {error.recommendation}
                                                    </p>
                                                </div>
                                            )}
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
