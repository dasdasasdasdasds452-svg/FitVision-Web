"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { FigureKind, GuideVariant, PoseParams, Segment } from "@/lib/exerciseGuides";

const FIGURE = "#E2E8F0";
const JOINT = "#39FF14";
const WARN = "#FDBA74";
const PLATE = "#64748B";
const FLOOR_Y = 186;
const CYCLE_MS = 3600;

type Pt = { x: number; y: number };

const rad = (deg: number) => (deg * Math.PI) / 180;
/** A point `len` away from `from`, at `deg` from straight up (+ = forward, to the right). */
const step = (from: Pt, deg: number, len: number): Pt => ({ x: from.x + len * Math.sin(rad(deg)), y: from.y - len * Math.cos(rad(deg)) });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function mix(a: PoseParams, b: PoseParams, k: number): PoseParams {
    return {
        shin: lerp(a.shin, b.shin, k),
        thigh: lerp(a.thigh, b.thigh, k),
        torso: lerp(a.torso, b.torso, k),
        spine: lerp(a.spine, b.spine, k),
        upperArm: lerp(a.upperArm, b.upperArm, k),
        forearm: lerp(a.forearm, b.forearm, k),
        hipLift: lerp(a.hipLift, b.hipLift, k),
    };
}

interface Figure {
    ankle: Pt; knee: Pt; hip: Pt; shoulder: Pt; spineCtrl: Pt; head: Pt; elbow: Pt; wrist: Pt; toe: Pt;
    bar: Pt; plateR: number;
}

/** Forward kinematics for a standing lift: ankle → knee → hip → shoulder, then arms. */
function standing(p: PoseParams, kind: FigureKind): Figure {
    const ankle = { x: 96, y: FLOOR_Y };
    const knee = step(ankle, p.shin, 42);
    const hip = step(knee, p.thigh, 44);
    const shoulder = step(hip, p.torso, 52);
    // The back of the torso is "up-left" of the hip→shoulder line for a lifter facing right.
    const back = { x: -Math.cos(rad(p.torso)), y: -Math.sin(rad(p.torso)) };
    const mid = { x: (hip.x + shoulder.x) / 2, y: (hip.y + shoulder.y) / 2 };
    const spineCtrl = { x: mid.x + back.x * p.spine * 12, y: mid.y + back.y * p.spine * 12 };
    const head = step(shoulder, p.torso * 0.6 + p.spine * 18, 15);
    // A bar on the back moves with the torso, so the arms are relative to it; a hanging bar is not.
    const armBase = kind === "back" ? p.torso : 0;
    const elbow = step(shoulder, p.upperArm + armBase, 30);
    const wrist = step(elbow, p.forearm + armBase, 28);
    const bar = kind === "back" ? { x: shoulder.x + back.x * 6, y: shoulder.y + back.y * 6 } : wrist;
    return { ankle, knee, hip, shoulder, spineCtrl, head, elbow, wrist, toe: { x: ankle.x + 16, y: FLOOR_Y }, bar, plateR: kind === "back" ? 16 : 24 };
}

/** Lying on a bench, head to the right; only the arms and the hips move. */
function bench(p: PoseParams): Figure {
    const shoulder = { x: 128, y: 149 };
    const hip = { x: 76, y: 151 - p.hipLift };
    const knee = { x: 36, y: 143 - p.hipLift * 0.4 };
    const ankle = { x: 44, y: 184 };
    const elbow = step(shoulder, p.upperArm, 30);
    const wrist = step(elbow, p.forearm, 28);
    const mid = { x: (hip.x + shoulder.x) / 2, y: (hip.y + shoulder.y) / 2 };
    return {
        ankle, knee, hip, shoulder, elbow, wrist,
        spineCtrl: { x: mid.x, y: mid.y - 7 }, // chest up, slight arch
        head: { x: 146, y: 146 },
        toe: { x: ankle.x + 14, y: FLOOR_Y },
        bar: wrist,
        plateR: 16,
    };
}

/** Rep timeline: hold at the top, go down, hold at the bottom, come up. Returns 0 (top) … 1 (bottom). */
function phaseAt(ms: number): number {
    const t = (ms % CYCLE_MS) / CYCLE_MS;
    const ease = (k: number) => (1 - Math.cos(Math.PI * k)) / 2;
    if (t < 0.12) return 0;
    if (t < 0.45) return ease((t - 0.12) / 0.33);
    if (t < 0.57) return 1;
    if (t < 0.9) return 1 - ease((t - 0.57) / 0.33);
    return 0;
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
    const mq = window.matchMedia(reducedMotionQuery);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}
function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
}

interface ExerciseDemoProps {
    kind: FigureKind;
    variant: GuideVariant;
    /** Accessible description of the animation */
    label: string;
    cueTop: string;
    cueBottom: string;
    playLabel: string;
    pauseLabel: string;
    scrubLabel: string;
}

export default function ExerciseDemo({ kind, variant, label, cueTop, cueBottom, playLabel, pauseLabel, scrubLabel }: ExerciseDemoProps) {
    const reduceMotion = useReducedMotion();
    // null = follow the device setting (play unless reduced motion is on)
    const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
    const playing = userPlaying ?? !reduceMotion;
    const [phase, setPhase] = useState(reduceMotion ? 1 : 0);

    useEffect(() => {
        if (!playing) return;
        let frame = 0;
        // Continue from the current phase instead of jumping back to the top.
        const startOffset = phase * 0.45 * CYCLE_MS;
        const start = performance.now() - startOffset;
        const tick = (now: number) => {
            setPhase(phaseAt(now - start));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when play state changes
    }, [playing]);

    const pose = mix(variant.top, variant.bottom, phase);
    const f = kind === "bench" ? bench(pose) : standing(pose, kind);
    const warn = (s: Segment) => (variant.highlight.includes(s) ? WARN : FIGURE);
    const cue = phase < 0.1 ? cueTop : phase > 0.9 ? cueBottom : "";
    const cueIsMistake = variant.id !== "correct" && ((variant.showAt === "top" && phase < 0.1) || (variant.showAt !== "top" && phase > 0.9));

    return (
        <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                <svg viewBox="0 0 200 200" role="img" aria-label={label} className="w-full h-auto max-h-[46dvh] mx-auto block">
                    <line x1="8" y1={FLOOR_Y + 2} x2="192" y2={FLOOR_Y + 2} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                    {kind === "bench" && (
                        <g fill="#334155">
                            <rect x="58" y="157" width="94" height="7" rx="3" />
                            <rect x="70" y="164" width="5" height="24" />
                            <rect x="136" y="164" width="5" height="24" />
                        </g>
                    )}
                    {/* plate seen end-on, behind the body */}
                    <circle cx={f.bar.x} cy={f.bar.y} r={f.plateR} fill="#0f172a" stroke={PLATE} strokeWidth="3" />
                    <circle cx={f.bar.x} cy={f.bar.y} r="3" fill={PLATE} />

                    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <path d={`M${f.ankle.x} ${f.ankle.y} L${f.toe.x} ${f.toe.y}`} stroke={FIGURE} strokeWidth="5" />
                        <path d={`M${f.ankle.x} ${f.ankle.y} L${f.knee.x} ${f.knee.y}`} stroke={warn("shin")} strokeWidth="7" />
                        <path d={`M${f.knee.x} ${f.knee.y} L${f.hip.x} ${f.hip.y}`} stroke={warn("thigh")} strokeWidth="8" />
                        <path d={`M${f.hip.x} ${f.hip.y} Q${f.spineCtrl.x} ${f.spineCtrl.y} ${f.shoulder.x} ${f.shoulder.y}`} stroke={warn("torso")} strokeWidth="10" />
                        <path d={`M${f.shoulder.x} ${f.shoulder.y} L${f.elbow.x} ${f.elbow.y}`} stroke={warn("upperArm")} strokeWidth="6" />
                        <path d={`M${f.elbow.x} ${f.elbow.y} L${f.wrist.x} ${f.wrist.y}`} stroke={warn("forearm")} strokeWidth="5" />
                    </g>
                    <circle cx={f.head.x} cy={f.head.y} r="9" fill={FIGURE} />
                    {[f.knee, f.hip, f.shoulder, f.elbow].map((j, i) => (
                        <circle key={i} cx={j.x} cy={j.y} r="3" fill={JOINT} />
                    ))}
                </svg>
                <p
                    aria-live="off"
                    className={`absolute inset-x-3 top-3 min-h-8 text-center text-sm font-semibold transition-opacity ${cue ? "opacity-100" : "opacity-0"} ${cueIsMistake ? "text-orange-300" : "text-primary"}`}
                >
                    {cue}
                </p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setUserPlaying(!playing)}
                    aria-label={playing ? pauseLabel : playLabel}
                    className="size-11 shrink-0 rounded-full border border-white/15 bg-white/[0.04] text-white flex items-center justify-center hover:bg-white/10 cursor-pointer"
                >
                    <span className="material-symbols-outlined filled" aria-hidden="true">{playing ? "pause" : "play_arrow"}</span>
                </button>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(phase * 100)}
                    onChange={(e) => { setUserPlaying(false); setPhase(Number(e.target.value) / 100); }}
                    aria-label={scrubLabel}
                    className="flex-1 accent-primary h-11 cursor-pointer"
                />
            </div>
        </div>
    );
}
