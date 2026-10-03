// Ghost rep: remember the cleanest rep you've done for each exercise and replay it
// as a see-through skeleton next to you, matched to how deep you are right now.
// Pure logic + a tiny canvas helper — no React here, so it is easy to test.

import type { ExerciseId } from "@/lib/workoutStore";
import { getUserItem, setUserItem } from "@/lib/userStorage";

interface Landmark { x: number; y: number; visibility?: number }

/** Body landmarks the ghost keeps (shoulders → feet). Face and hands are dropped. */
export const GHOST_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32] as const;

/** Bones drawn between GHOST_JOINTS (MediaPipe indices). */
export const GHOST_BONES: [number, number][] = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
    [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

const MAX_FRAMES = 40;
/** A rep must be at least this clean (0–100) to become the ghost. */
export const GHOST_MIN_QUALITY = 80;

export interface GhostFrame {
    /** Rep-tracking angle (knee for squat, hip for deadlift, elbow for bench). */
    a: number;
    /** GHOST_JOINTS positions relative to the hip centre, in torso lengths, pixel-aspect corrected. */
    p: [number, number][];
}

export interface GhostRep {
    exerciseId: ExerciseId;
    /** % of frames in the rep with good form and no body-part warning. */
    quality: number;
    /** Lowest angle reached — deeper is better when quality ties. */
    bottom: number;
    /** +1 when the person faced right in the image (toes to the right of heels), −1 left, 0 unknown. */
    facing: number;
    recordedAt: string;
    frames: GhostFrame[];
}

const STORAGE_KEY = "fitvision_ghost_reps";

export function loadGhost(exerciseId: ExerciseId): GhostRep | null {
    try {
        const all = JSON.parse(getUserItem(STORAGE_KEY) || "{}") as Partial<Record<ExerciseId, GhostRep>>;
        const g = all[exerciseId];
        return g && Array.isArray(g.frames) && g.frames.length >= 3 ? g : null;
    } catch {
        return null;
    }
}

export function saveGhost(rep: GhostRep): void {
    let all: Partial<Record<ExerciseId, GhostRep>> = {};
    try {
        all = JSON.parse(getUserItem(STORAGE_KEY) || "{}");
    } catch {
        all = {};
    }
    all[rep.exerciseId] = rep;
    setUserItem(STORAGE_KEY, JSON.stringify(all));
}

/** Is `candidate` worth replacing `current` with? Cleaner wins; on a tie, the deeper / newer one. */
export function isBetterGhost(candidate: GhostRep, current: GhostRep | null): boolean {
    if (candidate.quality < GHOST_MIN_QUALITY) return false;
    if (!current) return true;
    if (candidate.quality !== current.quality) return candidate.quality > current.quality;
    return candidate.bottom <= current.bottom + 5;
}

/** Hip centre + torso length in pixels, or null when the body isn't visible enough. */
function bodyFrame(lm: Landmark[], w: number, h: number): { ax: number; ay: number; torso: number } | null {
    const need = [11, 12, 23, 24];
    if (need.some((i) => !lm[i] || (lm[i].visibility ?? 1) < 0.5)) return null;
    const ax = ((lm[23].x + lm[24].x) / 2) * w;
    const ay = ((lm[23].y + lm[24].y) / 2) * h;
    const sx = ((lm[11].x + lm[12].x) / 2) * w;
    const sy = ((lm[11].y + lm[12].y) / 2) * h;
    const torso = Math.hypot(sx - ax, sy - ay);
    return torso > 10 ? { ax, ay, torso } : null;
}

/** Which way the person faces in the image, from heel → toe. */
export function facingOf(lm: Landmark[], w: number): number {
    if (!lm[29] || !lm[31] || !lm[30] || !lm[32]) return 0;
    const dx = ((lm[31].x - lm[29].x) + (lm[32].x - lm[30].x)) / 2 * w;
    const shoulder = lm[11] && lm[12] ? Math.abs(lm[11].x - lm[12].x) * w : 0;
    // Front-on, the feet point at the camera and dx is tiny.
    if (Math.abs(dx) < Math.max(8, shoulder * 0.25)) return 0;
    return dx > 0 ? 1 : -1;
}

export function toGhostFrame(lm: Landmark[], angle: number, w: number, h: number): GhostFrame | null {
    const f = bodyFrame(lm, w, h);
    if (!f) return null;
    const p = GHOST_JOINTS.map((i) => {
        const q = lm[i];
        return [
            Math.round(((q.x * w - f.ax) / f.torso) * 1000) / 1000,
            Math.round(((q.y * h - f.ay) / f.torso) * 1000) / 1000,
        ] as [number, number];
    });
    return { a: Math.round(angle * 10) / 10, p };
}

function downsample<T>(list: T[], max: number): T[] {
    if (list.length <= max) return list;
    const out: T[] = [];
    for (let i = 0; i < max; i++) out.push(list[Math.round((i * (list.length - 1)) / (max - 1))]);
    return out;
}

/**
 * Collects frames for the rep in progress. Call `push` every tracked frame and
 * `completeRep` when the rep counter goes up; it returns the rep as a ghost candidate.
 */
export class RepRecorder {
    private frames: { f: GhostFrame; clean: boolean; facing: number }[] = [];

    constructor(private exerciseId: ExerciseId, private upThreshold: number) {}

    reset(): void {
        this.frames = [];
    }

    push(lm: Landmark[], angle: number, clean: boolean, w: number, h: number): void {
        const f = toGhostFrame(lm, angle, w, h);
        if (!f) return;
        const entry = { f, clean, facing: facingOf(lm, w) };
        // While standing at the top before the rep starts, keep only the latest frame.
        if (angle >= this.upThreshold && this.frames.length === 1 && this.frames[0].f.a >= this.upThreshold) {
            this.frames[0] = entry;
        } else {
            this.frames.push(entry);
        }
        if (this.frames.length > 600) this.frames.shift(); // ~20 s at 30 fps — a stuck rep, drop the oldest
    }

    completeRep(now: Date = new Date()): GhostRep | null {
        const frames = this.frames;
        this.frames = [];
        if (frames.length < 6) return null;
        const votes = frames.reduce((n, x) => n + x.facing, 0);
        const quality = Math.round((frames.filter((x) => x.clean).length / frames.length) * 100);
        const bottom = Math.min(...frames.map((x) => x.f.a));
        return {
            exerciseId: this.exerciseId,
            quality,
            bottom,
            facing: votes > 2 ? 1 : votes < -2 ? -1 : 0,
            recordedAt: now.toISOString(),
            frames: downsample(frames.map((x) => x.f), MAX_FRAMES),
        };
    }
}

/**
 * The ghost pose that matches where the person is in their rep: same direction
 * (going down vs coming up) and the closest rep angle.
 */
export function matchGhostFrame(ghost: GhostRep, angle: number, goingDown: boolean): GhostFrame {
    const frames = ghost.frames;
    let bottomIdx = 0;
    frames.forEach((f, i) => { if (f.a < frames[bottomIdx].a) bottomIdx = i; });
    const from = goingDown ? 0 : bottomIdx;
    const to = goingDown ? bottomIdx : frames.length - 1;
    let best = frames[from];
    for (let i = from; i <= to; i++) {
        if (Math.abs(frames[i].a - angle) < Math.abs(best.a - angle)) best = frames[i];
    }
    return best;
}

/** Draw the ghost skeleton anchored to the person's hips and scaled to their torso. */
export function drawGhost(
    ctx: CanvasRenderingContext2D,
    ghost: GhostRep,
    lm: Landmark[],
    angle: number,
    goingDown: boolean,
    w: number,
    h: number,
): boolean {
    const f = bodyFrame(lm, w, h);
    if (!f) return false;
    const frame = matchGhostFrame(ghost, angle, goingDown);
    const facingNow = facingOf(lm, w);
    const flip = ghost.facing !== 0 && facingNow !== 0 && facingNow !== ghost.facing ? -1 : 1;
    const pos = new Map<number, [number, number]>();
    GHOST_JOINTS.forEach((j, i) => {
        const [rx, ry] = frame.p[i];
        pos.set(j, [f.ax + rx * flip * f.torso, f.ay + ry * f.torso]);
    });
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#7DD3FC";
    ctx.lineWidth = Math.max(3, f.torso / 25);
    ctx.lineCap = "round";
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    for (const [a, b] of GHOST_BONES) {
        const pa = pos.get(a);
        const pb = pos.get(b);
        if (!pa || !pb) continue;
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#7DD3FC";
    for (const [x, y] of pos.values()) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(3, f.torso / 30), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    return true;
}
