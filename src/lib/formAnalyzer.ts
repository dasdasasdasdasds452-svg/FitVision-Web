// Explains WHERE the form is off — which body part, which side — from MediaPipe landmarks.
// Geometric rules (not the ML model), so each message can name a joint and a side.
// "left"/"right" are the lifter's own body sides (MediaPipe convention), not the screen's.

import type { Landmark } from "@/lib/poseUtils";
import { calculateAngle } from "@/lib/poseUtils";
import type { ExerciseId } from "@/lib/workoutStore";

export type Side = "left" | "right";
export type IssueCode =
    | "shoulder_hike"   // one shoulder higher than the other
    | "hip_drop"        // hips not level / shifting to one side
    | "knee_valgus"     // knee caving toward the midline
    | "leg_uneven"      // one knee bending less than the other
    | "arm_uneven"      // one arm extending / lowering less than the other
    | "heel_lift"       // heel coming off the floor
    | "torso_lean";     // chest dropping too far forward

export interface Issue {
    code: IssueCode;
    side: Side | null;
    /** Landmark indices to highlight on the skeleton. */
    joints: number[];
    /** 0–1, how far past the threshold. */
    severity: number;
}

// MediaPipe Pose indices
const L = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31 };
const R = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32 };

const MIN_VIS = 0.6;
const vis = (p: Landmark | undefined) => !!p && (p.visibility ?? 1) >= MIN_VIS;
const allVis = (lm: Landmark[], idx: number[]) => idx.every((i) => vis(lm[i]));
const mid = (a: Landmark, b: Landmark): Landmark => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
const sev = (value: number, threshold: number) => Math.min(1, Math.max(0, (value - threshold) / threshold));

/** Thresholds, relative to torso length so they work at any distance from the camera. */
export const THRESHOLDS = {
    shoulderHike: 0.12,  // × torso, vertical gap between shoulders
    hipDrop: 0.10,       // × torso, vertical gap between hips
    kneeValgus: 0.10,    // × torso, knee inside the ankle toward midline
    legUnevenDeg: 20,
    armUnevenDeg: 25,
    heelLift: 0.05,      // × torso, heel above toe
    torsoLeanDeg: 55,    // squat: chest angle from vertical at the bottom
    frontalRatio: 0.45,  // shoulder width / torso ≥ this → camera sees the front (left/right comparisons valid)
};

export function analyzePose(lm: Landmark[] | undefined, exercise: ExerciseId): Issue[] {
    if (!lm || lm.length < 33) return [];
    const issues: Issue[] = [];
    if (!allVis(lm, [L.shoulder, R.shoulder, L.hip, R.hip])) return issues;

    const torso = dist(mid(lm[L.shoulder], lm[R.shoulder]), mid(lm[L.hip], lm[R.hip]));
    if (torso < 0.05) return issues; // person too small / far away to judge
    const frontal = dist(lm[L.shoulder], lm[R.shoulder]) / torso >= THRESHOLDS.frontalRatio;

    const lKnee = calculateAngle(lm[L.hip], lm[L.knee], lm[L.ankle]);
    const rKnee = calculateAngle(lm[R.hip], lm[R.knee], lm[R.ankle]);
    const legsVisible = allVis(lm, [L.knee, R.knee, L.ankle, R.ankle]);
    const bending = legsVisible && Math.min(lKnee, rKnee) < 150;

    // ── Left/right comparisons only make sense when the camera sees the front ──
    if (frontal) {
        const dShoulder = lm[L.shoulder].y - lm[R.shoulder].y; // >0 → right shoulder is higher (y grows downward)
        if (Math.abs(dShoulder) > THRESHOLDS.shoulderHike * torso) {
            const side: Side = dShoulder > 0 ? "right" : "left";
            issues.push({ code: "shoulder_hike", side, joints: [side === "left" ? L.shoulder : R.shoulder], severity: sev(Math.abs(dShoulder) / torso, THRESHOLDS.shoulderHike) });
        }

        if (exercise !== "benchpress") {
            const dHip = lm[L.hip].y - lm[R.hip].y; // >0 → right hip higher → left hip dropped
            if (Math.abs(dHip) > THRESHOLDS.hipDrop * torso) {
                const side: Side = dHip > 0 ? "left" : "right"; // the side that dropped
                issues.push({ code: "hip_drop", side, joints: [side === "left" ? L.hip : R.hip], severity: sev(Math.abs(dHip) / torso, THRESHOLDS.hipDrop) });
            }
        }

        if (exercise === "squat" && bending) {
            const midX = (lm[L.hip].x + lm[R.hip].x) / 2;
            for (const [side, J] of [["left", L], ["right", R]] as const) {
                const toward = Math.sign(midX - lm[J.ankle].x) || 1;
                const inward = (lm[J.knee].x - lm[J.ankle].x) * toward;
                if (inward > THRESHOLDS.kneeValgus * torso) {
                    issues.push({ code: "knee_valgus", side, joints: [J.knee], severity: sev(inward / torso, THRESHOLDS.kneeValgus) });
                }
            }
        }

        if ((exercise === "squat" || exercise === "deadlift") && bending) {
            const diff = Math.abs(lKnee - rKnee);
            if (diff > THRESHOLDS.legUnevenDeg) {
                const side: Side = lKnee > rKnee ? "left" : "right"; // the straighter leg is doing less
                issues.push({ code: "leg_uneven", side, joints: [side === "left" ? L.knee : R.knee], severity: sev(diff, THRESHOLDS.legUnevenDeg) });
            }
        }
    }

    // ── Bench press: arms should move together (works from front or above) ──
    if (exercise === "benchpress" && allVis(lm, [L.elbow, R.elbow, L.wrist, R.wrist])) {
        const lEl = calculateAngle(lm[L.shoulder], lm[L.elbow], lm[L.wrist]);
        const rEl = calculateAngle(lm[R.shoulder], lm[R.elbow], lm[R.wrist]);
        const diff = Math.abs(lEl - rEl);
        if (diff > THRESHOLDS.armUnevenDeg) {
            const side: Side = lEl < rEl ? "left" : "right"; // the more bent arm is lagging
            issues.push({ code: "arm_uneven", side, joints: [side === "left" ? L.elbow : R.elbow], severity: sev(diff, THRESHOLDS.armUnevenDeg) });
        }
    }

    // ── Side-view checks: use whichever leg the camera sees ──
    if (exercise === "squat") {
        for (const [side, J] of [["left", L], ["right", R]] as const) {
            if (!allVis(lm, [J.heel, J.toe, J.knee])) continue;
            const kneeAngle = side === "left" ? lKnee : rKnee;
            if (kneeAngle > 140) continue; // only judge heels at the bottom
            const lift = lm[J.toe].y - lm[J.heel].y; // >0 → heel above toe
            if (lift > THRESHOLDS.heelLift * torso) {
                issues.push({ code: "heel_lift", side, joints: [J.heel], severity: sev(lift / torso, THRESHOLDS.heelLift) });
            }
        }
        if (!frontal && bending) {
            const hip = mid(lm[L.hip], lm[R.hip]);
            const sh = mid(lm[L.shoulder], lm[R.shoulder]);
            const lean = calculateAngle({ x: hip.x, y: hip.y - 1 }, hip, sh);
            if (lean > THRESHOLDS.torsoLeanDeg) {
                issues.push({ code: "torso_lean", side: null, joints: [L.shoulder, R.shoulder, L.hip, R.hip], severity: sev(lean, THRESHOLDS.torsoLeanDeg) });
            }
        }
    }

    return issues;
}

export const issueKey = (i: Pick<Issue, "code" | "side">) => `${i.code}:${i.side ?? "-"}`;

const ISSUE_CODES: IssueCode[] = ["shoulder_hike", "hip_drop", "knee_valgus", "leg_uneven", "arm_uneven", "heel_lift", "torso_lean"];

/** Inverse of issueKey — lets saved sessions be re-described in the current language. */
export function parseIssueKey(key: string | undefined): Pick<Issue, "code" | "side"> | null {
    if (!key) return null;
    const [code, side] = key.split(":");
    if (!ISSUE_CODES.includes(code as IssueCode)) return null;
    return { code: code as IssueCode, side: side === "left" || side === "right" ? side : null };
}

/**
 * Smooths frame-by-frame issues so a single noisy frame never triggers a warning.
 * An issue becomes active when seen in ≥ `on` of the last `window` frames and
 * clears when it drops below `off`.
 */
export class IssueTracker {
    private history = new Map<string, boolean[]>();
    private last = new Map<string, Issue>();
    private active = new Set<string>();
    constructor(private window = 15, private on = 9, private off = 4) {}

    /** Feed one frame. Returns issues that just became active. */
    update(frame: Issue[]): Issue[] {
        const seen = new Set(frame.map(issueKey));
        frame.forEach((i) => this.last.set(issueKey(i), i));
        const keys = new Set([...this.history.keys(), ...seen]);
        const started: Issue[] = [];
        for (const k of keys) {
            const h = this.history.get(k) ?? [];
            h.push(seen.has(k));
            if (h.length > this.window) h.shift();
            this.history.set(k, h);
            const count = h.filter(Boolean).length;
            if (!this.active.has(k) && count >= this.on) {
                this.active.add(k);
                const issue = this.last.get(k);
                if (issue) started.push(issue);
            } else if (this.active.has(k) && count < this.off) {
                this.active.delete(k);
            }
        }
        return started;
    }

    /** Currently active issues, most severe first. */
    current(): Issue[] {
        return [...this.active].map((k) => this.last.get(k)).filter((i): i is Issue => !!i).sort((a, b) => b.severity - a.severity);
    }

    reset(): void {
        this.history.clear();
        this.last.clear();
        this.active.clear();
    }
}

/** Fill the translated template, e.g. "ไหล่{side}ยกสูงกว่าอีกข้าง". */
export function describeIssue(
    issue: Pick<Issue, "code" | "side">,
    dict: { issues: Record<IssueCode, { title: string; cue: string }>; sides: { left: string; right: string; none: string } },
): { title: string; cue: string } {
    const side = issue.side ? dict.sides[issue.side] : dict.sides.none;
    const t = dict.issues[issue.code];
    return { title: t.title.replace("{side}", side).trim(), cue: t.cue.replace("{side}", side).trim() };
}
