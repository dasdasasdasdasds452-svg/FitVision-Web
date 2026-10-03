// Motivation logic: streaks, weekly goal, personal bests. Pure functions — easy to test.

import type { ExerciseId, WorkoutSession } from "@/lib/workoutStore";
import { getUserItem, setUserItem } from "@/lib/userStorage";

export const DEFAULT_WEEKLY_GOAL = 3;

/** Local calendar day key, e.g. "2026-10-03". */
function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
}

/** Monday 00:00 of the week containing `now` (local time). */
export function startOfWeek(now: Date = new Date()): Date {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    return addDays(d, -offset);
}

export interface Streak {
    /** Consecutive days with at least one set, ending today (or yesterday if not trained yet today). */
    days: number;
    trainedToday: boolean;
}

export function currentStreak(sessions: WorkoutSession[], now: Date = new Date()): Streak {
    const days = new Set(sessions.map((s) => dayKey(new Date(s.timestamp))));
    const today = dayKey(now);
    const trainedToday = days.has(today);
    let cursor = trainedToday ? now : addDays(now, -1);
    let count = 0;
    while (days.has(dayKey(cursor))) {
        count += 1;
        cursor = addDays(cursor, -1);
    }
    return { days: count, trainedToday };
}

export interface WeekProgress {
    goal: number;
    /** Distinct days trained this week (Mon–Sun). */
    daysTrained: number;
    /** 7 flags, Monday first. */
    week: { trained: boolean; isToday: boolean; isFuture: boolean }[];
    reached: boolean;
}

export function weekProgress(sessions: WorkoutSession[], goal: number, now: Date = new Date()): WeekProgress {
    const start = startOfWeek(now);
    const days = new Set(sessions.map((s) => dayKey(new Date(s.timestamp))));
    const today = dayKey(now);
    const week = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        const k = dayKey(d);
        return { trained: days.has(k), isToday: k === today, isFuture: d.getTime() > now.getTime() && k !== today };
    });
    const daysTrained = week.filter((w) => w.trained).length;
    return { goal, daysTrained, week, reached: daysTrained >= goal };
}

export function loadWeeklyGoal(): number {
    const n = Number(getUserItem("fitvision_weekly_goal"));
    return Number.isFinite(n) && n >= 1 && n <= 7 ? Math.round(n) : DEFAULT_WEEKLY_GOAL;
}

export function saveWeeklyGoal(goal: number): void {
    setUserItem("fitvision_weekly_goal", String(Math.min(7, Math.max(1, Math.round(goal)))));
}

export type Achievement =
    | { kind: "first_session" }
    | { kind: "personal_best"; previous: number; score: number }
    | { kind: "perfect_set" }
    | { kind: "goal_reached"; goal: number }
    | { kind: "streak"; days: number };

/**
 * What a just-finished session earned, compared with the sessions before it.
 * `history` may already contain `session`; it is excluded by id.
 */
export function achievementsFor(session: WorkoutSession, history: WorkoutSession[], weeklyGoal: number): Achievement[] {
    const before = history.filter((h) => h.id !== session.id && new Date(h.timestamp) < new Date(session.timestamp));
    const out: Achievement[] = [];
    if (before.length === 0) out.push({ kind: "first_session" });

    if (session.avgScore !== null) {
        const prev = before
            .filter((h) => h.exerciseId === session.exerciseId && h.avgScore !== null)
            .map((h) => h.avgScore as number);
        if (prev.length > 0 && session.avgScore > Math.max(...prev)) {
            out.push({ kind: "personal_best", previous: Math.max(...prev), score: session.avgScore });
        }
    }
    if (session.errorCount === 0 && session.completedReps > 0 && session.avgScore !== null) {
        out.push({ kind: "perfect_set" });
    }

    const when = new Date(session.timestamp);
    const after = [...before, session];
    const wasReached = weekProgress(before, weeklyGoal, when).reached;
    if (!wasReached && weekProgress(after, weeklyGoal, when).reached) out.push({ kind: "goal_reached", goal: weeklyGoal });

    const streakBefore = currentStreak(before, when);
    const streakAfter = currentStreak(after, when);
    if (streakAfter.days >= 2 && streakAfter.days > streakBefore.days) out.push({ kind: "streak", days: streakAfter.days });

    return out;
}

/** Best score per exercise. */
export function personalBests(sessions: WorkoutSession[]): Partial<Record<ExerciseId, number>> {
    const out: Partial<Record<ExerciseId, number>> = {};
    for (const s of sessions) {
        if (s.avgScore === null) continue;
        out[s.exerciseId] = Math.max(out[s.exerciseId] ?? 0, s.avgScore);
    }
    return out;
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";
export function dayPart(now: Date = new Date()): DayPart {
    const h = now.getHours();
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 22) return "evening";
    return "night";
}

export interface WeekRecap {
    days: number;
    sessions: number;
    avgScore: number | null;
    /** Change vs the week before, in percentage points; null when either week has no score. */
    change: number | null;
}

/** Recap of the previous Mon–Sun week (shown early in the new week). */
export function lastWeekRecap(sessions: WorkoutSession[], now: Date = new Date()): WeekRecap | null {
    const thisWeek = startOfWeek(now);
    const lastStart = addDays(thisWeek, -7);
    const prevStart = addDays(thisWeek, -14);
    const inRange = (s: WorkoutSession, a: Date, b: Date) => {
        const t = new Date(s.timestamp).getTime();
        return t >= a.getTime() && t < b.getTime();
    };
    const last = sessions.filter((s) => inRange(s, lastStart, thisWeek));
    if (last.length === 0) return null;
    const prev = sessions.filter((s) => inRange(s, prevStart, lastStart));
    const avg = (list: WorkoutSession[]) => {
        const scored = list.filter((s) => s.avgScore !== null);
        return scored.length ? Math.round(scored.reduce((a, s) => a + (s.avgScore ?? 0), 0) / scored.length) : null;
    };
    const a = avg(last);
    const b = avg(prev);
    return {
        days: new Set(last.map((s) => dayKey(new Date(s.timestamp)))).size,
        sessions: last.length,
        avgScore: a,
        change: a !== null && b !== null ? a - b : null,
    };
}
