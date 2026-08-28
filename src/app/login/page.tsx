"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
    const { t } = useLanguage();
    const router = useRouter();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSignUp, setIsSignUp] = React.useState(false);


    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                // Typically you'd tell them to check their email here, but we'll assume it logs in or shows an alert
                alert(t.login.signUpSuccess);
                setIsSignUp(false);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                // AuthContext will handle redirect
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during authentication.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="flex min-h-[100dvh] w-full flex-col lg:flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            {/* Left Column: Hero Typography & Branding */}
            <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden animate-fade-in-up bg-[#0a0f0a]">
                {/* High-tech abstract background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {/* Huge Typography Background */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-12 text-[12vw] leading-[0.85] font-black italic text-white/[0.03] select-none pointer-events-none whitespace-nowrap tracking-tighter">
                        FIT<br />
                        VISION<br />
                        <span className="text-primary/[0.04]">.AI()</span>
                    </div>

                    {/* Tech Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#39ff140a_1px,transparent_1px),linear-gradient(to_bottom,#39ff140a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

                    {/* Glow effects */}
                    <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
                    <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
                </div>
                {/* Content */}
                <div className="relative z-20 flex items-center gap-3">
                    <div className="size-10 text-primary drop-shadow-[0_0_12px_rgba(57,255,20,0.4)]">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_6_535_lg)">
                                <path
                                    clipRule="evenodd"
                                    d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                ></path>
                            </g>
                            <defs>
                                <clipPath id="clip0_6_535_lg">
                                    <rect fill="white" height="48" width="48"></rect>
                                </clipPath>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
                        FitVision
                    </h1>
                </div>
                <div className="relative z-20 max-w-lg">
                    <h2 className="text-5xl font-extrabold leading-tight text-slate-100 mb-6">
                        {t.login.heroTitle1} <br />
                        <span className="text-primary italic">{t.login.heroTitle2}</span>
                    </h2>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        {t.login.heroSubtitle}
                    </p>
                </div>
                <div className="relative z-20 flex gap-8 text-sm font-medium text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                        {t.login.feature1}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                        {t.login.feature2}
                    </div>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="flex flex-1 w-full lg:w-1/2 flex-col items-center justify-center p-6 lg:p-20 relative bg-[#0a0f0a] z-10">
                {/* Mobile Logo (Hidden on Desktop) */}
                <div className="lg:hidden flex items-center gap-2 mb-10 animate-fade-in-up">
                    <div className="size-8 text-primary drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_6_535_md)">
                                <path
                                    clipRule="evenodd"
                                    d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                ></path>
                            </g>
                            <defs>
                                <clipPath id="clip0_6_535_md">
                                    <rect fill="white" height="48" width="48"></rect>
                                </clipPath>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">FitVision</h1>
                </div>

                <div className="w-full max-w-md p-8 lg:p-10 rounded-2xl flex flex-col gap-8 shadow-2xl bg-[#12230f]/60 backdrop-blur-xl border border-primary/10 animate-fade-in-up">
                    <div className="text-center lg:text-left">
                        <h3 className="text-3xl font-bold text-slate-100 mb-2">{t.login.welcomeBack}</h3>
                        <p className="text-slate-400 font-medium">{t.login.signInSubtitle}</p>
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-4">
                        <button aria-label="Sign in with Google" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="currentColor"></path>
                            </svg>
                            Google
                        </button>
                        <button aria-label="Sign in with Google" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05 1.71-3.23 1.71-1.16 0-1.52-.71-2.91-.71-1.4 0-1.81.71-2.91.71-1.18 0-2.31-.85-3.32-2.33C2.63 16.6 1.8 12.72 3.86 9.1c1.03-1.81 2.88-2.95 4.91-2.98 1.54-.03 2.99 1.01 3.94 1.01.94 0 2.66-1.25 4.51-1.06 1.83.07 3.23.74 4.14 2.06-3.41 2.04-2.84 6.78.43 8.35-.69 1.72-1.76 3.8-3.74 3.8zM12.03 5.92c-.01-4.04 3.33-7.31 3.41-7.33.07.02 3.44 3.25 3.41 7.29-.01 4.04-3.33 7.31-3.41 7.33-.07-.02-3.44-3.25-3.41-7.29z" fill="currentColor"></path>
                            </svg>
                            Apple
                        </button>
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">{t.login.orContinueWith}</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Form */}
                    <form className="flex flex-col gap-5" onSubmit={handleAuth}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-300 ml-1">{t.login.emailLabel}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">mail</span>
                                <input
                                    id="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder:text-slate-600 focus:border-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]"
                                    placeholder={t.login.emailPlaceholder}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center ml-1">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-300">{t.login.passwordLabel}</label>
                                <a className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]" href="#">{t.login.forgotPassword}</a>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                                <input
                                    id="password" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-slate-100 placeholder:text-slate-600 focus:border-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button aria-label="Toggle password visibility" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]" type="button">
                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                </button>
                            </div>
                        </div>
                        <button disabled={loading} type="submit" className="w-full bg-primary text-black font-black py-4 rounded-xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(60,249,26,0.6)] transform transition-all active:scale-95 mt-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]">
                            {loading ? t.login.processing : (isSignUp ? t.login.signUp : t.login.signIn)}
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-slate-400 text-sm">
                            {isSignUp ? t.login.alreadyHaveAccount : t.login.noAccount}
                            <button 
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                                className="text-primary font-bold hover:underline transition-all ml-1 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]"
                            >
                                {isSignUp ? t.login.signInToggle : t.login.createAccount}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-12 flex gap-6 text-xs text-slate-600 font-medium uppercase tracking-tighter animate-fade-in-up">
                    <a className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]" href="#">{t.login.privacyPolicy}</a>
                    <a className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]" href="#">{t.login.termsOfService}</a>
                    <a className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]" href="#">{t.login.support}</a>
                </div>

                {/* Decorative background elements */}
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            </div>
        </div>
    );
}
