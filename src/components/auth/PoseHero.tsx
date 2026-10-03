"use client";

import { useLanguage } from "@/context/LanguageContext";

/** Squat pose-tracking illustration shown on the sign-in screen. Decorative product preview. */
export default function PoseHero({ className = "" }: { className?: string }) {
    const { t } = useLanguage();
    const joints: [number, number][] = [
        [164, 62],
        [140, 114],
        [190, 124],
        [180, 168],
        [190, 86],
        [216, 78],
    ];

    return (
        <figure className={`relative overflow-hidden rounded-2xl bg-surface-darker border border-white/10 ${className}`}>
            <svg viewBox="0 0 342 196" className="w-full h-full" role="img" aria-label={t.login.poseAlt} preserveAspectRatio="xMidYMid meet">
                <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
                    <path d="M0 39h342M0 78h342M0 117h342M0 156h342M57 0v196M114 0v196M171 0v196M228 0v196M285 0v196" />
                </g>
                <g className="text-primary" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M112 22h-12v12M232 22h12v12M112 180h-12v-12M232 180h12v-12" strokeWidth="1.5" opacity="0.5" />
                    <path d="M164 62L140 114L190 124L180 168M164 62L190 86L216 78M180 168L198 170" strokeWidth="3.5" />
                    <circle cx="158" cy="40" r="13" strokeWidth="3" />
                </g>
                <g fill="#121212" stroke="#f1f5f9" strokeWidth="2.5">
                    {joints.map(([cx, cy]) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
                    ))}
                </g>
                <path d="M176 120a16 16 0 0 1 10 -12" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </svg>
            <span className="absolute left-[68%] top-[57%] rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-background-dark">
                {t.login.kneeAngle.replace("{deg}", "92")}
            </span>
            <figcaption className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-background-dark/80 px-2.5 py-1 text-xs text-slate-200">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                {t.login.liveBadge}
            </figcaption>
        </figure>
    );
}
