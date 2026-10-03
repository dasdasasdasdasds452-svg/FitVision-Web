"use client";

import React from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { signInWithPassword } from "@/lib/authActions";
import { normalizeThaiPhone, phoneToEmail } from "@/lib/phoneAuth";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/DashboardLayout";
import PoseHero from "@/components/auth/PoseHero";
import { BrandMark, FormError, OAuthButtons, PasswordField, PhoneField, fieldBoxClass, fieldInputClass, labelClass } from "@/components/auth/AuthFields";

type Method = "phone" | "email";

export default function LoginPage() {
    const { t } = useLanguage();
    const { loginAsDemo, loginWithEmail } = useAuth();

    const [method, setMethod] = React.useState<Method>("phone");
    const [phone, setPhone] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let accountEmail: string;
        if (method === "phone") {
            const normalized = normalizeThaiPhone(phone);
            if (!normalized) {
                setError(t.login.phoneInvalid);
                return;
            }
            accountEmail = phoneToEmail(normalized);
        } else {
            accountEmail = email.trim().toLowerCase();
            if (!accountEmail) {
                setError(t.login.emailRequired);
                return;
            }
        }

        setLoading(true);
        // With a real auth server, a wrong password must NOT log the user in.
        // Without one (demo / offline), fall back to a local profile for this account.
        if (isSupabaseConfigured) {
            const { error: authError } = await signInWithPassword(accountEmail, password);
            if (authError && authError.code !== "unreachable") {
                setError(authError.code === "wrong_credentials" ? t.login.wrongCredentials : authError.message);
                setLoading(false);
                return;
            }
            if (authError) console.warn("Supabase unreachable, continuing in local mode:", authError.message);
        }

        loginWithEmail(accountEmail);
        setLoading(false);
    };

    const switchMethod = () => {
        setMethod(method === "phone" ? "email" : "phone");
        setError(null);
    };

    return (
        <div className="min-h-[100dvh] w-full grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-background-dark text-slate-100">
            {/* ── Brand / value panel (desktop) ── */}
            <aside className="hidden lg:flex flex-col justify-between gap-10 p-12 xl:p-16 bg-surface-darker border-r border-white/10">
                <BrandMark size="lg" />
                <div className="max-w-md flex flex-col gap-8">
                    <PoseHero className="aspect-[342/196]" />
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-semibold leading-tight text-white text-balance">{t.login.heroTitle}</h1>
                        <ul className="mt-6 flex flex-col gap-3">
                            {t.login.heroPoints.map((point) => (
                                <li key={point} className="flex items-start gap-3 text-lg text-slate-200">
                                    <span className="material-symbols-outlined text-primary mt-0.5" aria-hidden="true">check_circle</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">lock</span>
                    {t.login.privacyNote}
                </p>
            </aside>

            {/* ── Form ── */}
            <main className="flex flex-col px-6 pt-5 pb-7 sm:px-10">
                <div className="flex items-center justify-between">
                    <div className="lg:invisible">
                        <BrandMark />
                    </div>
                    <LanguageToggle />
                </div>

                <div className="flex-1 flex justify-center lg:items-center py-6 lg:py-10">
                    <div className="w-full max-w-sm flex flex-col">
                        <PoseHero className="lg:hidden aspect-[342/196]" />

                        <h2 className="mt-6 lg:mt-0 text-[30px] leading-[38px] font-semibold text-white">{t.login.welcomeBack}</h2>
                        <p className="mt-1 text-[15px] text-slate-400">{t.login.signInSubtitle}</p>

                        {!isSupabaseConfigured && (
                            <p className="mt-4 text-sm text-slate-300 bg-white/[0.04] border border-white/10 rounded-xl p-3 flex gap-2">
                                <span className="material-symbols-outlined text-lg text-slate-400" aria-hidden="true">info</span>
                                {t.login.localModeNote}
                            </p>
                        )}

                        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                            <FormError message={error} />

                            {method === "phone" ? (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="login-phone" className={labelClass}>{t.login.phoneLabel}</label>
                                    <PhoneField id="login-phone" value={phone} onChange={setPhone} />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="login-email" className={labelClass}>{t.login.emailLabel}</label>
                                    <div className={fieldBoxClass}>
                                        <input
                                            id="login-email"
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            placeholder={t.login.emailPlaceholder}
                                            className={fieldInputClass}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {isSupabaseConfigured && (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="login-password" className={labelClass}>{t.login.passwordLabel}</label>
                                    <PasswordField
                                        id="login-password"
                                        value={password}
                                        onChange={setPassword}
                                        placeholder={t.login.passwordPlaceholder}
                                        autoComplete="current-password"
                                    />
                                </div>
                            )}

                            <button
                                disabled={loading}
                                type="submit"
                                className="mt-1.5 h-[54px] rounded-[14px] bg-primary text-background-dark font-semibold text-[17px] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? t.login.processing : t.login.signIn}
                            </button>

                            <button
                                type="button"
                                onClick={switchMethod}
                                className="self-center min-h-11 px-2 text-sm text-slate-300 hover:text-white underline underline-offset-4 decoration-white/30 cursor-pointer"
                            >
                                {method === "phone" ? t.login.useEmail : t.login.usePhone}
                            </button>
                        </form>

                        <div className="mt-2 flex items-center gap-3 text-[13px] text-slate-500" aria-hidden="true">
                            <span className="flex-1 h-px bg-white/10" />
                            {t.login.or}
                            <span className="flex-1 h-px bg-white/10" />
                        </div>

                        {isSupabaseConfigured && (
                            <div className="mt-4">
                                <OAuthButtons onError={setError} />
                            </div>
                        )}

                        <div className="mt-2.5 flex flex-col gap-1.5">
                            <button
                                type="button"
                                onClick={loginAsDemo}
                                className="h-[52px] rounded-[14px] border-[1.5px] border-white/15 text-white font-medium hover:bg-white/5 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl" aria-hidden="true">bolt</span>
                                {t.login.tryDemo}
                            </button>
                            <p className="text-xs text-slate-400 text-center">{t.login.demoHint}</p>
                        </div>

                        <p className="mt-6 text-sm text-slate-400 text-center">
                            {t.login.noAccount}{" "}
                            <Link href="/register" className="inline-flex items-center min-h-11 px-1 font-semibold text-primary hover:underline underline-offset-4">
                                {t.register.accountTitle}
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="lg:hidden text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
                    {t.login.privacyNote}
                </p>
            </main>
        </div>
    );
}
