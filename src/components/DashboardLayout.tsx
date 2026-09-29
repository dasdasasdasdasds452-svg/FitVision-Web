"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { language, setLanguage, t } = useLanguage();
    const pathname = usePathname();
    const defaultAvatar = 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA27nj0lO-CFiCbHV5WY7JdyYn0KZLxAcFyJfVlyHj0s8t2zkyMdrnJdKOFlpT3OeeTkIaYinssvIiwQVZd-PEonFIwPa0-_FQUoPGOdgmCFFxMPIPpveKaTcSIyqLZWjySB7ZZu58OHONYt9rfPco2VI4-bPPW5TsvxabFyx6CrLU-w9Aur278J-pkfDic-F8A-M_pTy88Hs1oo_SyobbHM0vf6Y9bWuieMdksrqbjtj4dqH1_j_Y_XnEUItFA9x07ONGY8FTeK-H6")';
    const [avatar, setAvatar] = useState(defaultAvatar);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const hasNoSidebar = pathname?.startsWith("/camera") || pathname?.startsWith("/login") || pathname?.startsWith("/tutorial");

    useEffect(() => {
        const updateAvatar = () => {
            const stored = localStorage.getItem('fitvision_avatar');
            if (stored) setAvatar(`url('${stored}')`);
        };

        // Initial load
        updateAvatar();

        // Listen for custom event from Settings page
        window.addEventListener('avatarUpdated', updateAvatar);

        return () => window.removeEventListener('avatarUpdated', updateAvatar);
    }, []);
    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <div className="layout-container flex h-full grow flex-col md:flex-row">
                {/* Main Content Area */}
                <main className={`flex-1 ${hasNoSidebar ? "" : "md:ml-64"} pb-24 md:pb-0`}>
                    {/* Mobile Header */}
                    <header className="md:hidden flex items-center justify-between px-5 py-4 bg-background-dark/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(57,255,20,0.3)] shrink-0">
                                <span className="material-symbols-outlined text-lg font-bold">fitness_center</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-white text-lg font-black tracking-tight">FitVision</h2>
                                <span className="text-[8px] font-mono font-bold text-primary px-1 py-0.2 rounded bg-primary/10 border border-primary/20">AI</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                                className="px-2 py-1 text-[10px] font-bold rounded bg-surface-darker border border-white/10 text-slate-300 transition-colors"
                            >
                                {language.toUpperCase()}
                            </button>
                            <Link href="/settings" className="relative cursor-pointer transition-all hover:scale-105 active:scale-95">
                                <div
                                    className="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-primary hover:ring-white transition-colors"
                                    style={{ backgroundImage: avatar }}
                                ></div>
                            </Link>
                        </div>
                    </header>

                    <header className="hidden md:flex items-center justify-end px-10 pt-8 pb-2 gap-4">
                        <div className="flex bg-surface-darker rounded-full p-1 border border-white/10 shrink-0">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'en' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage('th')}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'th' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                TH
                            </button>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className="flex flex-col items-center justify-center size-10 rounded-full bg-surface-dark border border-white/10 hover:border-primary/50 text-white transition-all relative group shadow-sm shrink-0 cursor-pointer active:scale-95"
                            >
                                <span className="material-symbols-outlined group-hover:text-primary transition-colors">notifications</span>
                                <span className="absolute top-2 right-2.5 size-2 bg-primary rounded-full shadow-[0_0_8px_rgba(57,255,20,0.8)]"></span>
                            </button>

                            {isNotificationOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-3 w-72 bg-surface-darker border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                                            <h3 className="font-bold text-white text-sm">{t.notifications.title}</h3>
                                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{t.notifications.newCount}</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 border-l-2 border-primary">
                                                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-primary text-sm">emoji_events</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-sm text-slate-200">{t.notifications.personalRecord}</p>
                                                    <span className="text-xs text-slate-500">{t.notifications.hoursAgo}</span>
                                                </div>
                                            </div>
                                            <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
                                                <div className="size-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-blue-400 text-sm">update</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-sm text-slate-400">{t.notifications.systemUpdate}</p>
                                                    <span className="text-xs text-slate-500">{t.notifications.yesterday}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-8 w-[1px] bg-white/10"></div>
                        <Link href="/settings" className="relative cursor-pointer transition-all hover:scale-105 active:scale-95">
                            <div
                                className="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-white/10 hover:ring-primary transition-colors"
                                style={{ backgroundImage: avatar }}
                            ></div>
                        </Link>
                    </header>

                    {children}
                </main>
            </div>
        </div>
    );
}
