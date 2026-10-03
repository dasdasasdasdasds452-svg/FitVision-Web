// Friends: a 6-character friend code + a weekly leaderboard.
// Only a display name and weekly totals are shared (see supabase/migrations/002_fitvision_friends.sql);
// sessions, videos and mistakes never leave the user's own rows.

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentCloudUser } from "@/lib/cloudSync";
import { currentStreak, startOfWeek } from "@/lib/progress";
import { getUserItem } from "@/lib/userStorage";
import { WorkoutSession, loadHistory } from "@/lib/workoutStore";

const PROFILES = "fitvision_profiles";
const FRIENDSHIPS = "fitvision_friendships";

/** No I, O, 0, 1 — easy to read aloud and type. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeCode(input: string): string {
    // Codes never contain I, O, 0 or 1, so those are left for CODE_RE to reject.
    return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function generateCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
    const bytes = random(6);
    // 256 % 32 === 0, so a plain modulo has no bias.
    return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Local calendar date, e.g. "2026-09-28". */
export function isoDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface WeekStats {
    week_start: string;
    week_days: number;
    week_sets: number;
    week_avg: number | null;
    streak: number;
    last_trained: string | null;
}

/** What gets shared with friends: this week's totals and the current streak. */
export function weekStats(sessions: WorkoutSession[], now: Date = new Date()): WeekStats {
    const start = startOfWeek(now);
    const thisWeek = sessions.filter((s) => {
        const t = new Date(s.timestamp);
        return t >= start && t <= now;
    });
    const scored = thisWeek.filter((s) => s.avgScore !== null);
    const latest = sessions.reduce<Date | null>((acc, s) => {
        const t = new Date(s.timestamp);
        return t <= now && (!acc || t > acc) ? t : acc;
    }, null);
    return {
        week_start: isoDay(start),
        week_days: new Set(thisWeek.map((s) => isoDay(new Date(s.timestamp)))).size,
        week_sets: thisWeek.reduce((n, s) => n + Math.max(1, s.sets?.length ?? 1), 0),
        week_avg: scored.length ? Math.round(scored.reduce((a, s) => a + (s.avgScore ?? 0), 0) / scored.length) : null,
        streak: currentStreak(sessions, now).days,
        last_trained: latest ? isoDay(latest) : null,
    };
}

export interface FriendProfile extends WeekStats {
    user_id: string;
    friend_code: string;
    display_name: string;
    updated_at?: string;
}

export interface BoardRow {
    userId: string;
    name: string;
    isMe: boolean;
    days: number;
    sets: number;
    avg: number | null;
    streak: number;
}

/**
 * Leaderboard for the current week. Totals published in an earlier week count as zero,
 * and a streak only counts if the friend trained today or yesterday.
 */
export function rankBoard(profiles: FriendProfile[], myId: string, now: Date = new Date()): BoardRow[] {
    const week = isoDay(startOfWeek(now));
    const today = isoDay(now);
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterday = isoDay(y);
    return profiles
        .map((p) => {
            const current = p.week_start === week;
            const alive = p.last_trained === today || p.last_trained === yesterday;
            return {
                userId: p.user_id,
                name: p.display_name,
                isMe: p.user_id === myId,
                days: current ? p.week_days : 0,
                sets: current ? p.week_sets : 0,
                avg: current ? p.week_avg : null,
                streak: alive ? p.streak : 0,
            };
        })
        .sort((a, b) => b.days - a.days || b.sets - a.sets || (b.avg ?? -1) - (a.avg ?? -1) || Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}

export type FriendsAvailability = { status: "ok"; userId: string; email: string | null } | { status: "not_configured" } | { status: "no_account" };

export async function friendsAvailability(): Promise<FriendsAvailability> {
    if (!isSupabaseConfigured) return { status: "not_configured" };
    const user = await currentCloudUser();
    return user ? { status: "ok", userId: user.id, email: user.email } : { status: "no_account" };
}

function myDisplayName(email: string | null): string {
    const name = (getUserItem("fitvision_display_name") || email?.split("@")[0] || "Athlete").trim();
    return name.slice(0, 40) || "Athlete";
}

/** Create my profile (with a fresh friend code) or refresh its weekly totals. */
export async function publishMyStats(): Promise<FriendProfile | null> {
    const a = await friendsAvailability();
    if (a.status !== "ok") return null;
    const stats = weekStats(loadHistory());
    const display_name = myDisplayName(a.email);
    const updated_at = new Date().toISOString();

    const { data: existing, error: readErr } = await supabase.from(PROFILES).select("*").eq("user_id", a.userId).maybeSingle();
    if (readErr) {
        console.warn("Friends: profile read failed:", readErr.message);
        return null;
    }
    if (existing) {
        const { data, error } = await supabase
            .from(PROFILES)
            .update({ ...stats, display_name, updated_at })
            .eq("user_id", a.userId)
            .select("*")
            .single();
        if (error) console.warn("Friends: profile update failed:", error.message);
        return (data as FriendProfile) ?? (existing as FriendProfile);
    }
    // New profile: retry on the (very unlikely) chance the code is taken.
    for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
            .from(PROFILES)
            .insert({ user_id: a.userId, friend_code: generateCode(), display_name, ...stats, updated_at })
            .select("*")
            .single();
        if (!error) return data as FriendProfile;
        if (error.code !== "23505") {
            console.warn("Friends: profile create failed:", error.message);
            return null;
        }
    }
    return null;
}

export type AddFriendResult = { status: "added" | "already"; name: string } | { status: "not_found" | "self" | "invalid" | "failed" };

export async function addFriend(rawCode: string): Promise<AddFriendResult> {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return { status: "invalid" };
    const { data, error } = await supabase.rpc("fitvision_add_friend", { code });
    if (error || !data) {
        console.warn("Friends: add failed:", error?.message);
        return { status: "failed" };
    }
    const r = data as { status: string; name?: string };
    if (r.status === "added" || r.status === "already") return { status: r.status, name: r.name ?? "" };
    if (r.status === "not_found" || r.status === "self") return { status: r.status };
    return { status: "failed" };
}

export async function removeFriend(friendId: string): Promise<boolean> {
    const { error } = await supabase.rpc("fitvision_remove_friend", { friend: friendId });
    if (error) console.warn("Friends: remove failed:", error.message);
    return !error;
}

/** My profile plus every friend's profile (row-level security only returns friends). */
export async function loadBoard(myId: string): Promise<FriendProfile[] | null> {
    const { data: links, error: linkErr } = await supabase.from(FRIENDSHIPS).select("friend_id").eq("user_id", myId);
    if (linkErr) {
        console.warn("Friends: list failed:", linkErr.message);
        return null;
    }
    const ids = [myId, ...((links ?? []) as { friend_id: string }[]).map((l) => l.friend_id)];
    const { data, error } = await supabase.from(PROFILES).select("*").in("user_id", ids);
    if (error) {
        console.warn("Friends: profiles failed:", error.message);
        return null;
    }
    return (data ?? []) as FriendProfile[];
}
