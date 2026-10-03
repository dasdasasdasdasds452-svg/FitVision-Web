// Supabase sign-in / sign-up with a timeout, so a paused or offline project
// never blocks the auth pages. Callers check isSupabaseConfigured first.
import { supabase } from "@/lib/supabaseClient";

export type AuthErrorCode = "wrong_credentials" | "already_registered" | "unreachable" | "other";
export interface AuthResult {
    error: { code: AuthErrorCode; message: string } | null;
}

const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
    return Promise.race([
        p,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Supabase timeout")), TIMEOUT_MS)),
    ]);
}

function classify(message: string): AuthErrorCode {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) return "wrong_credentials";
    if (m.includes("already registered") || m.includes("already exists")) return "already_registered";
    return "other";
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    try {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        return { error: error ? { code: classify(error.message), message: error.message } : null };
    } catch (err) {
        return { error: { code: "unreachable", message: String(err) } };
    }
}

/** Profile fields saved as Supabase user_metadata, so they follow the account across devices. */
export interface SignUpProfile {
    name: string;
    phone: string;
    age: number;
    height_cm: number;
    weight_kg: number | null;
}

export async function signUpWithPassword(email: string, password: string, profile: SignUpProfile): Promise<AuthResult> {
    try {
        const { data, error } = await withTimeout(
            supabase.auth.signUp({ email, password, options: { data: profile } })
        );
        if (error) return { error: { code: classify(error.message), message: error.message } };
        // With "Confirm email" switched on, Supabase returns no session (and an empty identity list
        // for an address that already exists). Phone accounts can't confirm mail, so sign in directly.
        if (!data.session) {
            if (data.user && (data.user.identities?.length ?? 0) === 0) {
                return { error: { code: "already_registered", message: "User already registered" } };
            }
            return signInWithPassword(email, password);
        }
        return { error: null };
    } catch (err) {
        return { error: { code: "unreachable", message: String(err) } };
    }
}

export type OAuthProvider = "google" | "apple";

/**
 * Start Google / Apple sign-in. The browser leaves the app and comes back to `returnPath`,
 * where supabase-js picks the session up from the URL and AuthProvider gets SIGNED_IN.
 * Each provider must be enabled in Supabase (Auth → Providers) and the return URL allowed
 * in Auth → URL Configuration → Redirect URLs.
 */
export async function signInWithProvider(provider: OAuthProvider, returnPath: string): Promise<AuthResult> {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}${returnPath}` },
        });
        return { error: error ? { code: "other", message: error.message } : null };
    } catch (err) {
        return { error: { code: "unreachable", message: String(err) } };
    }
}

/** Save body data to the signed-in Supabase user (used after Google / Apple sign-up). */
export async function saveProfileMetadata(profile: Partial<SignUpProfile>): Promise<void> {
    try {
        await withTimeout(supabase.auth.updateUser({ data: profile }));
    } catch (err) {
        console.warn("Could not save profile to Supabase:", err);
    }
}
