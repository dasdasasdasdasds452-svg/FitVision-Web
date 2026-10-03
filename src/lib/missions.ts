// Fix-it missions: turn the most common mistake into a goal ("3 clean sets"),
// track it across sessions, and award a badge when it's done.

import type { ExerciseId, WorkoutSession } from "@/lib/workoutStore";
import { errorKey } from "@/lib/workoutStore";
import { getUserItem, setUserItem } from "@/lib/userStorage";

export const MISSION_TARGET = 3;

export interface Mission {
    id: string;
    exerciseId: ExerciseId;
    /** errorKey of the mistake to fix (issueKey or title). */
    key: string;
    /** Display title captured when the mission started. */
    label: string;
    target: number;
    startedAt: string;
    completedAt?: string;
}

export interface MissionState {
    active: Mission | null;
    completed: Mission[];
    skipped: string[];
}

const EMPTY: MissionState = { active: null, completed: [], skipped: [] };

export function loadMissions(): MissionState {
    try {
        const raw = JSON.parse(getUserItem("fitvision_missions") || "null");
        if (!raw || typeof raw !== "object") return { ...EMPTY };
        return {
            active: raw.active ?? null,
            completed: Array.isArray(raw.completed) ? raw.completed : [],
            skipped: Array.isArray(raw.skipped) ? raw.skipped : [],
        };
    } catch {
        return { ...EMPTY };
    }
}

export function saveMissions(state: MissionState): void {
    setUserItem("fitvision_missions", JSON.stringify(state));
}

const missionScope = (exerciseId: ExerciseId, key: string) => `${exerciseId}::${key}`;

/** Sessions that count toward a mission: same exercise, after it started, with reps and a score. */
function relevant(m: Mission, sessions: WorkoutSession[]): WorkoutSession[] {
    const start = new Date(m.startedAt).getTime();
    return sessions.filter(
        (s) => s.exerciseId === m.exerciseId && new Date(s.timestamp).getTime() >= start && s.completedReps > 0 && s.avgScore !== null,
    );
}

export const isCleanFor = (m: Pick<Mission, "key">, s: WorkoutSession) => !s.errors.some((e) => errorKey(e) === m.key);

export interface MissionProgress {
    done: number;
    target: number;
    complete: boolean;
}

export function missionProgress(m: Mission, sessions: WorkoutSession[]): MissionProgress {
    const done = relevant(m, sessions).filter((s) => isCleanFor(m, s)).length;
    return { done: Math.min(done, m.target), target: m.target, complete: done >= m.target };
}

/** The mistake that showed up in the most recent sessions, ignoring ones already handled. */
function pickTarget(sessions: WorkoutSession[], exclude: Set<string>): Omit<Mission, "id" | "startedAt" | "target"> | null {
    const counts = new Map<string, { n: number; exerciseId: ExerciseId; label: string; latest: number }>();
    sessions.slice(0, 6).forEach((s, idx) => {
        const seen = new Set<string>();
        for (const e of s.errors) {
            const key = errorKey(e);
            const scope = missionScope(s.exerciseId, key);
            if (!key || seen.has(scope) || exclude.has(scope)) continue;
            seen.add(scope);
            const prev = counts.get(scope);
            counts.set(scope, { n: (prev?.n ?? 0) + 1, exerciseId: s.exerciseId, label: prev?.label ?? e.title, latest: Math.min(prev?.latest ?? idx, idx) });
        }
    });
    let best: { scope: string; n: number; exerciseId: ExerciseId; label: string; latest: number } | null = null;
    for (const [scope, v] of counts) {
        if (!best || v.n > best.n || (v.n === best.n && v.latest < best.latest)) best = { scope, ...v };
    }
    if (!best) return null;
    return { exerciseId: best.exerciseId, key: best.scope.split("::").slice(1).join("::"), label: best.label };
}

export interface MissionUpdate {
    state: MissionState;
    /** Set when the active mission was completed by this update. */
    justCompleted: Mission | null;
}

/**
 * Bring the mission state up to date with the history (newest first):
 * complete the active mission if it's done, then start a new one if needed.
 */
export function refreshMissions(state: MissionState, sessions: WorkoutSession[], now: Date = new Date()): MissionUpdate {
    let next: MissionState = { active: state.active, completed: [...state.completed], skipped: [...state.skipped] };
    let justCompleted: Mission | null = null;

    if (next.active && missionProgress(next.active, sessions).complete) {
        justCompleted = { ...next.active, completedAt: now.toISOString() };
        next = { ...next, active: null, completed: [justCompleted, ...next.completed] };
    }

    if (!next.active) {
        const exclude = new Set<string>([
            ...next.skipped,
            // A fixed mistake can come back later; only exclude ones fixed in the last 2 weeks.
            ...next.completed
                .filter((m) => now.getTime() - new Date(m.completedAt ?? m.startedAt).getTime() < 14 * 864e5)
                .map((m) => missionScope(m.exerciseId, m.key)),
        ]);
        const target = pickTarget(sessions, exclude);
        if (target) {
            next.active = { ...target, id: `m${now.getTime()}`, target: MISSION_TARGET, startedAt: now.toISOString() };
        }
    }
    return { state: next, justCompleted };
}

export function skipActiveMission(state: MissionState): MissionState {
    if (!state.active) return state;
    return { ...state, active: null, skipped: [...state.skipped, missionScope(state.active.exerciseId, state.active.key)] };
}
