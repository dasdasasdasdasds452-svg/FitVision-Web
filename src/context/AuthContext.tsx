"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { accountIdFor, getUserItem, setStorageAccount, setUserItem } from "@/lib/userStorage";
import { syncHistory } from "@/lib/cloudSync";
import { publishMyStats } from "@/lib/friends";

interface AuthContextType {
    isLoggedIn: boolean;
    user: User | null;
    logout: () => Promise<void>;
    loginAsDemo: () => void;
    loginWithEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
    id: "demo-user-id",
    app_metadata: {},
    user_metadata: { name: "FitVision Athlete" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "athlete@fitvision.ai",
} as User;

function createEmailUser(email: string): User {
    const cleanEmail = email.trim().toLowerCase();
    const username = cleanEmail.split("@")[0] || "Athlete";
    return {
        id: "user-" + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12),
        app_metadata: {},
        user_metadata: { name: username },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: cleanEmail,
    } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const isLoggedOutInit = typeof window !== "undefined" && localStorage.getItem("fitvision_logged_out") === "true";
    const savedEmailInit = typeof window !== "undefined" ? localStorage.getItem("fitvision_user_email") : null;
    
    const [isLoggedIn, setIsLoggedIn] = useState(!isLoggedOutInit);
    const [user, setUser] = useState<User | null>(
        isLoggedOutInit 
            ? null 
            : (savedEmailInit ? createEmailUser(savedEmailInit) : DEMO_USER)
    );
    const router = useRouter();
    const pathname = usePathname();

    const loginAsDemo = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("fitvision_logged_out");
            localStorage.removeItem("fitvision_user_email");
            localStorage.setItem("fitvision_demo_user", "true");
            window.dispatchEvent(new Event("profileUpdated"));
        }
        setIsLoggedIn(true);
        setUser(DEMO_USER);
        if (pathname === "/login") {
            router.push("/");
        }
    };

    const loginWithEmail = (userEmail: string) => {
        const cleanEmail = userEmail.trim().toLowerCase();
        const username = cleanEmail.split("@")[0] || "Athlete";
        const emailUser = createEmailUser(cleanEmail);

        if (typeof window !== "undefined") {
            localStorage.removeItem("fitvision_logged_out");
            localStorage.setItem("fitvision_user_email", cleanEmail);
            // Default display name for a new account only — never overwrite one the user chose.
            const account = accountIdFor(emailUser);
            setStorageAccount(account);
            if (!getUserItem("fitvision_display_name")) setUserItem("fitvision_display_name", username, account);
            window.dispatchEvent(new Event("profileUpdated"));
            window.dispatchEvent(new Event("avatarUpdated"));
        }

        setIsLoggedIn(true);
        setUser(emailUser);
        router.push("/");
    };

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const isExplicitlyLoggedOut = typeof window !== "undefined" && localStorage.getItem("fitvision_logged_out") === "true";
            if (isExplicitlyLoggedOut) {
                if (!isMounted) return;
                setIsLoggedIn(false);
                setUser(null);
                if (pathname !== "/login") {
                    router.push("/login");
                }
                return;
            }

            if (!isSupabaseConfigured) {
                // Local/demo mode: no auth server to ask.
                const savedEmail = localStorage.getItem("fitvision_user_email");
                setIsLoggedIn(true);
                setUser(savedEmail ? createEmailUser(savedEmail) : DEMO_USER);
                return;
            }

            try {
                // Short timeout race: if Supabase is offline or paused, don't block the app
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, error: null }), 600)
                );
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

                if (!isMounted) return;

                if (session?.user) {
                    setIsLoggedIn(true);
                    setUser(session.user);
                } else {
                    // Default to saved email user if previously logged in with email, otherwise Demo user
                    const savedEmail = typeof window !== "undefined" ? localStorage.getItem("fitvision_user_email") : null;
                    setIsLoggedIn(true);
                    setUser(savedEmail ? createEmailUser(savedEmail) : DEMO_USER);
                }
            } catch (err) {
                console.warn("Supabase unreachable/offline, running in Demo mode:", err);
                if (isMounted) {
                    const savedEmail = typeof window !== "undefined" ? localStorage.getItem("fitvision_user_email") : null;
                    setIsLoggedIn(true);
                    setUser(savedEmail ? createEmailUser(savedEmail) : DEMO_USER);
                }
            }
        };

        checkSession();

        if (!isSupabaseConfigured) {
            return () => {
                isMounted = false;
            };
        }

        try {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (!isMounted) return;
                if (session?.user) {
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("fitvision_logged_out");
                    }
                    setIsLoggedIn(true);
                    setUser(session.user);
                    if (event === "SIGNED_IN" && pathname === "/login") {
                        router.push("/");
                    }
                }
            });

            return () => {
                isMounted = false;
                subscription?.unsubscribe();
            };
        } catch {
            return () => {
                isMounted = false;
            };
        }
    }, [pathname, router]);

    const logout = async () => {
        // 1. Immediately record logout in localStorage & clear cache
        if (typeof window !== "undefined") {
            localStorage.removeItem("fitvision_demo_user");
            localStorage.setItem("fitvision_logged_out", "true");
            sessionStorage.clear();
        }

        // 2. Immediately update state
        setIsLoggedIn(false);
        setUser(null);

        // 3. Immediately redirect to login
        router.push("/login");

        // 4. Background fire-and-forget signOut with short timeout
        if (!isSupabaseConfigured) return;
        try {
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 200));
            await Promise.race([signOutPromise, timeoutPromise]);
        } catch {
            // Ignore offline signOut error
        }
    };

    // Cloud backup + friends' weekly totals. Runs per account; syncHistory/publishMyStats
    // check for a real Supabase session themselves, so demo / email-only users stay on this device.
    // (After a password sign-in the user object is the local email user, but the Supabase session exists.)
    const [syncVersion, setSyncVersion] = useState(0);
    const syncAccount = isSupabaseConfigured && user && user.id !== "demo-user-id" ? accountIdFor(user) : null;
    useEffect(() => {
        if (!syncAccount) return;
        let cancelled = false;
        syncHistory()
            .then((r) => {
                // Sessions arrived from another device: reload pages, but never in the middle of a workout.
                if (!cancelled && r && r.pulled > 0 && !window.location.pathname.startsWith("/camera")) setSyncVersion((v) => v + 1);
                return publishMyStats();
            })
            .catch((err) => console.warn("Cloud sync failed:", err));
        return () => {
            cancelled = true;
        };
    }, [syncAccount]);

    // Point per-account storage at the current user before any page reads it,
    // and remount pages when the account changes so they reload that account's data.
    const account = accountIdFor(user);
    setStorageAccount(account);

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, logout, loginAsDemo, loginWithEmail }}>
            <React.Fragment key={`${account ?? "signed-out"}:${syncVersion}`}>{children}</React.Fragment>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
