"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const [exercise, setExercise] = useState<"Bench Press" | "Squat" | "Deadlift">("Bench Press");
  const [repGoal, setRepGoal] = useState<number>(12); // Default to 12 reps
  const [history, setHistory] = useState<any[]>([]);

  // Refs for animated number and bar
  const accuracyRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fitvision_history') || '[]');
    setHistory(stored);

    // Staggered Entrance Animations with Anime.js
    

    // Athlete Text Animation removed as per user request

    // Animated Number Counter for Accuracy
    const finalAccuracy = stored.length > 0 ? Math.round(stored.reduce((acc: any, curr: any) => acc + curr.avgScore, 0) / stored.length) : 0;
    const counter = { accuracy: 0 };

    

  }, []);

  return (
    <>
      <DashboardLayout>
        <div className="px-5 md:px-10 max-w-7xl mx-auto">
          {/* Premium Page Header */}
          <div className="mb-10 mt-2 flex flex-col gap-2 animate-fade-up text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 flex items-center gap-3">
              {t.dashboard.greeting}
              <span className="text-primary drop-shadow-[0_0_12px_rgba(57,255,20,0.4)] whitespace-nowrap">
                {t.dashboard.athlete}
              </span>
              <span className="material-symbols-outlined text-primary text-3xl md:text-5xl animate-[wave_2s_ease-in-out_infinite] origin-bottom-right">waving_hand</span>
            </h1>
            <p className="text-slate-400 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-primary/80 text-sm">electric_bolt</span>
              {t.dashboard.subtitle}
            </p>
          </div>

          {/* Exercise Selection Overlay Config */}
          <div className="mb-8 flex gap-2 p-1.5 rounded-2xl bg-surface-dark/60 backdrop-blur-md w-fit border border-white/10 overflow-x-auto max-w-full shadow-lg animate-fade-up">
            <button
              onClick={() => setExercise("Bench Press")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${exercise === "Bench Press" ? "bg-primary text-black shadow-[0_0_15px_rgba(57,255,20,0.4)] scale-105" : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
            >
              {t.dashboard.exerciseSelection.benchPress}
            </button>
            <button
              onClick={() => setExercise("Squat")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${exercise === "Squat" ? "bg-primary text-black shadow-[0_0_15px_rgba(57,255,20,0.4)] scale-105" : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
            >
              {t.dashboard.exerciseSelection.squat}
            </button>
            <button
              onClick={() => setExercise("Deadlift")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${exercise === "Deadlift" ? "bg-primary text-black shadow-[0_0_15px_rgba(57,255,20,0.4)] scale-105" : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
            >
              {t.dashboard.exerciseSelection.deadlift}
            </button>
          </div>

          {/* Main Action Card */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-surface-dark border border-primary/30 shadow-neon group transition-all mb-8 animate-fade-up">
            {/* Background Image with Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-500"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWzqhMgfWHzfU1BEUX-bmaWXHFBmGVPWj0en9b9hNvpcamGQLiTugenZZiYYnCenK0H0X-AN6c9hNh5bILpRn1SlBsh0jQhnPpfexFP2Vk0VlAqPsoJLo4_jG0aSy5XYhGKhKjaK0T8MmPH1q-kNDBHiblnv_mER0QuOn7CR3F83yiZzAyVodoKdZQZi0ho5E8bYObGEODIHHYccobvxYoRvefWeOQeDA2ZJj0ZmB5yQgPn-1wt-cORYKwycDN95RxWM_ADzx7XFpT')",
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/80 to-transparent"></div>

            <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/30">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  {t.dashboard.actionCard.badge} ({exercise} {t.dashboard.actionCard.selected})
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  {t.dashboard.actionCard.title}
                </h2>
                <div className="flex flex-col gap-4 mb-6">
                  <p className="text-slate-300 md:text-lg">
                    {t.dashboard.actionCard.description}
                  </p>
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl w-max border border-white/10">
                    <span className="material-symbols-outlined text-primary">fitness_center</span>
                    <span className="text-white/80 text-sm font-medium">{t.dashboard.actionCard.repGoalLabel}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={repGoal}
                      onChange={(e) => setRepGoal(Number(e.target.value) || 1)}
                      className="bg-white/10 border-none rounded-lg text-white font-bold w-16 px-2 py-1 text-center focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/camera?model=${exercise.toLowerCase().replace(" ", "")}&reps=${repGoal}`}
                    className="bg-primary hover:bg-primary/90 text-background-dark font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined">videocam</span>
                    {t.dashboard.actionCard.launchCamera}
                  </Link>
                  <Link href="/tutorial" className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl backdrop-blur-sm transition-colors border border-white/10 flex items-center justify-center">
                    {t.dashboard.actionCard.viewTutorial}
                  </Link>
                </div>
              </div>

              {/* Visual Graphic for Desktop */}
              <div className="hidden md:flex relative size-32 items-center justify-center shrink-0">
                <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <span className="material-symbols-outlined text-6xl text-primary drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]">
                  analytics
                </span>
              </div>
            </div>
          </div>

          {/* Stats & Recent Scans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Weekly Stats */}
            <div className="lg:col-span-1 flex flex-col gap-6 animate-fade-up">
              <div className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{t.dashboard.stats.formAccuracy}</h3>
                  <span className="text-primary text-sm font-mono bg-primary/10 px-2 py-1 rounded">+2.4%</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-bold text-white">
                    {history.length > 0 ? Math.round(history.reduce((sum, s) => sum + (s.avgScore || 0), 0) / history.length) : 0}%
                  </span>
                  <span className="text-slate-400 mb-1">{t.dashboard.stats.avgScore}</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    ref={progressBarRef}
                    className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(57,255,20,0.5)]"
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-3">{t.dashboard.stats.basedOn.replace('{count}', history.length.toString())}</p>
              </div>

              <div className="bg-gradient-to-br from-surface-dark to-surface-darker border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-2">{t.dashboard.stats.aiTip}</h3>
                  <p className="text-slate-300 text-sm mb-4">
                    {t.dashboard.stats.aiTipDesc}
                  </p>
                  <Link href="/history" className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                    {t.dashboard.stats.seeDetails} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white/5 rotate-[-15deg]">
                  lightbulb
                </span>
              </div>
            </div>

            {/* Right Column: Recent Scans List */}
            <div className="lg:col-span-2 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{t.dashboard.stats.recentScans}</h3>
                <Link href="/history" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t.dashboard.stats.viewAll}
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {history.length === 0 ? (
                  <div className="text-slate-400 p-4 border border-white/5 rounded-xl text-center">{t.dashboard.stats.noSessions}</div>
                ) : history.slice(0, 3).map((session, i) => (
                  <button onClick={() => { sessionStorage.setItem('fitvision_history_detail_data', JSON.stringify(session)); window.location.href = '/history/detail'; }} key={session.id || i} className="group flex items-center justify-between p-4 bg-surface-dark hover:bg-white/5 border border-white/5 hover:border-primary/30 rounded-xl transition-all cursor-pointer w-full text-left">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-surface-darker flex items-center justify-center border border-white/10 group-hover:border-primary/50 text-white group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">
                          {session.exercise === 'squat' ? 'accessibility_new' : session.exercise === 'deadlift' ? 'fitness_center' : 'sports_gymnastics'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-primary transition-colors capitalize">{session.exercise}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </span>
                          <span className="size-1 rounded-full bg-slate-600"></span>
                          {session.errorCount === 0 ? (
                            <span className="text-xs text-primary">{t.dashboard.stats.flawlessSet}</span>
                          ) : (
                            <span className="text-xs text-orange-400">{session.errorCount} {t.dashboard.stats.mistakesDetected}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-mono text-lg font-bold ${session.avgScore > 90 ? 'text-primary' : 'text-white'}`}>{session.avgScore}%</span>
                      <span className="text-xs text-slate-500">{t.dashboard.stats.accuracy}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
