// Cloud backup of workout history in Supabase, so streaks and missions survive a new phone.
// Runs only when Supabase is configured AND the user signed in with a real Supabase account.
// Table + row-level security: see supabase/migrations/001_fitvision_sessions.sql

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getStorageAccount } from "@/lib/userStorage";
import { WorkoutSession, loadHistory, normalizeSession, replaceHistory } from "@/lib/workoutStore";

const TABLE = "fitvision_sessions";

/**
 * Supabase user id — but only when that Supabase session belongs to the account whose
 * local data is open, so one person's history is never uploaded into another's cloud rows.
 */
export async function currentCloudUser(): Promise<{ id: string; email: string | null } | null> {
    if (!isSupabaseConfigured) return null;
    try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) return null;
        const account = getStorageAccount();
        const email = user.email?.trim().toLowerCase() ?? null;
        if (account && email && account !== email) return null;
        return { id: user.id, email };
    } catch {
        return null;
    }
}

async function currentUserId(): Promise<string | null> {
    return (await currentCloudUser())?.id ?? null;
}

/** Strip clip URLs (they only live in the recording tab) before uploading. */
const forCloud = (s: WorkoutSession) => ({ ...s, errors: s.errors.map(({ url: _url, ...rest }) => rest) });

export async function pushSession(session: WorkoutSession): Promise<boolean> {
    const userId = await currentUserId();
    if (!userId) return false;
    const { error } = await supabase.from(TABLE).upsert({
        id: session.id,
        user_id: userId,
        data: forCloud(session),
        updated_at: new Date().toISOString(),
    });
    if (error) console.warn("Cloud sync (push) failed:", error.message);
    return !error;
}

/**
 * Union of local and cloud sessions by id. The local copy wins on conflict
 * (it may have newer fields such as cached AI advice). Newest first.
 */
export function mergeSessions(local: WorkoutSession[], cloud: WorkoutSession[]): WorkoutSession[] {
    const byId = new Map<string, WorkoutSession>();
    for (const s of cloud) byId.set(s.id, s);
    for (const s of local) byId.set(s.id, { ...byId.get(s.id), ...s });
    return [...byId.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Download the user's sessions, merge with this device, and upload anything the cloud lacks. */
export async function syncHistory(): Promise<{ pulled: number; pushed: number } | null> {
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await supabase.from(TABLE).select("id, data").eq("user_id", userId);
    if (error) {
        console.warn("Cloud sync (pull) failed:", error.message);
        return null;
    }
    const cloud = (data ?? [])
        .map((row: { data: unknown }) => normalizeSession(row.data))
        .filter((s: WorkoutSession | null): s is WorkoutSession => s !== null);
    const local = loadHistory();
    const merged = mergeSessions(local, cloud);
    replaceHistory(merged);

    const cloudIds = new Set(cloud.map((s: WorkoutSession) => s.id));
    const missing = local.filter((s) => !cloudIds.has(s.id));
    if (missing.length) {
        const rows = missing.map((s) => ({ id: s.id, user_id: userId, data: forCloud(s), updated_at: new Date().toISOString() }));
        const { error: upErr } = await supabase.from(TABLE).upsert(rows);
        if (upErr) console.warn("Cloud sync (backfill) failed:", upErr.message);
    }
    return { pulled: cloud.filter((s: WorkoutSession) => !local.some((l) => l.id === s.id)).length, pushed: missing.length };
}
