"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

export default function SettingsPage() {
    const { t } = useLanguage();
    const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuCiDJDucCCwOhZ9OpV8-UdGLCPzxh-5ylxVUG8QTllTDlEQtaL3zmUWzNkHd21gwPbtArPVyhC-1byXGXOyKl9ZFcNaSJQo7EOjl-Bv-RIpuh89mgXdonjPnj6S03XXakL_ElgpXLqfTVCVWfUyC5nyxMVryUq5ZuwkSIFoXmZjrdZlwvxVoaQuQ4ahJf_hRS2ZAaWmpEOVjzige6RbE9TWNjXQYQOoVax8QzkVsUW2FUXVBg9R6lfGjznTlKZ5rGQNCpFPnoOWp3U";
    const [profileImage, setProfileImage] = useState(defaultAvatar);
    const [displayName, setDisplayName] = useState("Alex Morgan");
    const [height, setHeight] = useState("185");
    const [weight, setWeight] = useState("82");

    // Check if saving is showing feedback
    const [showSavedFeedback, setShowSavedFeedback] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedAvatar = localStorage.getItem('fitvision_avatar');
        if (storedAvatar) setProfileImage(storedAvatar);

        const storedName = localStorage.getItem('fitvision_display_name');
        if (storedName) setDisplayName(storedName);

        const storedHeight = localStorage.getItem('fitvision_height');
        if (storedHeight) setHeight(storedHeight);

        const storedWeight = localStorage.getItem('fitvision_weight');
        if (storedWeight) setWeight(storedWeight);

        // Entrance animation
        
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setProfileImage(base64String);
                localStorage.setItem('fitvision_avatar', base64String);
                window.dispatchEvent(new Event('avatarUpdated'));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = () => {
        localStorage.setItem('fitvision_display_name', displayName);
        localStorage.setItem('fitvision_height', height);
        localStorage.setItem('fitvision_weight', weight);

        window.dispatchEvent(new Event('profileUpdated'));

        // Show quick feedback
        setShowSavedFeedback(true);
        setTimeout(() => setShowSavedFeedback(false), 2000);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen w-full overflow-x-hidden font-display">
                <main className="flex-1 w-full p-6 lg:p-10">
                    <div className="max-w-4xl mx-auto space-y-10">
                        {/* Title Section */}
                        <div className="flex flex-col gap-2 animate-slide-up">
                            <h1 className="text-slate-100 text-4xl font-black leading-tight tracking-tight uppercase italic flex items-center gap-4">
                                {t.settings.title} <span className="text-primary text-xl material-symbols-outlined">settings_accessibility</span>
                            </h1>
                            <p className="text-slate-400 text-base font-normal max-w-xl">
                                {t.settings.subtitle} <span className="text-primary">{t.settings.subtitleHighlight}</span> {t.settings.subtitleEnd}
                            </p>
                        </div>

                        {/* Profile Section */}
                        <section className="glass rounded-2xl p-8 space-y-8 animate-slide-up">
                            <div className="flex items-center gap-6 border-b border-primary/10 pb-6">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-28 border-2 border-primary ring-4 ring-primary/10 shadow-[0_0_20px_rgba(60,249,26,0.2)]"
                                        title="User avatar"
                                        style={{ backgroundImage: `url('${profileImage}')` }}>
                                    </div>
                                    <div className="absolute inset-0 bg-[#12230f]/60 rounded-full group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="material-symbols-outlined text-primary">edit</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-slate-100 text-xl font-bold tracking-tight">{t.settings.biometric.title}</h3>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 px-5 py-2.5 w-fit rounded-lg bg-primary text-[#12230f] text-sm font-black uppercase tracking-wider hover:brightness-110 transition-all">
                                        <span className="material-symbols-outlined text-lg">upload</span>
                                        <span>{t.settings.biometric.uploadPhoto}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-primary/60 pl-1">{t.settings.biometric.displayName}</label>
                                    <input
                                        className="w-full glass bg-[#12230f]/40 border-primary/20 rounded-xl px-4 py-3 text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-600 outline-none"
                                        placeholder="e.g. Neo_Fitness"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-primary/60 pl-1">{t.settings.biometric.height}</label>
                                        <input
                                            className="w-full glass bg-[#12230f]/40 border-primary/20 rounded-xl px-4 py-3 text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                            type="number"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-primary/60 pl-1">{t.settings.biometric.weight}</label>
                                        <input
                                            className="w-full glass bg-[#12230f]/40 border-primary/20 rounded-xl px-4 py-3 text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                            type="number"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* AI Preferences Section */}
                        <section className="space-y-6 animate-slide-up">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">psychology</span>
                                <h2 className="text-slate-100 text-xl font-black uppercase italic">{t.settings.aiPreferences.title}</h2>
                            </div>
                            <div className="glass rounded-2xl divide-y divide-primary/10 overflow-hidden">
                                {/* Preference 1 */}
                                <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-slate-100 font-bold text-base">{t.settings.aiPreferences.voice.title}</p>
                                        <p className="text-slate-400 text-sm">{t.settings.aiPreferences.voice.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input defaultChecked className="sr-only peer" type="checkbox" />
                                        <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {/* Preference 2 */}
                                <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-slate-100 font-bold text-base">{t.settings.aiPreferences.autoSave.title}</p>
                                        <p className="text-slate-400 text-sm">{t.settings.aiPreferences.autoSave.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input defaultChecked className="sr-only peer" type="checkbox" />
                                        <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {/* Preference 3 */}
                                <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-slate-100 font-bold text-base">{t.settings.aiPreferences.countdown.title}</p>
                                        <p className="text-slate-400 text-sm">{t.settings.aiPreferences.countdown.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input defaultChecked className="sr-only peer" type="checkbox" />
                                        <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Bottom Action Buttons */}
                        <div className="flex items-center gap-4 pt-6 animate-slide-up relative">
                            <button
                                onClick={handleSaveChanges}
                                className="flex-1 md:flex-none md:w-48 bg-primary hover:shadow-[0_0_20px_#3cf91a55] text-[#12230f] px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all text-sm active:scale-95">
                                {showSavedFeedback ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm">check</span>
                                        SAVED
                                    </div>
                                ) : (
                                    t.settings.actions.saveChanges
                                )}
                            </button>
                            <Link href="/" className="flex justify-center flex-1 md:flex-none md:w-32 glass border-slate-700 hover:border-slate-500 text-slate-300 px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all text-sm active:scale-95">
                                {t.settings.actions.cancel}
                            </Link>
                        </div>
                    </div>
                    {/* Footer Spacer */}
                    <div className="h-20"></div>
                </main>
            </div>
        </DashboardLayout>
    );
}
