// Preferences saved by the Settings page and read by the camera.

export interface WorkoutPrefs {
    voiceFeedback: boolean;
    autoSaveClips: boolean;
    countdown: boolean;
}

function readBool(key: string, fallback: boolean): boolean {
    if (typeof window === "undefined") return fallback;
    try {
        const v = window.localStorage.getItem(key);
        return v === null ? fallback : v === "true";
    } catch {
        return fallback;
    }
}

export function loadWorkoutPrefs(): WorkoutPrefs {
    return {
        voiceFeedback: readBool("fitvision_voice_feedback", true),
        autoSaveClips: readBool("fitvision_auto_save", true),
        countdown: readBool("fitvision_countdown", true),
    };
}

/** Speak a short cue (Thai or English). Cancels anything still being spoken. */
export function speak(text: string, language: "th" | "en"): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = language === "th" ? "th-TH" : "en-US";
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
    } catch {
        /* speech not available — ignore */
    }
}
