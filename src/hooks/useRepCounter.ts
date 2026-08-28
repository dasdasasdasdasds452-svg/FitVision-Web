import { useRef, useState, useCallback } from "react";
import type { ExerciseType } from "@/types/workout";
import type { Landmark } from "@/lib/poseUtils";

interface RepCounterConfig {
    exercise: ExerciseType;
    features: number[];
    landmarks: Landmark[];
}

interface RepCounterReturn {
    currentReps: number;
    repState: "up" | "down";
    mainAngle: number;
    resetReps: () => void;
    processFrame: (config: RepCounterConfig) => void;
}

/**
 * Custom hook that implements a threshold-based state machine
 * for counting exercise repetitions from pose landmarks.
 */
export function useRepCounter(): RepCounterReturn {
    const [currentReps, setCurrentReps] = useState(0);
    const repStateRef = useRef<"up" | "down">("up");
    const localRepCountRef = useRef(0);

    const resetReps = useCallback(() => {
        repStateRef.current = "up";
        localRepCountRef.current = 0;
        setCurrentReps(0);
    }, []);

    const processFrame = useCallback((config: RepCounterConfig) => {
        const { exercise, features, landmarks } = config;

        let mainAngle = 0;
        let upThreshold = 150;
        let downThreshold = 100;

        if (exercise === "squat") {
            mainAngle = (features[6] + features[7]) / 2; // knee angles
            upThreshold = 160;
            downThreshold = 110;
        } else if (exercise === "deadlift") {
            mainAngle = (features[4] + features[5]) / 2; // hip angles
            upThreshold = 165;
            downThreshold = 120;
        } else if (exercise === "benchpress") {
            const lm = landmarks;
            const distLeft = Math.hypot(lm[11].x - lm[15].x, lm[11].y - lm[15].y);
            const distRight = Math.hypot(lm[12].x - lm[16].x, lm[12].y - lm[16].y);
            mainAngle = Math.max(distLeft, distRight) * 1000;
            upThreshold = 80;
            downThreshold = 63;
        }

        if (mainAngle > upThreshold) {
            if (repStateRef.current === "down") {
                localRepCountRef.current += 1;
                setCurrentReps(localRepCountRef.current);
            }
            repStateRef.current = "up";
        } else if (mainAngle < downThreshold) {
            repStateRef.current = "down";
        }
    }, []);

    return {
        currentReps,
        repState: repStateRef.current,
        mainAngle: 0,
        resetReps,
        processFrame,
    };
}
