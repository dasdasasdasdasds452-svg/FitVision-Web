"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { EXERCISE_GUIDES } from "@/lib/exerciseGuides";
import type { ExerciseId } from "@/lib/workoutStore";
import ExerciseDemo from "./ExerciseDemo";

interface MistakeText {
    title: string;
    fix: string;
}

/** Correct form + common mistakes for one exercise: animated figure, real clip (when there is one) and steps. */
export function ExerciseGuide({ exercise }: { exercise: ExerciseId }) {
    const { t } = useLanguage();
    const g = t.guide;
    const text = g.exercises[exercise];
    const mistakes: Record<string, MistakeText> = text.mistakes;
    const data = EXERCISE_GUIDES[exercise];
    const [variantId, setVariantId] = useState("correct");
    const [view, setView] = useState<"demo" | "clip">("demo");
    const [clipFailed, setClipFailed] = useState<Record<string, boolean>>({});

    const variant = data.variants.find((v) => v.id === variantId) ?? data.variants[0];
    const mistake = variant.id === "correct" ? null : mistakes[variant.id];
    const hasClip = !!variant.clip && !clipFailed[variant.clip];
    const showClip = view === "clip" && hasClip;
    const exerciseName = t.camera.exerciseName[exercise];

    return (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
            <div className="flex flex-col gap-3 min-w-0">
                <div role="radiogroup" aria-label={g.mistakesLabel} className="flex flex-wrap gap-2">
                    {data.variants.map((v) => {
                        const selected = v.id === variant.id;
                        const isCorrect = v.id === "correct";
                        return (
                            <button
                                key={v.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setVariantId(v.id)}
                                className={`min-h-10 px-3.5 rounded-full border text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${selected
                                    ? isCorrect ? "border-primary bg-primary/15 text-primary" : "border-orange-300 bg-orange-400/15 text-orange-200"
                                    : "border-white/15 bg-white/[0.03] text-slate-200 hover:border-white/30"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base" aria-hidden="true">{isCorrect ? "check_circle" : "cancel"}</span>
                                {isCorrect ? g.correct : mistakes[v.id]?.title}
                            </button>
                        );
                    })}
                </div>

                {hasClip && (
                    <div role="tablist" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-sm">
                        {(["demo", "clip"] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                role="tab"
                                aria-selected={view === v}
                                onClick={() => setView(v)}
                                className={`min-h-9 rounded-lg font-medium cursor-pointer ${view === v ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                {v === "demo" ? g.demoTab : g.clipTab}
                            </button>
                        ))}
                    </div>
                )}

                {showClip ? (
                    <figure className="flex flex-col gap-2">
                        <video
                            key={variant.clip}
                            src={variant.clip}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            onError={() => setClipFailed((prev) => ({ ...prev, [variant.clip as string]: true }))}
                            className="w-full max-h-[46dvh] aspect-[9/16] object-contain rounded-2xl bg-black border border-white/10"
                        />
                        <figcaption className="text-xs text-slate-400">{g.clipNote}</figcaption>
                    </figure>
                ) : (
                    <ExerciseDemo
                        kind={data.kind}
                        variant={variant}
                        label={g.demoAlt.replace("{exercise}", exerciseName).replace("{variant}", mistake ? mistake.title : g.correct)}
                        cueTop={mistake && variant.showAt === "top" ? mistake.title : text.cueTop}
                        cueBottom={mistake && variant.showAt !== "top" ? mistake.title : text.cueBottom}
                        playLabel={g.play}
                        pauseLabel={g.pause}
                        scrubLabel={g.scrub}
                    />
                )}
            </div>

            <div className="flex flex-col gap-4 min-w-0">
                <p className="text-slate-200 leading-relaxed">{text.summary}</p>

                {mistake && (
                    <div className="rounded-2xl border border-orange-300/40 bg-orange-400/[0.08] p-4">
                        <p className="font-semibold text-orange-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">build</span>
                            {g.fixTitle}
                        </p>
                        <p className="mt-1.5 text-sm text-slate-200 leading-relaxed">{mistake.fix}</p>
                    </div>
                )}

                <div>
                    <h3 className="text-sm font-semibold text-white mb-2">{g.stepsTitle}</h3>
                    <ol className="flex flex-col gap-2.5">
                        {text.steps.map((s, i) => (
                            <li key={s} className="flex gap-3 items-start">
                                <span className="size-7 shrink-0 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                                <span className="text-sm text-slate-200 leading-relaxed pt-0.5">{s}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                {text.note && <p className="text-xs text-slate-400 leading-relaxed">{text.note}</p>}
            </div>
        </div>
    );
}

interface ExerciseGuideModalProps {
    exercise: ExerciseId;
    open: boolean;
    onClose: () => void;
    /** Shown as the main button (e.g. on the camera page: start the set) */
    primaryLabel?: string;
}

/** The guide in a modal dialog. Esc, the close button, the main button and a tap outside all close it. */
export function ExerciseGuideModal({ exercise, open, onClose, primaryLabel }: ExerciseGuideModalProps) {
    const { t } = useLanguage();
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            aria-labelledby="guide-title"
            className="m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[92dvh] rounded-3xl bg-surface-dark text-white border border-white/10 p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
        >
            {open && (
                <div className="flex flex-col max-h-[92dvh]">
                    <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
                        <h2 id="guide-title" className="text-lg font-semibold">
                            {t.guide.title.replace("{exercise}", t.camera.exerciseName[exercise])}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t.guide.close}
                            className="size-11 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/10 cursor-pointer"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">close</span>
                        </button>
                    </header>
                    <div className="overflow-y-auto px-5 py-4">
                        <ExerciseGuide exercise={exercise} />
                    </div>
                    <footer className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-12 w-full rounded-2xl bg-primary text-background-dark font-semibold hover:brightness-110 cursor-pointer"
                        >
                            {primaryLabel ?? t.guide.done}
                        </button>
                    </footer>
                </div>
            )}
        </dialog>
    );
}
