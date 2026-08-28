"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

export default function TutorialPage() {
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        // Staggered fade in animation
        
    }, []);

    const handleLaunchCamera = () => {
        router.push("/camera");
    };

    return (
        <DashboardLayout>
            <div className="relative overflow-x-hidden font-display min-h-screen">
                {/* Background Glow Effects */}
                <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
                <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

                <main className="max-w-6xl mx-auto px-6 py-12 w-full">
                    {/* Hero Section */}
                    <div className="mb-16 text-center md:text-left animate-stagger-tutorial">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            {t.tutorial.hero.tag}
                        </div>
                        <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight mb-4">
                            {t.tutorial.hero.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">{t.tutorial.hero.titleHighlight}</span>
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl max-w-2xl font-light">
                            {t.tutorial.hero.subtitle} <span className="text-white font-medium">{t.tutorial.hero.subtitleHighlight}</span> {t.tutorial.hero.subtitleEnd}
                        </p>
                    </div>

                    {/* Step-by-Step Horizontal Timeline */}
                    <div className="relative mb-20 animate-stagger-tutorial">
                        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                            {/* Step 1 */}
                            <div className="group">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transition-all hover:border-primary/50 hover:bg-black/60 h-full">
                                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-black transition-all">
                                        <span className="material-symbols-outlined text-3xl">straighten</span>
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">{t.tutorial.steps.distance.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{t.tutorial.steps.distance.desc} <span className="text-primary font-semibold">{t.tutorial.steps.distance.descHighlight}</span> {t.tutorial.steps.distance.descEnd}</p>
                                </div>
                            </div>
                            {/* Step 2 */}
                            <div className="group">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transition-all hover:border-primary/50 hover:bg-black/60 h-full">
                                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-black transition-all">
                                        <span className="material-symbols-outlined text-3xl">view_in_ar</span>
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">{t.tutorial.steps.angle.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{t.tutorial.steps.angle.desc} <span className="text-primary font-semibold">{t.tutorial.steps.angle.descHighlight}</span> {t.tutorial.steps.angle.descEnd}</p>
                                </div>
                            </div>
                            {/* Step 3 */}
                            <div className="group">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transition-all hover:border-primary/50 hover:bg-black/60 h-full">
                                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-black transition-all">
                                        <span className="material-symbols-outlined text-3xl">wb_sunny</span>
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">{t.tutorial.steps.lighting.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{t.tutorial.steps.lighting.desc} <span className="text-primary font-semibold">{t.tutorial.steps.lighting.descHighlight}</span> {t.tutorial.steps.lighting.descEnd}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What FitVision AI Can Do */}
                    <div className="mb-20 animate-stagger-tutorial">
                        <h2 className="text-white text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">fitness_center</span>
                            {t.tutorial.capabilities.title}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Squat */}
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">airline_seat_legroom_extra</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t.tutorial.capabilities.squat.title}</h3>
                                </div>
                                <p className="text-sm text-slate-400 mb-4 border-b border-white/10 pb-4">
                                    {t.tutorial.capabilities.squat.desc} <span className="text-primary font-bold">{t.tutorial.capabilities.squat.descHighlight}</span>.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    {t.tutorial.capabilities.squat.points.map((point, i) => (
                                        <li key={`sq-${i}`} className="flex gap-2"><span className="text-red-400">•</span> {point}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Deadlift */}
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">monitor_weight</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t.tutorial.capabilities.deadlift.title}</h3>
                                </div>
                                <p className="text-sm text-slate-400 mb-4 border-b border-white/10 pb-4">
                                    {t.tutorial.capabilities.deadlift.desc} <span className="text-primary font-bold">{t.tutorial.capabilities.deadlift.descHighlight}</span>.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    {t.tutorial.capabilities.deadlift.points.map((point, i) => (
                                        <li key={`dl-${i}`} className="flex gap-2"><span className="text-primary">•</span> {point}</li>
                                    ))}
                                    <li className="flex gap-2 text-slate-500 italic mt-2">{t.tutorial.capabilities.deadlift.note}</li>
                                </ul>
                            </div>

                            {/* Bench Press */}
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">airline_seat_flat</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t.tutorial.capabilities.benchpress.title}</h3>
                                </div>
                                <p className="text-sm text-slate-400 mb-4 border-b border-white/10 pb-4">
                                    {t.tutorial.capabilities.benchpress.desc} <span className="text-primary font-bold">{t.tutorial.capabilities.benchpress.descHighlight}</span>.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    {t.tutorial.capabilities.benchpress.points.map((point, i) => (
                                        <li key={`bp-${i}`} className="flex gap-2"><span className="text-primary">•</span> {point}</li>
                                    ))}
                                    <li className="flex gap-2 text-slate-500 italic mt-2">{t.tutorial.capabilities.benchpress.note}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Visual Comparison Grid */}
                    <div className="mb-20 animate-stagger-tutorial">
                        <h2 className="text-white text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">visibility</span>
                            {t.tutorial.visualGuide.title}
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* DO Card */}
                            <div className="relative bg-black/40 backdrop-blur-md border border-primary/30 rounded-3xl overflow-hidden group">
                                <div className="absolute top-4 right-4 z-20 bg-primary text-black px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 uppercase">
                                    <span className="material-symbols-outlined text-sm font-bold">check_circle</span> {t.tutorial.visualGuide.correct.tag}
                                </div>
                                <div className="aspect-video w-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10"></div>
                                    <div className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                        data-alt="Correct fitness camera setup showing side profile of person exercising"
                                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDFidIs8pJ9BpnZsdXVlh_5-SlWpmYYgZ40z2ZFE9pEdH3D6PLvTGIytKGrHLJYnnLcBZ5zdpVLaEhBCk4zSLYB0rILfSsoXpnzllQrK-adWOkgR-3yb8Uh-YM9gwl6WLR9V2cd3DyfggKnT0QwqkNgzk9ibcQ0AY8ZLWktnPjuc0yBoLpyG5AxKn0iJlfx3f3lJ5IJNlRzXarPKWz2CSzJk0rDreTrekPlbm91tQwRRdn2Dp-bQM0OwW9NK68C6Trx5orWNXAoqOs')" }}>
                                    </div>
                                    {/* AI Overlay Mockup */}
                                    <div className="absolute inset-0 z-10 p-6 flex items-center justify-center">
                                        <div className="border-2 border-primary/40 rounded-lg w-3/4 h-3/4 flex items-center justify-center relative">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                                            <span className="material-symbols-outlined text-primary text-6xl opacity-40">person_pin</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h4 className="text-white text-xl font-bold mb-2">{t.tutorial.visualGuide.correct.title}</h4>
                                    <p className="text-slate-400 mb-4">{t.tutorial.visualGuide.correct.desc}</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-primary text-sm font-medium">
                                            <span className="material-symbols-outlined text-lg">check</span> {t.tutorial.visualGuide.correct.point1}
                                        </li>
                                        <li className="flex items-center gap-2 text-primary text-sm font-medium">
                                            <span className="material-symbols-outlined text-lg">check</span> {t.tutorial.visualGuide.correct.point2}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            {/* DON'T Card */}
                            <div className="relative bg-black/40 backdrop-blur-md border border-red-500/30 rounded-3xl overflow-hidden group">
                                <div className="absolute top-4 right-4 z-20 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 uppercase shadow-lg shadow-red-500/20">
                                    <span className="material-symbols-outlined text-sm font-bold">cancel</span> {t.tutorial.visualGuide.incorrect.tag}
                                </div>
                                <div className="aspect-video w-full relative overflow-hidden grayscale contrast-125">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10"></div>
                                    <div className="w-full h-full bg-cover bg-center"
                                        data-alt="Incorrect camera setup showing obscured person front facing too close"
                                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuABq0St6WI-0QA2VcTqoowVH2dHbLFMZJd0JVnXXRGNGqVfOEDWT-BXFBShbU7SWNp88Z5NBxj352ShgTzdAUMuKDBZD1dkqkc6g7KfK7Nt8jQ4rmBIRTF-L6iQCAf45YMqZ4mJLLpfZB2AUkTKAf4VhW1JJ6NOJ332xO1lgMsT6ZuAd3YUjQ_WiY9TpV8b4f5MPrmk2HLCKBQueJcxe1Ufd4eRP1qWcF1vhFuLVAMZqQ7t5RLb_KEvyIpmQTyHKvD2Crl_GlSpBAg')" }}>
                                    </div>
                                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                                        <div className="text-red-500/80">
                                            <span className="material-symbols-outlined text-[120px]">block</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h4 className="text-white text-xl font-bold mb-2">{t.tutorial.visualGuide.incorrect.title}</h4>
                                    <p className="text-slate-400 mb-4">{t.tutorial.visualGuide.incorrect.desc}</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-red-400 text-sm font-medium">
                                            <span className="material-symbols-outlined text-lg">close</span> {t.tutorial.visualGuide.incorrect.point1}
                                        </li>
                                        <li className="flex items-center gap-2 text-red-400 text-sm font-medium">
                                            <span className="material-symbols-outlined text-lg">close</span> {t.tutorial.visualGuide.incorrect.point2}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="flex flex-col items-center justify-center py-12 animate-stagger-tutorial">
                        <button
                            onClick={handleLaunchCamera}
                            className="relative group bg-primary hover:bg-emerald-400 text-black px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(60,249,26,0.6)]"
                        >
                            <span className="material-symbols-outlined text-3xl">videocam</span>
                            {t.tutorial.cta.button}
                            {/* Pulsing Glow Effect */}
                            <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/30 -z-10 group-hover:opacity-0"></span>
                        </button>
                        <p className="mt-6 text-slate-500 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">lock</span>
                            {t.tutorial.cta.privacy}
                        </p>
                    </div>
                </main>

            </div>
        </DashboardLayout>
    );
}
