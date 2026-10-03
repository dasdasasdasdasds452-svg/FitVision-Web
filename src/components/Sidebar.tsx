"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import UserAvatar, { useProfile } from "@/components/UserAvatar";

interface NavItem {
    href: string;
    icon: string;
    label: string;
    /** Also active on these path prefixes (e.g. history detail + summary belong to History). */
    match: string[];
}

export default function Sidebar() {
    const pathname = usePathname() || "/";
    const { t } = useLanguage();
    const { logout } = useAuth();
    const profile = useProfile();

    if (pathname.startsWith("/camera") || pathname.startsWith("/login")) {
        return null;
    }

    const items: NavItem[] = [
        { href: "/", icon: "home", label: t.nav.home, match: [] },
        { href: "/history", icon: "insights", label: t.nav.history, match: ["/history", "/summary"] },
        { href: "/friends", icon: "group", label: t.nav.friends, match: ["/friends"] },
        { href: "/chat", icon: "smart_toy", label: t.nav.aiCoach, match: ["/chat"] },
        { href: "/settings", icon: "settings", label: t.nav.settings, match: ["/settings"] },
    ];
    // Mobile bar has room for four tabs around the camera button; friends is reached from Home there.
    const mobileItems = items.filter((i) => i.href !== "/friends");
    const isActive = (item: NavItem) =>
        item.href === "/" ? pathname === "/" : item.match.some((m) => pathname.startsWith(m));

    return (
        <>
            {/* Desktop Sidebar */}
            <nav aria-label={t.nav.home} className="hidden md:flex flex-col w-64 border-r border-white/10 bg-surface-darker p-5 justify-between h-screen fixed left-0 top-0 z-50">
                <div className="flex flex-col gap-7">
                    <Link href="/" className="flex items-center gap-3 px-2">
                        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-background-dark shrink-0">
                            <span className="material-symbols-outlined text-xl font-bold">fitness_center</span>
                        </div>
                        <span className="text-white text-xl font-bold tracking-tight">FitVision</span>
                    </Link>

                    <Link
                        href="/camera"
                        className="flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-background-dark font-bold hover:brightness-110 transition"
                    >
                        <span className="material-symbols-outlined">videocam</span>
                        {t.home.startTitle}
                    </Link>

                    <ul className="flex flex-col gap-1">
                        {items.map((item) => {
                            const active = isActive(item);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex items-center gap-3 h-11 px-3 rounded-xl transition-colors ${active
                                            ? "bg-white/10 text-white"
                                            : "text-slate-300 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined ${active ? "text-primary filled" : ""}`}>{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-white/10">
                    <UserAvatar profile={profile} size={36} />
                    <Link href="/settings" className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-white truncate" title={profile.name}>{profile.name || t.settings.account.guest}</span>
                        <span className="block text-xs text-slate-400">{t.nav.settings}</span>
                    </Link>
                    <button
                        type="button"
                        onClick={logout}
                        aria-label={t.nav.logout}
                        title={t.nav.logout}
                        className="size-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Navigation — 5 targets, start in the middle, no logout here */}
            <nav aria-label={t.nav.home} className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-dark/95 backdrop-blur-lg border-t border-white/10 grid grid-cols-5 items-center px-2 pt-2 z-50 pb-safe">
                {[mobileItems[0], mobileItems[1]].map((item) => (
                    <MobileTab key={item.href} item={item} active={isActive(item)} />
                ))}
                <Link
                    href="/camera"
                    aria-label={t.home.startTitle}
                    className="flex flex-col items-center gap-1 text-white"
                >
                    <span className="flex items-center justify-center w-12 h-9 rounded-xl bg-primary text-background-dark">
                        <span className="material-symbols-outlined text-2xl">videocam</span>
                    </span>
                    <span className="text-xs font-medium">{t.home.startTitle}</span>
                </Link>
                {[mobileItems[2], mobileItems[3]].map((item) => (
                    <MobileTab key={item.href} item={item} active={isActive(item)} />
                ))}
            </nav>
        </>
    );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 min-h-11 justify-center transition-colors ${active ? "text-primary" : "text-slate-300 hover:text-white"}`}
        >
            <span className={`material-symbols-outlined ${active ? "filled" : ""}`}>{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
        </Link>
    );
}
