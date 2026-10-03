"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { saveProfileMetadata, signUpWithPassword } from "@/lib/authActions";
import { normalizeThaiPhone, phoneToEmail } from "@/lib/phoneAuth";
import { getUserItem, setUserItem } from "@/lib/userStorage";
import { useHydrated } from "@/lib/useHydrated";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/DashboardLayout";
import { FormError, OAuthButtons, PasswordField, PhoneField, fieldBoxClass, fieldInputClass, labelClass } from "@/components/auth/AuthFields";

const AGE = { min: 13, max: 100, start: 24 };
const HEIGHT = { min: 120, max: 220, start: 170 };
const WEIGHT = { min: 25, max: 300 };
const MIN_PASSWORD = 8;
const HEIGHT_TICKS = [120, 145, 170, 195, 220];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Error Supabase puts in the return URL when Google / Apple sign-in fails or is cancelled. */
function oauthErrorFromUrl(): string | null {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const msg = search.get("error_description") || hash.get("error_description") || search.get("error") || hash.get("error");
    return msg ? msg.replace(/\+/g, " ") : null;
}

export default function RegisterPage() {
    const { t } = useLanguage();
    const { loginWithEmail, user } = useAuth();
    const router = useRouter();
    const hydrated = useHydrated();
    const r = t.register;

    // Back from Google / Apple (?oauth=1): the provider gave us name + email, so only body data is left.
    const oauthReturn = hydrated && new URLSearchParams(window.location.search).has("oauth");
    const oauthError = oauthReturn ? oauthErrorFromUrl() : null;
    const provider = user?.app_metadata?.provider;
    const oauthUser = oauthReturn && !oauthError && (provider === "google" || provider === "apple");
    const oauthWaiting = oauthReturn && !oauthError && !oauthUser;
    const alreadyOnboarded = oauthUser && !!getUserItem("fitvision_age");

    const [step, setStep] = React.useState<1 | 2>(1);
    const [name, setName] = React.useState("");
    const [phone, setPhone] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [consent, setConsent] = React.useState(false);
    const [age, setAge] = React.useState(String(AGE.start));
    const [height, setHeight] = React.useState(HEIGHT.start);
    const [weight, setWeight] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [phoneTaken, setPhoneTaken] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const headingRef = React.useRef<HTMLHeadingElement>(null);

    // Move focus to the new step's heading so screen readers announce it.
    React.useEffect(() => {
        headingRef.current?.focus();
    }, [step, oauthUser]);

    // Returning Google / Apple users who already gave their body data go straight in.
    React.useEffect(() => {
        if (alreadyOnboarded) router.replace("/");
    }, [alreadyOnboarded, router]);

    const goToBody = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) return setError(r.nameRequired);
        if (!normalizeThaiPhone(phone)) return setError(t.login.phoneInvalid);
        if (isSupabaseConfigured && password.length < MIN_PASSWORD) return setError(r.passwordShort);
        if (!consent) return setError(r.consentRequired);
        setStep(2);
    };

    const ageNum = Number(age);
    const stepAge = (delta: number) => setAge(String(clamp((Number.isFinite(ageNum) && age !== "" ? ageNum : AGE.start) + delta, AGE.min, AGE.max)));

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setPhoneTaken(false);

        if (!Number.isInteger(ageNum) || ageNum < AGE.min || ageNum > AGE.max) return setError(r.ageRange);
        const weightNum = weight.trim() === "" ? null : Number(weight);
        if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < WEIGHT.min || weightNum > WEIGHT.max)) {
            return setError(r.weightRange);
        }
        if (oauthUser) {
            setLoading(true);
            setUserItem("fitvision_age", String(ageNum));
            setUserItem("fitvision_height", String(height));
            if (weightNum !== null) setUserItem("fitvision_weight", String(weightNum));
            window.dispatchEvent(new Event("profileUpdated"));
            await saveProfileMetadata({ age: ageNum, height_cm: height, weight_kg: weightNum });
            router.replace("/");
            return;
        }

        const phone66 = normalizeThaiPhone(phone);
        if (!phone66) {
            setStep(1);
            return setError(t.login.phoneInvalid);
        }

        const accountEmail = phoneToEmail(phone66);
        const displayName = name.trim();
        setLoading(true);

        if (isSupabaseConfigured) {
            const { error: authError } = await signUpWithPassword(accountEmail, password, {
                name: displayName,
                phone: `+${phone66}`,
                age: ageNum,
                height_cm: height,
                weight_kg: weightNum,
            });
            if (authError && authError.code !== "unreachable") {
                setLoading(false);
                if (authError.code === "already_registered") {
                    setPhoneTaken(true);
                    return setError(r.phoneTaken);
                }
                return setError(authError.message);
            }
            if (authError) console.warn("Supabase unreachable, creating a local account:", authError.message);
        }

        // Body data belongs to this account only (see lib/userStorage.ts).
        setUserItem("fitvision_age", String(ageNum), accountEmail);
        setUserItem("fitvision_height", String(height), accountEmail);
        if (weightNum !== null) setUserItem("fitvision_weight", String(weightNum), accountEmail);

        loginWithEmail(accountEmail, displayName);
        setLoading(false);
    };

    const showBody = oauthUser || step === 2;
    const stepLabel = r.step.replace("{n}", showBody ? "2" : "1");
    const shownError = error ?? (oauthError ? t.login.oauthFailed.replace("{msg}", oauthError) : null);

    if (oauthWaiting || alreadyOnboarded) {
        return (
            <div className="min-h-[100dvh] w-full bg-background-dark text-slate-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="size-8 rounded-full border-2 border-white/20 border-t-primary animate-spin" aria-hidden="true" />
                <p role="status" className="text-slate-300">{t.login.oauthSigningIn}</p>
                <Link href="/login" className="min-h-11 inline-flex items-center text-sm text-primary hover:underline underline-offset-4">
                    {t.login.backToLogin}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] w-full bg-background-dark text-slate-100 flex justify-center">
            <main className="w-full max-w-md flex flex-col px-6 pt-5 pb-7">
                {/* Top bar */}
                <div className="flex items-center justify-between h-11">
                    {oauthUser ? (
                        <span className="size-11" aria-hidden="true" />
                    ) : !showBody ? (
                        <Link href="/login" aria-label={r.back} className="-ml-2.5 size-11 flex items-center justify-center rounded-xl text-white hover:bg-white/5">
                            <span className="material-symbols-outlined" aria-hidden="true">arrow_back_ios_new</span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(null); }}
                            aria-label={r.back}
                            className="-ml-2.5 size-11 flex items-center justify-center rounded-xl text-white hover:bg-white/5 cursor-pointer"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">arrow_back_ios_new</span>
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-slate-400">{stepLabel}</span>
                        <LanguageToggle />
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5" aria-hidden="true">
                    <span className="h-1 rounded-full bg-primary" />
                    <span className={`h-1 rounded-full transition-colors ${showBody ? "bg-primary" : "bg-white/15"}`} />
                </div>

                {!showBody ? (
                    <form className="flex-1 flex flex-col" onSubmit={goToBody} noValidate>
                        <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-[30px] leading-[38px] font-semibold text-white focus:outline-none">
                            {r.accountTitle}
                        </h1>
                        <p className="mt-1 text-[15px] text-slate-400">{r.accountSubtitle}</p>

                        {!isSupabaseConfigured && (
                            <p className="mt-4 text-sm text-slate-300 bg-white/[0.04] border border-white/10 rounded-xl p-3 flex gap-2">
                                <span className="material-symbols-outlined text-lg text-slate-400" aria-hidden="true">info</span>
                                {t.login.localModeNote}
                            </p>
                        )}

                        <div className="mt-6 flex flex-col gap-4">
                            <FormError message={shownError} />

                            {isSupabaseConfigured && (
                                <>
                                    <OAuthButtons onError={setError} />
                                    <div className="flex items-center gap-3 text-[13px] text-slate-500" aria-hidden="true">
                                        <span className="flex-1 h-px bg-white/10" />
                                        {r.orPhone}
                                        <span className="flex-1 h-px bg-white/10" />
                                    </div>
                                </>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="reg-name" className={labelClass}>{r.nameLabel}</label>
                                <div className={fieldBoxClass}>
                                    <input
                                        id="reg-name"
                                        type="text"
                                        autoComplete="name"
                                        maxLength={40}
                                        placeholder={r.namePlaceholder}
                                        className={fieldInputClass}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="reg-phone" className={labelClass}>{t.login.phoneLabel}</label>
                                <PhoneField id="reg-phone" value={phone} onChange={setPhone} />
                            </div>

                            {isSupabaseConfigured && (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="reg-password" className={labelClass}>{r.passwordLabel}</label>
                                    <PasswordField
                                        id="reg-password"
                                        value={password}
                                        onChange={setPassword}
                                        placeholder={r.passwordPlaceholder}
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}

                            <div className="mt-1 flex items-start gap-3">
                                <input
                                    id="reg-consent"
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="mt-0.5 size-5 shrink-0 accent-primary cursor-pointer"
                                />
                                <label htmlFor="reg-consent" className="text-[13px] leading-5 text-slate-300 cursor-pointer">
                                    {r.consent}
                                </label>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 flex flex-col gap-4">
                            <button
                                type="submit"
                                className="h-[54px] rounded-[14px] bg-primary text-background-dark font-semibold text-[17px] hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {r.next}
                                <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_forward</span>
                            </button>
                            <p className="text-sm text-slate-400 text-center">
                                {r.haveAccount}{" "}
                                <Link href="/login" className="inline-flex items-center min-h-11 px-1 font-semibold text-primary hover:underline underline-offset-4">
                                    {r.signIn}
                                </Link>
                            </p>
                        </div>
                    </form>
                ) : (
                    <form className="flex-1 flex flex-col" onSubmit={handleRegister} noValidate>
                        <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-[30px] leading-[38px] font-semibold text-white focus:outline-none">
                            {r.bodyTitle}
                        </h1>
                        <p className="mt-1 text-[15px] text-slate-400">{oauthUser ? r.oauthBodySubtitle : r.bodySubtitle}</p>

                        <div className="mt-6 flex flex-col gap-3.5">
                            <FormError message={error} />
                            {phoneTaken && (
                                <Link href="/login" className="-mt-1.5 self-start min-h-11 inline-flex items-center text-sm font-semibold text-primary hover:underline underline-offset-4">
                                    {r.signIn} →
                                </Link>
                            )}

                            {/* Age */}
                            <div className="p-4 rounded-[18px] bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <label htmlFor="reg-age" className={labelClass}>{r.ageLabel}</label>
                                    <span className="text-xs text-slate-400">{r.ageUnit}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => stepAge(-1)}
                                        aria-label={r.ageDecrease}
                                        className="size-11 rounded-xl border-[1.5px] border-white/15 flex items-center justify-center hover:bg-white/5 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-xl" aria-hidden="true">remove</span>
                                    </button>
                                    <input
                                        id="reg-age"
                                        type="number"
                                        inputMode="numeric"
                                        min={AGE.min}
                                        max={AGE.max}
                                        value={age}
                                        onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                        className="w-16 h-11 bg-transparent text-center text-[28px] font-semibold text-white rounded-lg focus:outline-2 focus:outline-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => stepAge(1)}
                                        aria-label={r.ageIncrease}
                                        className="size-11 rounded-xl border-[1.5px] border-white/15 flex items-center justify-center hover:bg-white/5 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
                                    </button>
                                </div>
                            </div>

                            {/* Height */}
                            <div className="px-4 pt-4 pb-[18px] rounded-[18px] bg-white/[0.04] border border-white/10 flex flex-col gap-2.5">
                                <div className="flex items-baseline justify-between">
                                    <label htmlFor="reg-height" className={labelClass}>{r.heightLabel}</label>
                                    <p className="flex items-baseline gap-1.5" aria-hidden="true">
                                        <span className="text-[40px] leading-[44px] font-semibold text-primary tabular-nums">{height}</span>
                                        <span className="text-[15px] text-slate-400">{r.heightUnit}</span>
                                    </p>
                                </div>
                                <input
                                    id="reg-height"
                                    type="range"
                                    min={HEIGHT.min}
                                    max={HEIGHT.max}
                                    step={1}
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    aria-valuetext={`${height} ${r.heightUnit}`}
                                    className="w-full h-7 accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-400" aria-hidden="true">
                                    {HEIGHT_TICKS.map((v) => <span key={v}>{v}</span>)}
                                </div>
                            </div>

                            {/* Weight (optional) */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between">
                                    <label htmlFor="reg-weight" className={labelClass}>{r.weightLabel}</label>
                                    <span className="text-xs text-slate-400">{r.optional}</span>
                                </div>
                                <div className={fieldBoxClass}>
                                    <input
                                        id="reg-weight"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={r.weightPlaceholder}
                                        className={fieldInputClass}
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
                                    />
                                    <span className="px-4 text-[15px] text-slate-400" aria-hidden="true">{r.weightUnit}</span>
                                </div>
                            </div>

                            <p className="flex gap-2.5 items-start px-3.5 py-3 rounded-[14px] bg-white/[0.03] text-[13px] leading-5 text-slate-400">
                                <span className="material-symbols-outlined text-lg" aria-hidden="true">info</span>
                                {r.editLater}
                            </p>
                        </div>

                        <div className="mt-auto pt-8 flex flex-col gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-[54px] rounded-[14px] bg-primary text-background-dark font-semibold text-[17px] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? r.creating : r.submit}
                            </button>
                            {oauthUser && (
                                <button
                                    type="button"
                                    onClick={() => router.replace("/")}
                                    className="self-center min-h-11 px-3 text-sm text-slate-400 hover:text-white cursor-pointer"
                                >
                                    {r.skip}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
