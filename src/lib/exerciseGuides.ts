// How-to-lift demos: a side-on stick figure animated between the top and the
// bottom of a rep, for the correct form and the most common mistakes.
// Angles are in degrees from straight up, positive = toward the way the lifter faces.

import { EXERCISE_IDS, ExerciseId } from "@/lib/workoutStore";
import { getUserItem, setUserItem } from "@/lib/userStorage";

/** One pose of the figure. Every value is interpolated between the top and bottom of the rep. */
export interface PoseParams {
    shin: number;
    thigh: number;
    torso: number;
    /** 0 = straight back, + = rounded, − = arched */
    spine: number;
    upperArm: number;
    forearm: number;
    /** bench only: how far the hips leave the bench */
    hipLift: number;
}

export type Segment = "shin" | "thigh" | "torso" | "upperArm" | "forearm";

/** "back" = bar on the upper back (arms follow the torso), "hands" = bar hangs from straight arms, "bench" = lying down */
export type FigureKind = "back" | "hands" | "bench";

export interface GuideVariant {
    /** "correct", or the key of the mistake in `t.guide.exercises[id].mistakes` */
    id: string;
    top: PoseParams;
    bottom: PoseParams;
    /** Body parts drawn in the warning colour */
    highlight: Segment[];
    /** Which end of the rep shows the mistake best (the cue shown there) */
    showAt?: "top" | "bottom";
    /** Real footage from the training dataset, served from /public */
    clip?: string;
}

export interface ExerciseGuideData {
    kind: FigureKind;
    variants: GuideVariant[];
}

const P = (p: Partial<PoseParams>): PoseParams => ({ shin: 0, thigh: 0, torso: 0, spine: 0, upperArm: 180, forearm: 180, hipLift: 0, ...p });

const SQUAT_TOP = P({ torso: 3, upperArm: 197, forearm: 6 });
const DEADLIFT_TOP = P({});
const DEADLIFT_BOTTOM = P({ shin: 15, thigh: -70, torso: 55 });
const BENCH_TOP = P({ upperArm: 0, forearm: 0 });
const BENCH_BOTTOM = P({ upperArm: -115, forearm: 5 });

export const EXERCISE_GUIDES: Record<ExerciseId, ExerciseGuideData> = {
    squat: {
        kind: "back",
        variants: [
            { id: "correct", top: SQUAT_TOP, bottom: P({ shin: 35, thigh: -95, torso: 40, upperArm: 197, forearm: 6 }), highlight: [] },
            { id: "shallow", top: SQUAT_TOP, bottom: P({ shin: 18, thigh: -50, torso: 22, upperArm: 197, forearm: 6 }), highlight: ["thigh"], showAt: "bottom" },
            { id: "lean", top: SQUAT_TOP, bottom: P({ shin: 22, thigh: -100, torso: 68, spine: 1, upperArm: 197, forearm: 6 }), highlight: ["torso"], showAt: "bottom" },
        ],
    },
    deadlift: {
        kind: "hands",
        variants: [
            { id: "correct", top: DEADLIFT_TOP, bottom: DEADLIFT_BOTTOM, highlight: [], clip: "/videos/guide/deadlift-correct.mp4" },
            {
                id: "rounded",
                top: DEADLIFT_TOP,
                bottom: P({ shin: 12, thigh: -62, torso: 68, spine: 1.2 }),
                highlight: ["torso"],
                showAt: "bottom",
                clip: "/videos/guide/deadlift-rounded-back.mp4",
            },
            {
                id: "overext",
                top: P({ thigh: 2, torso: -14, spine: -1 }),
                bottom: DEADLIFT_BOTTOM,
                highlight: ["torso"],
                showAt: "top",
                clip: "/videos/guide/deadlift-over-extension.mp4",
            },
        ],
    },
    benchpress: {
        kind: "bench",
        variants: [
            { id: "correct", top: BENCH_TOP, bottom: BENCH_BOTTOM, highlight: [] },
            { id: "hips", top: BENCH_TOP, bottom: { ...BENCH_BOTTOM, hipLift: 14 }, highlight: ["thigh", "torso"], showAt: "bottom" },
            { id: "wrist", top: BENCH_TOP, bottom: { ...BENCH_BOTTOM, forearm: 35 }, highlight: ["forearm"], showAt: "bottom" },
        ],
    },
};

/** Exercises whose how-to this account has already opened (the camera shows it once per exercise). */
export function loadSeenGuides(): ExerciseId[] {
    try {
        const saved: unknown = JSON.parse(getUserItem("fitvision_guide_seen") || "[]");
        return Array.isArray(saved) ? EXERCISE_IDS.filter((id) => saved.includes(id)) : [];
    } catch {
        return [];
    }
}

export function markGuideSeen(id: ExerciseId): ExerciseId[] {
    const seen = loadSeenGuides();
    const next = seen.includes(id) ? seen : [...seen, id];
    setUserItem("fitvision_guide_seen", JSON.stringify(next));
    return next;
}
