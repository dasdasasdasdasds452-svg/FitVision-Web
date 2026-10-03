"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatPhoneInput } from "@/lib/phoneAuth";
import { signInWithProvider, type OAuthProvider } from "@/lib/authActions";

/** Outline box shared by the auth inputs; turns primary while the input inside has focus. */
export const fieldBoxClass =
    "flex items-center h-[52px] rounded-[14px] bg-white/[0.04] border-[1.5px] border-white/15 focus-within:border-primary transition-colors";
export const fieldInputClass =
    "flex-1 min-w-0 h-full bg-transparent border-0 px-4 text-base text-white placeholder:text-slate-500 focus:outline-none";
export const labelClass = "text-sm font-medium text-slate-200";

export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
    const box = size === "lg" ? "size-10 rounded-xl" : "size-8 rounded-[9px]";
    return (
        <div className="flex items-center gap-2.5">
            <div className={`${box} bg-primary flex items-center justify-center text-background-dark shrink-0`}>
                <span className="material-symbols-outlined text-xl" aria-hidden="true">fitness_center</span>
            </div>
            <span className={`${size === "lg" ? "text-2xl" : "text-xl"} font-bold tracking-tight`}>FitVision</span>
        </div>
    );
}

export function PhoneField({
    id,
    value,
    onChange,
    invalid,
    describedBy,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    invalid?: boolean;
    describedBy?: string;
}) {
    const { t } = useLanguage();
    return (
        <div className={`${fieldBoxClass} ${invalid ? "border-orange-400!" : ""}`}>
            <span className="pl-4 pr-3 h-6 flex items-center border-r border-white/15 text-[15px] text-slate-300" aria-hidden="true">
                {t.login.countryCode}
            </span>
            <input
                id={id}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t.login.phonePlaceholder}
                className={`${fieldInputClass} px-3.5`}
                value={value}
                onChange={(e) => onChange(formatPhoneInput(e.target.value))}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                required
            />
        </div>
    );
}

export function PasswordField({
    id,
    value,
    onChange,
    placeholder,
    autoComplete,
    invalid,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    autoComplete: "current-password" | "new-password";
    invalid?: boolean;
}) {
    const { t } = useLanguage();
    const [show, setShow] = React.useState(false);
    return (
        <div className={`${fieldBoxClass} ${invalid ? "border-orange-400!" : ""}`}>
            <input
                id={id}
                type={show ? "text" : "password"}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className={fieldInputClass}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={invalid || undefined}
                required
            />
            <button
                type="button"
                aria-label={show ? t.login.hidePassword : t.login.showPassword}
                aria-pressed={show}
                onClick={() => setShow(!show)}
                className="size-12 shrink-0 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
            >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">{show ? "visibility_off" : "visibility"}</span>
            </button>
        </div>
    );
}

export function FormError({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <p role="alert" className="bg-orange-500/10 border border-orange-400/40 text-orange-200 p-3 rounded-xl text-sm">
            {message}
        </p>
    );
}

/** Where Google / Apple send the browser back: the register page finishes sign-in there. */
export const OAUTH_RETURN_PATH = "/register?oauth=1";

/** "Continue with Google / Apple" — only works when Supabase is configured with those providers. */
export function OAuthButtons({ onError }: { onError: (message: string) => void }) {
    const { t } = useLanguage();
    const [pending, setPending] = React.useState<OAuthProvider | null>(null);

    const start = async (provider: OAuthProvider) => {
        setPending(provider);
        const { error } = await signInWithProvider(provider, OAUTH_RETURN_PATH);
        // On success the browser is already navigating away; only errors come back here.
        if (error) {
            onError(t.login.oauthFailed.replace("{msg}", error.message));
            setPending(null);
        }
    };

    const buttons: { provider: OAuthProvider; label: string }[] = [
        { provider: "google", label: t.login.continueWithGoogle },
        { provider: "apple", label: t.login.continueWithApple },
    ];

    return (
        <div className="flex flex-col gap-2.5">
            {buttons.map(({ provider, label }) => (
                <button
                    key={provider}
                    type="button"
                    disabled={pending !== null}
                    onClick={() => start(provider)}
                    className="h-[52px] rounded-[14px] bg-white text-[#121212] font-semibold text-[15px] hover:bg-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                    {pending === provider ? t.login.oauthSigningIn : label}
                </button>
            ))}
        </div>
    );
}
