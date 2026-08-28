import { useRef, useState, useCallback } from "react";
import type { ExerciseType, PredictionResult, FormFeedback } from "@/types/workout";
import type { Landmark } from "@/lib/poseUtils";
import { calculateAngle } from "@/lib/poseUtils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://grubby-lynnett-tonkla1-ded4b5e9.koyeb.app";

interface UseFormPredictorReturn {
    feedback: FormFeedback;
    isPredicting: boolean;
    predict: (exercise: ExerciseType, features: number[], landmarks: Landmark[]) => void;
    scores: number[];
}

/**
 * Custom hook for AI form prediction with score smoothing.
 * Sends landmark features to the backend API and maintains
 * a rolling window of recent predictions for smoothed scoring.
 */
export function useFormPredictor(
    t: { camera: { feedback: { goodForm: string; correctionNeeded: string } } },
    onError?: (errorRecord: { title: string; detail: string; time: string }) => void
): UseFormPredictorReturn {
    const [feedback, setFeedback] = useState<FormFeedback>({
        isGoodForm: true,
        title: "AI Ready",
        detail: "Start exercising to get feedback.",
        score: 100,
    });

    const isPredictingRef = useRef(false);
    const recentPredictions = useRef<{ correct: boolean; confidence: number }[]>([]);
    const scoresRef = useRef<number[]>([]);
    const isGoodFormRef = useRef(true);
    const lastErrorTimeRef = useRef(0);

    const predict = useCallback(
        (exercise: ExerciseType, features: number[], landmarks: Landmark[]) => {
            if (isPredictingRef.current) return;
            isPredictingRef.current = true;

            (async () => {
                try {
                    let payload: Record<string, unknown>;

                    if (exercise === "squat") {
                        const lm = landmarks;
                        const l_shoulder = lm[11], r_shoulder = lm[12];
                        const l_hip = lm[23], r_hip = lm[24];
                        const l_knee = lm[25], r_knee = lm[26];
                        const l_ankle = lm[27], r_ankle = lm[28];
                        const l_foot = lm[31] || lm[27], r_foot = lm[32] || lm[28];

                        const mid_hip = { x: (l_hip.x + r_hip.x) / 2, y: (l_hip.y + r_hip.y) / 2 };
                        const mid_shoulder = { x: (l_shoulder.x + r_shoulder.x) / 2, y: (l_shoulder.y + r_shoulder.y) / 2 };
                        const vertical = { x: mid_hip.x, y: mid_hip.y - 1.0 };

                        const spine_angle = calculateAngle(vertical, mid_hip, mid_shoulder);
                        const left_knee_angle = calculateAngle(l_hip, l_knee, l_ankle);
                        const right_knee_angle = calculateAngle(r_hip, r_knee, r_ankle);
                        const left_hip_angle = calculateAngle(l_shoulder, l_hip, l_knee);
                        const right_hip_angle = calculateAngle(r_shoulder, r_hip, r_knee);

                        payload = {
                            left_knee_angle, right_knee_angle,
                            left_hip_angle, right_hip_angle,
                            left_ankle_angle: calculateAngle(l_knee, l_ankle, l_foot),
                            right_ankle_angle: calculateAngle(r_knee, r_ankle, r_foot),
                            spine_angle, torso_lean: spine_angle,
                            left_knee_lateral: l_knee.x - l_ankle.x,
                            right_knee_lateral: r_ankle.x - r_knee.x,
                            symmetry_score: Math.abs(left_knee_angle - right_knee_angle) + Math.abs(left_hip_angle - right_hip_angle),
                            hip_depth: mid_hip.y,
                        };
                    } else {
                        payload = { features };
                    }

                    const res = await fetch(`${API_BASE_URL}/predict/${exercise}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });

                    if (res.ok) {
                        const data: PredictionResult = await res.json();

                        // Rolling window smoothing
                        recentPredictions.current.push({ correct: data.form_correct, confidence: data.confidence });
                        if (recentPredictions.current.length > 5) recentPredictions.current.shift();

                        const window = recentPredictions.current;
                        const incorrectCount = window.filter((p) => !p.correct).length;
                        const isFormCorrect = incorrectCount < Math.ceil(window.length / 2);

                        // Calculate smoothed score
                        let rawScore: number;
                        if (isFormCorrect) {
                            const correctPreds = window.filter((p) => p.correct);
                            const avgConf = correctPreds.length > 0
                                ? correctPreds.reduce((s, p) => s + p.confidence, 0) / correctPreds.length
                                : 0.8;
                            rawScore = avgConf * 100;
                            if (rawScore > 98) rawScore = 95 + Math.random() * 4;
                            if (rawScore < 70) rawScore = 70 + Math.random() * 10;
                        } else {
                            const badPreds = window.filter((p) => !p.correct);
                            const avgConf = badPreds.length > 0
                                ? badPreds.reduce((s, p) => s + p.confidence, 0) / badPreds.length
                                : 0.5;
                            rawScore = (1 - avgConf) * 100;
                            rawScore = Math.max(15, Math.min(55, rawScore));
                            rawScore += Math.random() * 6 - 3;
                        }
                        const currentScore = Math.round(Math.max(0, Math.min(100, rawScore)));

                        isGoodFormRef.current = isFormCorrect;
                        scoresRef.current.push(currentScore);

                        setFeedback({
                            isGoodForm: isFormCorrect,
                            title: isFormCorrect ? t.camera.feedback.goodForm : t.camera.feedback.correctionNeeded,
                            detail: data.feedback,
                            score: currentScore,
                        });

                        // Error callback for recording
                        if (!isFormCorrect && onError) {
                            const now = Date.now();
                            if (now - lastErrorTimeRef.current > 6000) {
                                lastErrorTimeRef.current = now;
                                onError({
                                    title: data.error_type || t.camera.feedback.correctionNeeded,
                                    detail: data.feedback,
                                    time: new Date().toLocaleTimeString(),
                                });
                            }
                        }
                    } else {
                        const errText = await res.text();
                        if (process.env.NODE_ENV === "development") {
                            console.error(`API Error ${res.status}:`, errText);
                        }
                        setFeedback((prev) => ({ ...prev, detail: `Backend Error: ${res.status}` }));
                    }
                } catch (e) {
                    if (process.env.NODE_ENV === "development") {
                        console.error("AI Predict Error", e);
                    }
                } finally {
                    isPredictingRef.current = false;
                }
            })();
        },
        [t, onError]
    );

    return {
        feedback,
        isPredicting: isPredictingRef.current,
        predict,
        scores: scoresRef.current,
    };
}
