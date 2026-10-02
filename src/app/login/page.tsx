"use client";

import React from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/DashboardLayout";

export default function LoginPage() {
    const { t, language } = useLanguage();
    const { loginAsDemo, loginWithEmail } = useAuth();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSignUp, setIsSignUp] = React.useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const targetEmail = email.trim();
        if (!targetEmail) {
            setError(language === "th" ? "กรุณากรอกอีเมล" : "Please enter your email");
            setLoading(false);
            return;
        }

        // With a real auth server, a wrong password must NOT log the user in.
        // Without one (demo / offline), fall back to a local profile for this email.
        let authError: string | null = null;
        if (isSupabaseConfigured) {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Supabase timeout")), 5000)
                );
                const authPromise = isSignUp
                    ? supabase.auth.signUp({ email: targetEmail, password })
                    : supabase.auth.signInWithPassword({ email: targetEmail, password });
                const { error: supaError } = await Promise.race([authPromise, timeoutPromise]);
                if (supaError) authError = supaError.message;
            } catch (err) {
                console.warn("Supabase unreachable, continuing in local mode:", err);
            }
        }

        if (authError) {
            setError(authError);
            setLoading(false);
            return;
        }

        loginWithEmail(targetEmail);
        setLoading(false);
    };

    const inputClass =
        "w-full h-12 bg-white/[0.04] border border-white/15 rounded-xl pl-11 pr-4 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors";

    return (
        <div className="min-h-[100dvh] w-full grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-background-dark text-slate-100">
            {/* ── Brand / value panel (desktop) ── */}
            <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-surface-darker border-r border-white/10">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-background-dark">
                        <span className="material-symbols-outlined text-2xl">fitness_center</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">FitVision</span>
                </div>

                <div className="max-w-md">
                    <h1 className="text-4xl xl:text-5xl font-semibold leading-tight text-white text-balance">{t.login.heroTitle}</h1>
                    <ul className="mt-8 flex flex-col gap-4">
                        {t.login.heroPoints.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-lg text-slate-200">
                                <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">lock</span>
                    {t.login.privacyNote}
                </p>
            </aside>

            {/* ── Form ── */}
            <main className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 lg:invisible">
                        <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-background-dark">
                            <span className="material-symbols-outlined text-xl">fitness_center</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">FitVision</span>
                    </div>
                    <LanguageToggle />
                </div>

                <div className="flex-1 flex items-center justify-center py-10">
                    <div className="w-full max-w-sm flex flex-col gap-6">
                        <div>
                            <h2 className="text-3xl font-semibold text-white">{isSignUp ? t.login.createTitle : t.login.welcomeBack}</h2>
                            <p className="text-slate-300 mt-1">{isSignUp ? t.login.createSubtitle : t.login.signInSubtitle}</p>
                        </div>

                        {!isSupabaseConfigured && (
                            <p className="text-sm text-slate-300 bg-white/[0.04] border border-white/10 rounded-xl p-3 flex gap-2">
                                <span className="material-symbols-outlined text-lg text-slate-400">info</span>
                                {t.login.localModeNote}
                            </p>
                        )}

                        <form className="flex flex-col gap-4" onSubmit={handleAuth} noValidate>
                            {error && (
                                <p role="alert" className="bg-orange-500/10 border border-orange-400/40 text-orange-200 p-3 rounded-xl text-sm">
                                    {error}
                                </p>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-slate-200">{t.login.emailLabel}</label>
                                <div className="relative">
                                    <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                                    <input
                                        id="email"
                                        className={inputClass}
                                        placeholder={t.login.emailPlaceholder}
                                        type="email"
                                        autoComplete="email"
                                        inputMode="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {isSupabaseConfigured && (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="password" className="text-sm font-medium text-slate-200">{t.login.passwordLabel}</label>
                                    <div className="relative">
                                        <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                        <input
                                            id="password"
                                            className={`${inputClass} pr-12`}
                                            type={showPassword ? "text" : "password"}
                                            autoComplete={isSignUp ? "new-password" : "current-password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                                            aria-pressed={showPassword}
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 size-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={loading}
                                type="submit"
                                className="h-12 rounded-xl bg-primary text-background-dark font-semibold text-base hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1"
                            >
                                {loading ? t.login.processing : isSignUp ? t.login.signUp : t.login.signIn}
                            </button>
                        </form>

                        <p className="text-sm text-slate-300 text-center">
                            {isSignUp ? t.login.alreadyHaveAccount : t.login.noAccount}{" "}
                            <button
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                                className="text-primary font-semibold hover:underline underline-offset-4 cursor-pointer min-h-11 px-1"
                            >
                                {isSignUp ? t.login.signInToggle : t.login.createAccount}
                            </button>
                        </p>

                        <div className="flex items-center gap-3 text-sm text-slate-400" aria-hidden="true">
                            <span className="flex-1 h-px bg-white/10" />
                            {language === "th" ? "หรือ" : "or"}
                            <span className="flex-1 h-px bg-white/10" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <button
                                type="button"
                                onClick={loginAsDemo}
                                className="h-12 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">bolt</span>
                                {t.login.tryDemo}
                            </button>
                            <p className="text-xs text-slate-400 text-center">{t.login.demoHint}</p>
                        </div>
                    </div>
                </div>

                <p className="lg:hidden text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-base">lock</span>
                    {t.login.privacyNote}
                </p>
            </main>
        </div>
    );
}
