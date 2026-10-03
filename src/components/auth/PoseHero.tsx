"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

/*
 * Sign-in hero: a side-view bodyweight squat drawn the way the camera page tracks it —
 * MediaPipe-style joints, the far limbs dimmed, and a live knee angle + rep count that
 * follow the motion. Static (bottom of the squat) when the OS asks for reduced motion.
 */

type P = [number, number];
interface Pose {
    head: P;
    shoulder: P;
    elbow: P;
    wrist: P;
    hip: P;
    knee: P;
    ankle: P;
    heel: P;
    toe: P;
}

// 342 × 196 viewBox, facing right. Posed with joint angles and fixed bone lengths
// (forward kinematics from the planted ankle), so limbs never stretch while moving.
const ANKLE: P = [168, 175];
const BONE = { shin: 40, thigh: 48, torso: 48, neck: 18, upperArm: 26, forearm: 24 };
const HEAD_R = 9.5;
/** Absolute segment angles in degrees (0 = pointing right, -90 = straight up). */
interface Angles { shin: number; thigh: number; torso: number; neck: number; upperArm: number; forearm: number }
const STAND: Angles = { shin: -88, thigh: -95, torso: -92, neck: -80, upperArm: 2, forearm: 0 };
const SQUAT: Angles = { shin: -60, thigh: -176, torso: -50, neck: -55, upperArm: -8, forearm: -4 };
/** The body's far side sits a little behind and above the near side. */
const FAR_OFFSET: P = [6, -3];
const PERIOD_MS = 2600;
const MAX_REPS = 12;

const step = (from: P, len: number, deg: number): P => [
    from[0] + len * Math.cos((deg * Math.PI) / 180),
    from[1] + len * Math.sin((deg * Math.PI) / 180),
];
function mixPose(t: number): Pose {
    const a = {} as Angles;
    (Object.keys(STAND) as (keyof Angles)[]).forEach((k) => (a[k] = STAND[k] + (SQUAT[k] - STAND[k]) * t));
    const knee = step(ANKLE, BONE.shin, a.shin);
    const hip = step(knee, BONE.thigh, a.thigh);
    const shoulder = step(hip, BONE.torso, a.torso);
    const elbow = step(shoulder, BONE.upperArm, a.upperArm);
    return {
        ankle: ANKLE,
        heel: [ANKLE[0] - 9, ANKLE[1] + 4],
        toe: [ANKLE[0] + 18, ANKLE[1] + 4],
        knee,
        hip,
        shoulder,
        head: step(shoulder, BONE.neck, a.neck),
        elbow,
        wrist: step(elbow, BONE.forearm, a.forearm),
    };
}
const shift = (p: P, d: P): P => [p[0] + d[0], p[1] + d[1]];
/** Where the neck meets the head circle (so the line doesn't run through the head). */
function neckTop(shoulder: P, head: P): P {
    const len = Math.hypot(head[0] - shoulder[0], head[1] - shoulder[1]);
    const k = (len - HEAD_R) / len;
    return [shoulder[0] + (head[0] - shoulder[0]) * k, shoulder[1] + (head[1] - shoulder[1]) * k];
}

/** Angle at `b` between b→a and b→c, in degrees. */
function angleAt(a: P, b: P, c: P): number {
    const v1 = [a[0] - b[0], a[1] - b[1]];
    const v2 = [c[0] - b[0], c[1] - b[1]];
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]));
    return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** SVG arc of radius r around `b`, from the b→a ray to the b→c ray (the inside of the joint). */
function jointArc(a: P, b: P, c: P, r: number): string {
    const a1 = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    const p1: P = [b[0] + r * Math.cos(a1), b[1] + r * Math.sin(a1)];
    const p2: P = [b[0] + r * Math.cos(a2), b[1] + r * Math.sin(a2)];
    const cross = (a[0] - b[0]) * (c[1] - b[1]) - (a[1] - b[1]) * (c[0] - b[0]);
    return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
}

const line = (pts: P[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");

function useSquatPhase(): { depth: number; rep: number } {
    // Server render and reduced motion: the bottom of rep 3.
    const [state, setState] = React.useState({ depth: 1, rep: 3 });
    React.useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let raf = 0;
        let last = 0;
        const start = performance.now() - PERIOD_MS / 2; // begin at the bottom, like the static frame
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            if (now - last < 33) return; // ~30 fps is plenty for this
            last = now;
            const elapsed = now - start;
            const cycle = (elapsed % PERIOD_MS) / PERIOD_MS;
            // Ease in and out of the bottom, with a short pause at the top.
            const depth = cycle < 0.15 ? 0 : (1 - Math.cos(((cycle - 0.15) / 0.85) * 2 * Math.PI)) / 2;
            // A rep counts at the bottom of each cycle (cycle ≈ 0.575), like the camera's rep counter.
            const reps = Math.floor(elapsed / PERIOD_MS - 0.575) + 4;
            setState({ depth, rep: ((reps - 1) % MAX_REPS) + 1 });
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);
    return state;
}

export default function PoseHero({ className = "" }: { className?: string }) {
    const { t } = useLanguage();
    const { depth, rep } = useSquatPhase();
    const near = mixPose(depth);
    const far = Object.fromEntries(Object.entries(near).map(([k, p]) => [k, shift(p, FAR_OFFSET)])) as unknown as Pose;
    const knee = Math.round(angleAt(near.hip, near.knee, near.ankle));
    const deep = depth > 0.82;

    const nearLimbs = [line([near.shoulder, near.elbow, near.wrist]), line([near.hip, near.knee, near.ankle, near.toe]), line([near.ankle, near.heel, near.toe])];
    const farLimbs = [line([far.shoulder, far.elbow, far.wrist]), line([far.hip, far.knee, far.ankle, far.toe]), line([far.ankle, far.heel])];
    const joints: P[] = [near.shoulder, near.elbow, near.wrist, near.hip, near.ankle, near.heel, near.toe];
    const tag: P = [near.knee[0] + 16, near.knee[1] - 30];

    return (
        <figure className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1210] ${className}`}>
            <svg viewBox="0 0 342 196" className="absolute inset-0 w-full h-full" role="img" aria-label={t.login.poseAlt}>
                <defs>
                    <radialGradient id="ph-glow" cx="62%" cy="58%" r="60%">
                        <stop offset="0" stopColor="#39FF14" stopOpacity="0.10" />
                        <stop offset="1" stopColor="#39FF14" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="ph-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.8" fill="#ffffff" fillOpacity="0.07" />
                    </pattern>
                    <linearGradient id="ph-scan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#39FF14" stopOpacity="0" />
                        <stop offset="1" stopColor="#39FF14" stopOpacity="0.16" />
                    </linearGradient>
                    <filter id="ph-neon" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.4" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <rect width="342" height="196" fill="url(#ph-dots)" />
                <rect width="342" height="196" fill="url(#ph-glow)" />

                {/* Scan band sweeping down the frame */}
                <rect className="pose-scan" x="0" y="-40" width="342" height="40" fill="url(#ph-scan)" />

                {/* Tracking box around the athlete */}
                <g stroke="#39FF14" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7">
                    <path d="M128 8h-10v10M258 8h10v10M128 188h-10v-10M258 188h10v-10" />
                </g>

                {/* Floor + contact shadow */}
                <path d="M96 179.5H280" stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="2 4" />
                <ellipse cx="172" cy="181" rx="26" ry="2.6" fill="#39FF14" fillOpacity="0.18" />

                {/* Depth guide: the knee height. Hip at or below it = parallel squat */}
                <path d={`M112 ${near.knee[1].toFixed(1)}H246`} stroke={deep ? "#39FF14" : "#ffffff"} strokeOpacity={deep ? 0.55 : 0.18} strokeDasharray="4 4" />

                {/* Far side (dimmed) */}
                <g stroke="#39FF14" strokeOpacity="0.32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    {farLimbs.map((d, i) => <path key={i} d={d} />)}
                </g>

                {/* Near side: torso, limbs, head */}
                <g filter="url(#ph-neon)" stroke="#39FF14" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d={line([near.shoulder, near.hip])} strokeWidth="4.4" />
                    {nearLimbs.map((d, i) => <path key={i} d={d} />)}
                    <path d={line([near.shoulder, neckTop(near.shoulder, near.head)])} strokeWidth="2.4" />
                    <circle cx={near.head[0]} cy={near.head[1]} r={HEAD_R} strokeWidth="2.6" />
                </g>

                {/* Knee angle arc */}
                <path d={jointArc(near.hip, near.knee, near.ankle, 15)} stroke="#ffffff" strokeWidth="1.6" fill="#ffffff" fillOpacity="0.08" />

                {/* Joints */}
                <g fill="#0f1210" stroke="#f8fafc" strokeWidth="2">
                    {joints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.6" />)}
                </g>
                <circle cx={near.knee[0]} cy={near.knee[1]} r="9" fill="#39FF14" fillOpacity="0.18" />
                <circle cx={near.knee[0]} cy={near.knee[1]} r="4.6" fill="#39FF14" stroke="#0f1210" strokeWidth="2" />

                {/* Knee angle tag */}
                <path d={line([near.knee, [tag[0] - 2, tag[1] + 10]])} stroke="#f8fafc" strokeOpacity="0.5" strokeWidth="1" />
                <g transform={`translate(${tag[0].toFixed(1)} ${tag[1].toFixed(1)})`} aria-hidden="true">
                    <rect x="0" y="-1" width="66" height="22" rx="6" fill="#f8fafc" />
                    <text x="33" y="14.5" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f1210" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {t.login.kneeAngle.replace("{deg}", String(knee))}
                    </text>
                </g>
            </svg>

            {/* Overlays (decorative copies of what the SVG shows) */}
            <figcaption className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-2.5 py-1 text-xs text-slate-100">
                <span className="relative flex size-2" aria-hidden="true">
                    <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {t.login.liveBadge}
            </figcaption>
            <div className="absolute right-3 top-3 rounded-xl border border-white/15 bg-black/60 backdrop-blur px-2.5 py-1 text-right" aria-hidden="true">
                <span className="block text-[10px] leading-3 text-slate-400">{t.login.repLabel}</span>
                <span className="block text-lg leading-6 font-semibold text-white tabular-nums">{rep}</span>
            </div>
            <div className="absolute left-3 bottom-3 flex items-center gap-1 rounded-full bg-primary/15 border border-primary/40 px-2 py-0.5 text-[11px] font-semibold text-primary" aria-hidden="true">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {t.login.formGood}
            </div>
        </figure>
    );
}
