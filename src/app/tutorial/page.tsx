"use client";
import React from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

/** Top-down sketch: lifter in the middle, phone off to the side at 2–3 m. */
function SetupDiagram({ correct, label }: { correct: boolean; label: string }) {
    const stroke = correct ? "#39FF14" : "#FDBA74";
    return (
        <svg viewBox="0 0 320 180" role="img" aria-label={label} className="w-full h-auto">
            <rect x="0" y="0" width="320" height="180" rx="16" fill="rgba(255,255,255,0.03)" />
            {/* lifter, facing right (shoulders as an ellipse, head as a circle) */}
            <ellipse cx="200" cy="90" rx="16" ry="34" fill="none" stroke="#E2E8F0" strokeWidth="2" />
            <circle cx="214" cy="90" r="10" fill="none" stroke="#E2E8F0" strokeWidth="2" />
            <path d="M226 90 l10 0" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            {correct ? (
                <>
                    {/* phone below the lifter = side view */}
                    <rect x="188" y="150" width="24" height="14" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
                    <path d="M200 148 L200 128" stroke={stroke} strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M188 150 L170 124 M212 150 L230 124" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
                    <text x="160" y="146" textAnchor="end" fill={stroke} fontSize="13" fontFamily="inherit">2–3 m · 90°</text>
                </>
            ) : (
                <>
                    {/* phone right in front, too close */}
                    <rect x="246" y="83" width="14" height="24" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
                    <path d="M244 95 L238 95" stroke={stroke} strokeWidth="2" strokeDasharray="3 3" />
                    <text x="214" y="40" fill={stroke} fontSize="13" fontFamily="inherit">&lt; 1 m · 0°</text>
                </>
            )}
        </svg>
    );
}

export default function TutorialPage() {
    const { t } = useLanguage();
    const tt = t.tutorial;

    const steps = [
        { icon: "straighten", ...tt.steps.distance },
        { icon: "360", ...tt.steps.angle },
        { icon: "wb_sunny", ...tt.steps.lighting },
    ];
    const exercises = [
        { key: "squat", name: t.camera.exerciseName.squat, points: tt.capabilities.squat.points },
        { key: "deadlift", name: t.camera.exerciseName.deadlift, points: tt.capabilities.deadlift.points },
        { key: "benchpress", name: t.camera.exerciseName.benchpress, points: tt.capabilities.benchpress.points },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-8 pb-16">
                <header>
                    <h1 className="text-2xl md:text-3xl font-semibold text-white">{tt.page.title}</h1>
                    <p className="text-slate-300 mt-1 max-w-2xl">{tt.page.subtitle}</p>
                </header>

                {/* ── 3 steps ── */}
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {steps.map((s, i) => (
                        <li key={s.title} className="rounded-2xl bg-surface-dark border border-white/10 p-5 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined">{s.icon}</span>
                                </span>
                                <span className="text-sm text-slate-400">{tt.page.step} {i + 1}</span>
                            </div>
                            <h2 className="text-lg font-semibold text-white">{s.title.replace(/^\d+\.\s*/, "")}</h2>
                            <p className="text-slate-300 leading-relaxed">
                                {s.desc} <strong className="text-white font-semibold">{s.descHighlight}</strong> {s.descEnd}
                            </p>
                        </li>
                    ))}
                </ol>

                {/* ── Do / Don't ── */}
                <section aria-labelledby="guide-h">
                    <h2 id="guide-h" className="text-lg font-semibold text-white mb-1">{tt.visualGuide.title}</h2>
                    <p className="text-sm text-slate-400 mb-3">{tt.page.topView}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <figure className="rounded-3xl bg-surface-dark border border-primary/30 p-5 flex flex-col gap-4">
                            <SetupDiagram correct label={tt.page.doTitle} />
                            <figcaption>
                                <p className="font-semibold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">check_circle</span>{tt.page.doTitle}
                                </p>
                                <p className="text-sm text-slate-300 mt-1.5">{tt.visualGuide.correct.desc}</p>
                                <ul className="mt-2 text-sm text-slate-200 space-y-1">
                                    <li>• {tt.visualGuide.correct.point1}</li>
                                    <li>• {tt.visualGuide.correct.point2}</li>
                                </ul>
                            </figcaption>
                        </figure>
                        <figure className="rounded-3xl bg-surface-dark border border-orange-400/30 p-5 flex flex-col gap-4">
                            <SetupDiagram correct={false} label={tt.page.dontTitle} />
                            <figcaption>
                                <p className="font-semibold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-300">cancel</span>{tt.page.dontTitle}
                                </p>
                                <p className="text-sm text-slate-300 mt-1.5">{tt.visualGuide.incorrect.desc}</p>
                                <ul className="mt-2 text-sm text-slate-200 space-y-1">
                                    <li>• {tt.visualGuide.incorrect.point1}</li>
                                    <li>• {tt.visualGuide.incorrect.point2}</li>
                                </ul>
                            </figcaption>
                        </figure>
                    </div>
                </section>

                {/* ── What gets checked ── */}
                <section aria-labelledby="ex-h">
                    <h2 id="ex-h" className="text-lg font-semibold text-white mb-3">{tt.page.exercisesTitle}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {exercises.map((ex) => (
                            <div key={ex.key} className="rounded-2xl bg-surface-dark border border-white/10 p-5">
                                <h3 className="font-semibold text-white mb-2">{ex.name}</h3>
                                <ul className="text-sm text-slate-300 space-y-1.5">
                                    {ex.points.map((p) => (
                                        <li key={p} className="flex gap-2">
                                            <span className="material-symbols-outlined text-base text-primary">check</span>{p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-slate-400 mt-3">{tt.page.methodNote}</p>
                </section>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Link
                        href="/camera"
                        className="h-14 px-8 rounded-2xl bg-primary text-background-dark text-lg font-semibold flex items-center justify-center gap-2 hover:brightness-110"
                    >
                        <span className="material-symbols-outlined">videocam</span>
                        {tt.page.start}
                    </Link>
                    <p className="text-sm text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">lock</span>
                        {tt.cta.privacy}
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
