"use client";

import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import UserAvatar, { useProfile } from "@/components/UserAvatar";
import { getUserItem, setUserItem } from "@/lib/userStorage";
import { displayAccount } from "@/lib/phoneAuth";

/** Shrink an uploaded photo to a small JPEG so it fits in localStorage (≈5 MB limit). */
function resizeImage(file: File, size = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, size / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no canvas")); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
        img.src = url;
    });
}

export default function SettingsPage() {
    const { t } = useLanguage();
    const { user, logout } = useAuth();
    const profile = useProfile();
    const [imageError, setImageError] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [age, setAge] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");

    const [voiceFeedback, setVoiceFeedback] = useState(true);
    const [autoSave, setAutoSave] = useState(true);
    const [countdown, setCountdown] = useState(true);
    const [ghostRep, setGhostRep] = useState(true);

    // Check if saving is showing feedback
    const [showSavedFeedback, setShowSavedFeedback] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedAvatar = getUserItem("fitvision_avatar");
        if (storedAvatar) setProfileImage(storedAvatar);

        const storedName = getUserItem("fitvision_display_name");
        if (storedName) setDisplayName(storedName);
        else if (profile.name) setDisplayName(profile.name);

        const storedAge = getUserItem("fitvision_age");
        if (storedAge) setAge(storedAge);

        const storedHeight = getUserItem("fitvision_height");
        if (storedHeight) setHeight(storedHeight);

        const storedWeight = getUserItem("fitvision_weight");
        if (storedWeight) setWeight(storedWeight);

        const storedVoice = localStorage.getItem('fitvision_voice_feedback');
        if (storedVoice !== null) setVoiceFeedback(storedVoice === 'true');

        const storedAutoSave = localStorage.getItem('fitvision_auto_save');
        if (storedAutoSave !== null) setAutoSave(storedAutoSave === 'true');

        const storedCountdown = localStorage.getItem('fitvision_countdown');
        if (storedCountdown !== null) setCountdown(storedCountdown === 'true');

        const storedGhost = localStorage.getItem('fitvision_ghost_rep');
        if (storedGhost !== null) setGhostRep(storedGhost === 'true');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageError(false);
        resizeImage(file)
            .then((dataUrl) => {
                if (!setUserItem("fitvision_avatar", dataUrl)) throw new Error("storage full");
                setProfileImage(dataUrl);
                window.dispatchEvent(new Event('avatarUpdated'));
            })
            .catch(() => setImageError(true));
    };

    const handleSaveChanges = () => {
        setUserItem("fitvision_display_name", displayName);
        setUserItem("fitvision_age", age);
        setUserItem("fitvision_height", height);
        setUserItem("fitvision_weight", weight);

        window.dispatchEvent(new Event('profileUpdated'));

        // Show quick feedback
        setShowSavedFeedback(true);
        setTimeout(() => setShowSavedFeedback(false), 2000);
    };

    const prefs = [
        { key: "fitvision_voice_feedback", value: voiceFeedback, set: setVoiceFeedback, ...t.settings.aiPreferences.voice },
        { key: "fitvision_auto_save", value: autoSave, set: setAutoSave, ...t.settings.aiPreferences.autoSave },
        { key: "fitvision_countdown", value: countdown, set: setCountdown, ...t.settings.aiPreferences.countdown },
        { key: "fitvision_ghost_rep", value: ghostRep, set: setGhostRep, ...t.settings.aiPreferences.ghost },
    ];
    const inputClass =
        "w-full h-12 bg-white/[0.04] border border-white/15 rounded-xl px-4 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 pb-16">
                <header>
                    <h1 className="text-2xl md:text-3xl font-semibold text-white">{t.settings.title}</h1>
                    <p className="text-slate-300 mt-1">{t.settings.subtitle}</p>
                </header>

                {/* ── Profile ── */}
                <section aria-labelledby="profile-h" className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 flex flex-col gap-6">
                    <h2 id="profile-h" className="text-lg font-semibold text-white">{t.settings.biometric.title}</h2>
                    <div className="flex flex-wrap items-center gap-5">
                        <UserAvatar profile={{ name: displayName || displayAccount(user?.email) || "?", avatar: profileImage }} size={80} />
                        <div className="flex flex-col gap-1.5 items-start min-w-0">
                            <input type="file" className="sr-only" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} id="avatar-input" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-11 px-4 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">photo_camera</span>
                                {t.settings.biometric.uploadPhoto}
                            </button>
                            {imageError && <p role="alert" className="text-sm text-orange-300">{t.settings.imageTooLarge}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="display-name" className="text-sm font-medium text-slate-200">{t.settings.biometric.displayName}</label>
                            <input id="display-name" className={inputClass} type="text" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="age" className="text-sm font-medium text-slate-200">{`${t.register.ageLabel} (${t.register.ageUnit})`}</label>
                            <input id="age" className={inputClass} type="number" inputMode="numeric" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="height" className="text-sm font-medium text-slate-200">{t.settings.biometric.height}</label>
                            <input id="height" className={inputClass} type="number" inputMode="numeric" min={50} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="weight" className="text-sm font-medium text-slate-200">{t.settings.biometric.weight}</label>
                            <input id="weight" className={inputClass} type="number" inputMode="decimal" min={20} max={300} value={weight} onChange={(e) => setWeight(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSaveChanges}
                            className="h-12 px-6 rounded-xl bg-primary text-background-dark font-semibold hover:brightness-110 cursor-pointer flex items-center gap-2"
                        >
                            {showSavedFeedback && <span className="material-symbols-outlined text-xl">check</span>}
                            {showSavedFeedback ? t.settings.actions.saved : t.settings.actions.saveChanges}
                        </button>
                        <span aria-live="polite" className="sr-only">{showSavedFeedback ? t.settings.actions.saved : ""}</span>
                    </div>
                </section>

                {/* ── Workout preferences: saved immediately ── */}
                <section aria-labelledby="prefs-h" className="rounded-3xl bg-surface-dark border border-white/10 overflow-hidden">
                    <h2 id="prefs-h" className="text-lg font-semibold text-white px-5 md:px-6 pt-5 md:pt-6 pb-2">{t.settings.aiPreferences.title}</h2>
                    <ul className="divide-y divide-white/10">
                        {prefs.map((p) => (
                            <li key={p.key}>
                                <label className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 cursor-pointer hover:bg-white/[0.03]">
                                    <span>
                                        <span className="block text-white font-medium">{p.title}</span>
                                        <span className="block text-sm text-slate-300 mt-0.5">{p.desc}</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        role="switch"
                                        aria-checked={p.value}
                                        checked={p.value}
                                        onChange={(e) => {
                                            p.set(e.target.checked);
                                            try { localStorage.setItem(p.key, String(e.target.checked)); } catch { /* ignore */ }
                                        }}
                                        className="peer sr-only"
                                    />
                                    <span aria-hidden="true" className="relative shrink-0 w-12 h-7 rounded-full bg-slate-600 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 after:content-[''] after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                                </label>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ── Account ── */}
                <section aria-labelledby="account-h" className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 id="account-h" className="text-lg font-semibold text-white">{t.settings.account.title}</h2>
                        <p className="text-sm text-slate-300 break-all">
                            {user?.email && user.id !== "demo-user-id" ? `${t.settings.account.signedInAs} ${displayAccount(user.email)}` : t.settings.account.guest}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        className="h-11 px-5 rounded-xl border border-white/20 text-slate-100 hover:bg-white/5 font-medium flex items-center gap-2 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        {t.nav.logout}
                    </button>
                </section>
            </div>
        </DashboardLayout>
    );
}
