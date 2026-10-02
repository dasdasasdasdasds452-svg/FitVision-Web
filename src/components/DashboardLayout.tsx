"use client";
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import UserAvatar, { useProfile } from "@/components/UserAvatar";

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();
    return (
        <div role="group" aria-label="Language" className="flex bg-surface-darker rounded-full p-1 border border-white/10 shrink-0">
            {(["th", "en"] as const).map((lang) => (
                <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    aria-pressed={language === lang}
                    className={`min-w-10 h-8 px-2.5 text-xs font-bold rounded-full transition-colors cursor-pointer ${language === lang ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage();
    const pathname = usePathname();
    const profile = useProfile();

    const hasNoSidebar = pathname?.startsWith("/camera") || pathname?.startsWith("/login");

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <div className="layout-container flex h-full grow flex-col md:flex-row">
                {/* Main Content Area */}
                <main className={`flex-1 ${hasNoSidebar ? "" : "md:ml-64"} pb-28 md:pb-0`}>
                    {/* Mobile Header */}
                    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background-dark/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-background-dark shrink-0">
                                <span className="material-symbols-outlined text-lg font-bold">fitness_center</span>
                            </div>
                            <span className="text-white text-lg font-bold tracking-tight">FitVision</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <LanguageToggle />
                            <Link href="/settings" aria-label={t.nav.settings}>
                                <UserAvatar profile={profile} size={36} />
                            </Link>
                        </div>
                    </header>

                    <header className="hidden md:flex items-center justify-end px-10 pt-6 pb-2 gap-4">
                        <LanguageToggle />
                    </header>

                    {children}
                </main>
            </div>
        </div>
    );
}
