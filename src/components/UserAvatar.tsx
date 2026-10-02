"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserItem } from "@/lib/userStorage";

export interface Profile {
    name: string;
    avatar: string | null;
}

/** Display name + avatar saved in Settings, falling back to the signed-in user's name. */
export function useProfile(): Profile {
    const { user } = useAuth();
    const fallbackName =
        (user?.user_metadata?.name as string | undefined) || user?.email?.split("@")[0] || "";
    const [profile, setProfile] = useState<Profile>({ name: fallbackName, avatar: null });

    useEffect(() => {
        const read = () => {
            try {
                setProfile({
                    name: getUserItem("fitvision_display_name") || fallbackName,
                    avatar: getUserItem("fitvision_avatar"),
                });
            } catch {
                setProfile({ name: fallbackName, avatar: null });
            }
        };
        read();
        window.addEventListener("profileUpdated", read);
        window.addEventListener("avatarUpdated", read);
        return () => {
            window.removeEventListener("profileUpdated", read);
            window.removeEventListener("avatarUpdated", read);
        };
    }, [fallbackName]);

    return profile;
}

export default function UserAvatar({ profile, size = 40, className = "" }: { profile: Profile; size?: number; className?: string }) {
    const initial = (profile.name.trim()[0] || "?").toUpperCase();
    if (profile.avatar) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={profile.avatar}
                alt=""
                width={size}
                height={size}
                className={`rounded-full object-cover shrink-0 ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            className={`rounded-full bg-white/10 text-white font-semibold flex items-center justify-center shrink-0 ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
        >
            {initial}
        </span>
    );
}
