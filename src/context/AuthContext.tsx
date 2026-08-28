"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
    isLoggedIn: boolean;
    user: User | null;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Initial session check
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error("Auth session error:", error);
                }

                if (session?.user) {
                    setIsLoggedIn(true);
                    setUser(session.user);
                } else {
                    setIsLoggedIn(false);
                    setUser(null);
                    // Redirect logic
                    if (pathname !== "/login" && pathname !== "/tutorial") {
                        router.push("/login");
                    }
                }
            } catch (err) {
                console.error("Failed to get session", err);
            } finally {
                setIsReady(true);
            }
        };

        checkSession();

        // Listen for auth state changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setIsLoggedIn(true);
                setUser(session.user);
                // If they just logged in and are on the login page, redirect them
                if (event === 'SIGNED_IN' && pathname === "/login") {
                    router.push("/");
                }
            } else {
                setIsLoggedIn(false);
                setUser(null);
                if (pathname !== "/login" && pathname !== "/tutorial") {
                    router.push("/login");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [pathname, router]);

    const logout = async () => {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        setUser(null);
        sessionStorage.clear();
        router.push("/login");
    };

    if (!isReady) {
        // Prevent flashing the dashboard layout while checking auth status
        return <div className="min-h-screen bg-[#0a0f0a]"></div>;
    }

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, logout }}>
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
