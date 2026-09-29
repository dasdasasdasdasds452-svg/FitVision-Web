"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
    isLoggedIn: boolean;
    user: User | null;
    logout: () => Promise<void>;
    loginAsDemo: () => void;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const isLoggedOutInit = typeof window !== "undefined" && localStorage.getItem("fitvision_logged_out") === "true";
    const [isLoggedIn, setIsLoggedIn] = useState(!isLoggedOutInit);
    const [user, setUser] = useState<User | null>(isLoggedOutInit ? null : DEMO_USER);
    const router = useRouter();
    const pathname = usePathname();

    const loginAsDemo = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("fitvision_logged_out");
            localStorage.setItem("fitvision_demo_user", "true");
        }
        setIsLoggedIn(true);
        setUser(DEMO_USER);
        if (pathname === "/login") {
            router.push("/");
        }
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
                    // Default to Demo user so dashboard and all features are immediately accessible
                    setIsLoggedIn(true);
                    setUser(DEMO_USER);
                }
            } catch (err) {
                console.warn("Supabase unreachable/offline, running in Demo mode:", err);
                if (isMounted) {
                    setIsLoggedIn(true);
                    setUser(DEMO_USER);
                }
            }
        };

        checkSession();

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
        try {
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 200));
            await Promise.race([signOutPromise, timeoutPromise]);
        } catch {
            // Ignore offline signOut error
        }
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, logout, loginAsDemo }}>
            {children}
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
