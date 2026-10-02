// ─── Workout session storage (localStorage history + current session in sessionStorage) ───
// One place for reading/writing workout data so every page agrees on the shape.
// History is stored per account (see userStorage.ts).

import { scopedKey } from "@/lib/userStorage";

export type ExerciseId = "benchpress" | "squat" | "deadlift";
export const EXERCISE_IDS: ExerciseId[] = ["benchpress", "squat", "deadlift"];

export interface ErrorRecord {
    /** Blob URL of the auto-captured clip. Only valid in the browser tab that recorded it. */
    url?: string;
    title: string;
    detail: string;
    time: string;
    elapsedSeconds?: number;
    elapsedFormatted?: string;
    repNumber?: number;
    riskLevel?: string;
    riskScore?: number;
    riskLabelTh?: string;
    riskColor?: string;
    riskFactors?: string[];
    recommendation?: string;
    exercise?: string;
}

export interface WorkoutSession {
    id: string;
    exerciseId: ExerciseId;
    /** Display name at the time of recording (kept for older records / Supabase). */
    exercise: string;
    /** null = the AI server never returned a score during this session. */
    avgScore: number | null;
    errorCount: number;
    completedReps: number;
    repGoal: number;
    timestamp: string;
    errors: ErrorRecord[];
    aiAdvice?: string;
}

const SESSION_KEY = "fitvision_session_stats";
const ERRORS_KEY = "fitvision_errors";
const FRESH_KEY = "fitvision_session_fresh";
const MAX_HISTORY = 50;

/** Map any stored exercise value (id, English or Thai display name) to an id. */
export function toExerciseId(value: unknown): ExerciseId {
    const v = String(value ?? "").toLowerCase().replace(/\s+/g, "");
    if (v.includes("squat") || v.includes("สควอท")) return "squat";
    if (v.includes("dead") || v.includes("เดดลิฟต์")) return "deadlift";
    return "benchpress";
}

function toNumber(value: unknown, fallback: number): number {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function readJSON<T>(storage: Storage | undefined, key: string, fallback: T): T {
    if (!storage) return fallback;
    try {
        const raw = storage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(storage: Storage | undefined, key: string, value: unknown): boolean {
    if (!storage) return false;
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        // Quota exceeded or storage disabled (private mode) — the app keeps working without it.
        return false;
    }
}

const local = (): Storage | undefined => (typeof window !== "undefined" ? window.localStorage : undefined);
const session = (): Storage | undefined => (typeof window !== "undefined" ? window.sessionStorage : undefined);

function normalizeError(raw: unknown): ErrorRecord | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    return {
        url: typeof r.url === "string" && r.url ? r.url : undefined,
        title: String(r.title ?? ""),
        detail: String(r.detail ?? ""),
        time: String(r.time ?? ""),
        elapsedSeconds: r.elapsedSeconds === undefined ? undefined : toNumber(r.elapsedSeconds, 0),
        elapsedFormatted: typeof r.elapsedFormatted === "string" ? r.elapsedFormatted : undefined,
        repNumber: r.repNumber === undefined ? undefined : toNumber(r.repNumber, 0),
        riskLevel: typeof r.riskLevel === "string" ? r.riskLevel : undefined,
        riskScore: r.riskScore === undefined ? undefined : toNumber(r.riskScore, 0),
        riskLabelTh: typeof r.riskLabelTh === "string" ? r.riskLabelTh : undefined,
        riskColor: typeof r.riskColor === "string" ? r.riskColor : undefined,
        riskFactors: Array.isArray(r.riskFactors) ? r.riskFactors.map(String) : undefined,
        recommendation: typeof r.recommendation === "string" ? r.recommendation : undefined,
        exercise: typeof r.exercise === "string" ? r.exercise : undefined,
    };
}

export function normalizeSession(raw: unknown): WorkoutSession | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const errors = Array.isArray(r.errors)
        ? r.errors.map(normalizeError).filter((e): e is ErrorRecord => e !== null)
        : [];
    const ts = typeof r.timestamp === "number" ? new Date(r.timestamp).toISOString() : String(r.timestamp ?? "");
    const score = r.avgScore === null || r.avgScore === undefined ? null : toNumber(r.avgScore, NaN);
    return {
        id: String(r.id ?? ts),
        exerciseId: r.exerciseId ? toExerciseId(r.exerciseId) : toExerciseId(r.exercise),
        exercise: String(r.exercise ?? ""),
        avgScore: score === null || Number.isNaN(score) ? null : Math.round(score),
        errorCount: toNumber(r.errorCount, errors.length),
        completedReps: toNumber(r.completedReps, 0),
        repGoal: toNumber(r.repGoal, 0),
        timestamp: ts,
        errors,
        aiAdvice: typeof r.aiAdvice === "string" && r.aiAdvice ? r.aiAdvice : undefined,
    };
}

/** All saved sessions, newest first. */
export function loadHistory(): WorkoutSession[] {
    const raw = readJSON<unknown[]>(local(), scopedKey("fitvision_history"), []);
    if (!Array.isArray(raw)) return [];
    return raw
        .map(normalizeSession)
        .filter((s): s is WorkoutSession => s !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Clip URLs are blob: URLs that die with the tab, so they are not persisted. */
function forStorage(s: WorkoutSession): WorkoutSession {
    return { ...s, errors: s.errors.map(({ url: _url, ...rest }) => rest) };
}

export function saveSessionToHistory(s: WorkoutSession): void {
    const history = loadHistory().filter((h) => h.id !== s.id);
    history.unshift(forStorage(s));
    writeJSON(local(), scopedKey("fitvision_history"), history.slice(0, MAX_HISTORY));
}

export function updateSessionInHistory(id: string, patch: Partial<WorkoutSession>): void {
    const history = loadHistory();
    const idx = history.findIndex((h) => h.id === id);
    if (idx === -1) return;
    history[idx] = forStorage({ ...history[idx], ...patch });
    writeJSON(local(), scopedKey("fitvision_history"), history);
}

/** Make a session the one the Summary page shows. `fresh` = it was just recorded in this tab. */
export function setCurrentSession(s: WorkoutSession, fresh = false): void {
    writeJSON(session(), SESSION_KEY, s);
    writeJSON(session(), ERRORS_KEY, s.errors);
    const store = session();
    if (!store) return;
    try {
        if (fresh) store.setItem(FRESH_KEY, s.id);
        else store.removeItem(FRESH_KEY);
    } catch {
        /* ignore */
    }
}

export function loadCurrentSession(): { session: WorkoutSession | null; fresh: boolean } {
    const s = normalizeSession(readJSON<unknown>(session(), SESSION_KEY, null));
    if (!s) return { session: null, fresh: false };
    // Errors may have gained clip URLs after the session object was written.
    const errors = readJSON<unknown[]>(session(), ERRORS_KEY, []);
    if (Array.isArray(errors) && errors.length >= s.errors.length) {
        s.errors = errors.map(normalizeError).filter((e): e is ErrorRecord => e !== null);
    }
    let fresh = false;
    try {
        fresh = session()?.getItem(FRESH_KEY) === s.id;
    } catch {
        fresh = false;
    }
    return { session: s, fresh };
}

export function markCurrentSessionSeen(): void {
    try {
        session()?.removeItem(FRESH_KEY);
    } catch {
        /* ignore */
    }
}

// ─── Stats helpers ───

export function averageScore(sessions: WorkoutSession[]): number | null {
    const scored = sessions.filter((s) => s.avgScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / scored.length);
}

export function bestScore(sessions: WorkoutSession[]): number | null {
    const scored = sessions.filter((s) => s.avgScore !== null).map((s) => s.avgScore as number);
    return scored.length ? Math.max(...scored) : null;
}

export function totalReps(sessions: WorkoutSession[]): number {
    return sessions.reduce((sum, s) => sum + s.completedReps, 0);
}

export function sessionsSince(sessions: WorkoutSession[], days: number, now = Date.now()): WorkoutSession[] {
    const from = now - days * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.timestamp).getTime() >= from);
}

export interface FrequentError {
    title: string;
    exerciseId: ExerciseId;
    /** How many of the inspected sessions contained this error. */
    sessionCount: number;
    inspected: number;
}

/** The error that showed up in the most of the last `lookback` sessions. */
export function mostFrequentError(sessions: WorkoutSession[], lookback = 5): FrequentError | null {
    const recent = sessions.slice(0, lookback);
    const counts = new Map<string, { n: number; exerciseId: ExerciseId }>();
    for (const s of recent) {
        const titles = new Set(s.errors.map((e) => e.title).filter(Boolean));
        for (const title of titles) {
            const key = `${s.exerciseId}::${title}`;
            const prev = counts.get(key);
            counts.set(key, { n: (prev?.n ?? 0) + 1, exerciseId: s.exerciseId });
        }
    }
    let best: FrequentError | null = null;
    for (const [key, v] of counts) {
        if (!best || v.n > best.sessionCount) {
            best = { title: key.split("::")[1], exerciseId: v.exerciseId, sessionCount: v.n, inspected: recent.length };
        }
    }
    return best;
}

/** Group error titles of one session, most frequent first. */
export function groupErrors(errors: ErrorRecord[]): [string, number][] {
    const counts: Record<string, number> = {};
    errors.forEach((e) => {
        counts[e.title] = (counts[e.title] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function cameraHref(exerciseId: ExerciseId, reps: number): string {
    return `/camera?model=${exerciseId}&reps=${Math.max(1, Math.round(reps) || 12)}`;
}
