"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { logout } = useAuth();

    const defaultAvatar = 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA27nj0lO-CFiCbHV5WY7JdyYn0KZLxAcFyJfVlyHj0s8t2zkyMdrnJdKOFlpT3OeeTkIaYinssvIiwQVZd-PEonFIwPa0-_FQUoPGOdgmCFFxMPIPpveKaTcSIyqLZWjySB7ZZu58OHONYt9rfPco2VI4-bPPW5TsvxabFyx6CrLU-w9Aur278J-pkfDic-F8A-M_pTy88Hs1oo_SyobbHM0vf6Y9bWuieMdksrqbjtj4dqH1_j_Y_XnEUItFA9x07ONGY8FTeK-H6")';
    const [avatar, setAvatar] = useState(defaultAvatar);
    const [displayName, setDisplayName] = useState("Alex Morgan");

    useEffect(() => {
        const updateProfile = () => {
            const storedAvatar = localStorage.getItem('fitvision_avatar');
            if (storedAvatar) setAvatar(`url('${storedAvatar}')`);

            const storedName = localStorage.getItem('fitvision_display_name');
            if (storedName) setDisplayName(storedName);
        };

        // Initial load
        updateProfile();

        // Listen for custom events from Settings page
        window.addEventListener('profileUpdated', updateProfile);
        window.addEventListener('avatarUpdated', updateProfile);
        return () => {
            window.removeEventListener('profileUpdated', updateProfile);
            window.removeEventListener('avatarUpdated', updateProfile);
        };
    }, []);

    if (pathname?.startsWith("/camera") || pathname?.startsWith("/login") || pathname?.startsWith("/tutorial")) {
        return null;
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-64 border-r border-white/10 bg-surface-darker p-6 justify-between h-screen fixed left-0 top-0 z-50">
                <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(57,255,20,0.3)] shrink-0">
                            <span className="material-symbols-outlined text-xl font-bold">fitness_center</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-white text-xl font-black tracking-tight">FitVision</h2>
                            <span className="text-[9px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === "/"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/"
                        >
                            <span className={`material-symbols-outlined ${pathname === "/" ? "filled" : ""}`}>home</span>
                            <span className="font-medium">{t.nav.home}</span>
                        </Link>
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === "/history"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/history"
                        >
                            <span className={`material-symbols-outlined ${pathname === "/history" ? "filled" : ""}`}>history</span>
                            <span className="font-medium">{t.nav.history}</span>
                        </Link>
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname?.startsWith("/camera") ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/camera"
                        >
                            <span className="material-symbols-outlined">videocam</span>
                            <span className="font-medium">{t.nav.camera}</span>
                        </Link>
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === "/summary"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/summary"
                        >
                            <span className={`material-symbols-outlined ${pathname === "/summary" ? "filled" : ""}`}>analytics</span>
                            <span className="font-medium">{t.nav.stats}</span>
                        </Link>
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === "/chat"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/chat"
                        >
                            <span className={`material-symbols-outlined ${pathname === "/chat" ? "filled" : ""}`}>smart_toy</span>
                            <span className="font-medium">{t.nav.aiCoach}</span>
                        </Link>
                        <Link
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === "/settings"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            href="/settings"
                        >
                            <span className={`material-symbols-outlined ${pathname === "/settings" ? "filled" : ""}`}>settings</span>
                            <span className="font-medium">{t.nav.settings}</span>
                        </Link>
                        <button
                            type="button"
                            onClick={logout}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-left mt-4 cursor-pointer active:scale-95 w-full"
                        >
                            <span className="material-symbols-outlined">logout</span>
                            <span className="font-medium">{t.nav.logout}</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-surface-dark border border-white/5">
                    <div
                        className="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-primary/50"
                        style={{
                            backgroundImage: avatar,
                        }}
                    ></div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-sm font-bold text-white leading-tight truncate" title={displayName}>{displayName}</span>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation (Fixed) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-dark/95 backdrop-blur-lg border-t border-white/10 flex justify-between items-center px-6 py-3 z-50 pb-safe">
                <Link
                    href="/"
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname === "/" ? "text-primary" : "text-slate-400 hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-[10px] font-medium">{t.nav.home}</span>
                </Link>
                <Link
                    href="/history"
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname?.startsWith("/history") ? "text-primary" : "text-slate-400 hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined">history</span>
                    <span className="text-[10px] font-medium">{t.nav.history}</span>
                </Link>
                {/* Center Floating Action Button Style */}
                <div className="relative -top-6">
                    <Link
                        className="flex items-center justify-center size-14 rounded-full bg-primary shadow-neon text-background-dark transform transition-transform active:scale-95"
                        href="/camera"
                    >
                        <span className="material-symbols-outlined text-3xl">videocam</span>
                    </Link>
                </div>
                <Link
                    href="/summary"
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname?.startsWith("/summary") ? "text-primary" : "text-slate-400 hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined">analytics</span>
                    <span className="text-[10px] font-medium">{t.nav.stats}</span>
                </Link>
                <Link
                    href="/chat"
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname?.startsWith("/chat") ? "text-primary" : "text-slate-400 hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined">smart_toy</span>
                    <span className="text-[10px] font-medium">{t.nav.aiCoach}</span>
                </Link>
                <Link
                    href="/settings"
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname?.startsWith("/settings") ? "text-primary" : "text-slate-400 hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-[10px] font-medium">{t.nav.settings}</span>
                </Link>
                <button
                    type="button"
                    onClick={logout}
                    className="flex flex-col items-center gap-1 transition-all text-slate-400 hover:text-red-400 cursor-pointer active:scale-95"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-[10px] font-medium">{t.nav.logout}</span>
                </button>
            </nav>
        </>
    );
}
