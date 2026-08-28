// ─── Shared Workout Types ───

export type ExerciseType = "squat" | "deadlift" | "benchpress";

export interface PredictionResult {
    form_correct: boolean;
    confidence: number;
    feedback: string;
    error_type?: string;
    error_code?: number;
    detail_confidence?: number;
}

export interface WorkoutSession {
    id: string;
    exercise: string;
    avgScore: number;
    errorCount: number;
    completedReps: number;
    repGoal: number;
    timestamp: string;
    errors: ErrorRecord[];
}

export interface ErrorRecord {
    url: string;
    title: string;
    detail: string;
    time: string;
}

export interface FormFeedback {
    isGoodForm: boolean;
    title: string;
    detail: string;
    score: number;
}
