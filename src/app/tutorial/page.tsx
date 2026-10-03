"use client";
import React from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

const FIGURE = "#E2E8F0";

/**
 * Two views side by side:
 *  left  – what the phone screen should show (whole body, side-on) or the mistake (cropped, front-on)
 *  right – the room seen from above: where to put the phone relative to the lifter
 */
function SetupDiagram({ correct, label, screenLabel, mapLabel }: { correct: boolean; label: string; screenLabel: string; mapLabel: string }) {
    const accent = correct ? "#39FF14" : "#FDBA74";
    const clipId = correct ? "screen-ok" : "screen-bad";
    return (
        <svg viewBox="0 0 340 244" role="img" aria-label={label} className="w-full h-auto">
            <defs>
                <clipPath id={clipId}>
                    <rect x="30" y="26" width="108" height="178" rx="10" />
                </clipPath>
                <marker id={`${clipId}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10 z" fill={FIGURE} />
                </marker>
            </defs>

            {/* ── Phone: what the camera sees ── */}
            <rect x="24" y="14" width="120" height="202" rx="16" fill="#0b0b0b" stroke="#475569" strokeWidth="2" />
            <rect x="30" y="26" width="108" height="178" rx="10" fill="#161a16" />
            <g clipPath={`url(#${clipId})`} stroke={FIGURE} strokeLinecap="round" strokeLinejoin="round" fill="none">
                {correct ? (
                    <>
                        {/* side profile, facing left, bar on the back: whole body in frame */}
                        <circle cx="91" cy="76" r="14" stroke={accent} strokeWidth="3" />
                        <path d="M90 120 L87 152 L91 183" strokeWidth="9" opacity="0.4" />
                        <path d="M88 74 L91 116" strokeWidth="13" />
                        <path d="M91 120 L84 152 L88 183" strokeWidth="9" />
                        <path d="M88 184 L74 186" strokeWidth="6" />
                        <path d="M86 78 L78 94 L92 82" strokeWidth="6" />
                        <circle cx="80" cy="57" r="10" fill={FIGURE} stroke="none" />
                    </>
                ) : (
                    <>
                        {/* front-on and too close: head and feet fall outside the frame */}
                        <circle cx="84" cy="16" r="18" fill={FIGURE} stroke="none" />
                        <path d="M26 46 L142 46" stroke={accent} strokeWidth="5" />
                        <path d="M54 56 L114 56" strokeWidth="10" />
                        <path d="M54 56 L44 46 M114 56 L124 46" strokeWidth="8" />
                        <path d="M84 50 L84 128" strokeWidth="18" />
                        <path d="M72 130 L62 182 L60 240 M96 130 L106 182 L108 240" strokeWidth="13" />
                    </>
                )}
            </g>
            {correct ? (
                <g stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round">
                    {/* head-to-toe brackets */}
                    <path d="M50 50 V40 H60 M118 50 V40 H108" />
                    <path d="M50 182 V192 H60 M118 182 V192 H108" />
                </g>
            ) : (
                <g stroke={accent} strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round">
                    {/* cut-off edges */}
                    <path d="M32 28 H136" />
                    <path d="M32 202 H136" />
                </g>
            )}
            <text x="84" y="236" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="inherit">{screenLabel}</text>

            {/* ── Room seen from above ── */}
            <rect x="164" y="14" width="160" height="202" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
            {/* lifter from above: shoulders + head, arrow = the way they face */}
            <g stroke={FIGURE} strokeWidth="2.5" fill="none">
                <ellipse cx="250" cy={correct ? 104 : 132} rx="24" ry="9" />
                <circle cx="250" cy={correct ? 104 : 132} r="8" fill="#161a16" />
                <path d={correct ? "M250 92 V72" : "M250 120 V106"} markerEnd={`url(#${clipId}-arrow)`} />
            </g>
            {correct ? (
                <>
                    {/* phone to the side, 90° to the way the lifter faces */}
                    <path d="M196 104 L300 66 L300 142 Z" fill={accent} opacity="0.12" />
                    <rect x="178" y="95" width="18" height="18" rx="4" fill="#0b0b0b" stroke={accent} strokeWidth="2.5" />
                    <circle cx="190" cy="104" r="3" fill={accent} />
                    <path d="M200 104 H226" stroke={accent} strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="238" y="80" textAnchor="end" fill={accent} fontSize="13" fontWeight="600" fontFamily="inherit">90°</text>
                    <g stroke={accent} strokeWidth="1.5">
                        <path d="M187 160 H250" />
                        <path d="M187 154 V166 M250 154 V166" />
                    </g>
                    <text x="218" y="182" textAnchor="middle" fill={accent} fontSize="14" fontWeight="600" fontFamily="inherit">2–3 m</text>
                </>
            ) : (
                <>
                    {/* phone straight in front and close */}
                    <path d="M250 62 L214 150 L286 150 Z" fill={accent} opacity="0.12" />
                    <rect x="241" y="44" width="18" height="18" rx="4" fill="#0b0b0b" stroke={accent} strokeWidth="2.5" />
                    <circle cx="250" cy="56" r="3" fill={accent} />
                    <g stroke={accent} strokeWidth="1.5">
                        <path d="M298 62 V122" />
                        <path d="M292 62 H304 M292 122 H304" />
                    </g>
                    <text x="296" y="174" textAnchor="middle" fill={accent} fontSize="14" fontWeight="600" fontFamily="inherit">&lt; 1 m</text>
                    <text x="296" y="192" textAnchor="middle" fill={accent} fontSize="13" fontWeight="600" fontFamily="inherit">0°</text>
                </>
            )}
            <text x="244" y="236" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="inherit">{mapLabel}</text>
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
                    <h2 id="guide-h" className="text-lg font-semibold text-white mb-3">{tt.visualGuide.title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <figure className="rounded-3xl bg-surface-dark border border-primary/30 p-5 flex flex-col gap-4">
                            <SetupDiagram correct label={tt.page.doTitle} screenLabel={tt.page.cameraSees} mapLabel={tt.page.topView} />
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
                            <SetupDiagram correct={false} label={tt.page.dontTitle} screenLabel={tt.page.cameraSees} mapLabel={tt.page.topView} />
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
