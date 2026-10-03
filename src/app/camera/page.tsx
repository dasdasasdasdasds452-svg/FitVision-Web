"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLanguage } from "@/context/LanguageContext";
import { CameraMobileHUD, CameraDesktopPanel } from "@/components/camera/CameraOverlays";
import { calculateAngle, dist2d } from "@/lib/poseUtils";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
    ErrorRecord,
    ExerciseId,
    WorkoutSession,
    saveSessionToHistory,
    setCurrentSession,
    toExerciseId,
} from "@/lib/workoutStore";
import { loadWorkoutPrefs, speak, WorkoutPrefs } from "@/lib/userPrefs";
import { Issue, IssueTracker, analyzePose, describeIssue, issueKey, parseIssueKey } from "@/lib/formAnalyzer";
import { loadMissions } from "@/lib/missions";
import { pushSession } from "@/lib/cloudSync";
import { publishMyStats } from "@/lib/friends";
import { GhostRep, RepRecorder, drawGhost, isBetterGhost, loadGhost, saveGhost } from "@/lib/ghostRep";
import type { SetResult } from "@/lib/workoutStore";

function CameraContent() {
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();
    const model: ExerciseId = toExerciseId(searchParams.get("model") || "benchpress");
    const parsedReps = parseInt(searchParams.get("reps") || "12", 10);
    const repsParam = Number.isFinite(parsedReps) ? Math.min(50, Math.max(1, parsedReps)) : 12;

    const clampInt = (v: string | null, min: number, max: number, dflt: number) => {
        const n = parseInt(v || "", 10);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };
    const setGoal = clampInt(searchParams.get("sets"), 1, 10, 1);
    const restSeconds = clampInt(searchParams.get("rest"), 15, 300, 90);
    const kgParam = parseFloat(searchParams.get("kg") || "");
    const weightKg = Number.isFinite(kgParam) && kgParam > 0 ? Math.round(kgParam * 10) / 10 : null;

    const [currentExercise, setCurrentExercise] = useState<ExerciseId>(model);
    const [repGoal, setRepGoal] = useState(repsParam);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [isTrackingStarted, setIsTrackingStarted] = useState(false);
    const isTrackingStartedRef = useRef(false);

    const [countdown, setCountdown] = useState<number | null>(null);
    const [currentReps, setCurrentReps] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const currentSetRef = useRef(1);
    const [restLeft, setRestLeft] = useState<number | null>(null);
    const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const setsRef = useRef<SetResult[]>([]);
    const setStartRef = useRef({ score: 0, err: 0 });

    // Body-part analysis (formAnalyzer): smoothed, with the most severe issue shown in the HUD
    const trackerRef = useRef(new IssueTracker());
    const [topIssue, setTopIssue] = useState<Issue | null>(null);
    const topIssueKeyRef = useRef<string>("");
    const issueLoggedAtRef = useRef(new Map<string, number>());
    const [missionFocus, setMissionFocus] = useState<{ key: string; label: string } | null>(null);
    const [isSetupMinimized, setIsSetupMinimized] = useState(false);

    const repStateRef = useRef<"up" | "down">("up");
    const localRepCountRef = useRef<number>(0);

    // Latest translations / language / prefs for callbacks created once inside effects
    const tRef = useRef(t);
    const languageRef = useRef(language);
    useEffect(() => { tRef.current = t; languageRef.current = language; }, [t, language]);
    const prefsRef = useRef<WorkoutPrefs>({ voiceFeedback: true, autoSaveClips: true, countdown: true, ghostRep: true });

    // Ghost rep: the cleanest rep saved for this exercise, drawn as a dashed skeleton
    const ghostRef = useRef<GhostRep | null>(null);
    const [hasGhost, setHasGhost] = useState(false);
    const [showGhost, setShowGhost] = useState(true);
    const showGhostRef = useRef(true);
    const recorderRef = useRef<{ exercise: ExerciseId; rec: RepRecorder } | null>(null);
    const bestRepRef = useRef<GhostRep | null>(null);
    const toggleGhost = () => {
        const next = !showGhostRef.current;
        showGhostRef.current = next;
        setShowGhost(next);
        try { localStorage.setItem("fitvision_ghost_rep", String(next)); } catch { /* ignore */ }
    };

    useEffect(() => {
        prefsRef.current = loadWorkoutPrefs();
        showGhostRef.current = prefsRef.current.ghostRep;
        setShowGhost(prefsRef.current.ghostRep);
    }, []);

    // Errors and scores of THIS session only (never carried over from earlier sessions)
    const errorsRef = useRef<ErrorRecord[]>([]);
    const sessionEndedRef = useRef(false);
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); }, []);

    const beginTracking = () => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        setRestLeft(null);
        setsRef.current = [];
        setStartRef.current = { score: 0, err: 0 };
        currentSetRef.current = 1;
        setCurrentSet(1);
        trackerRef.current.reset();
        issueLoggedAtRef.current.clear();
        topIssueKeyRef.current = "";
        setTopIssue(null);
        errorsRef.current = [];
        statsRef.current.scores = [];
        recentPredictions.current = [];
        sessionEndedRef.current = false;
        lastErrorTimeRef.current = 0;
        repStateRef.current = "up";
        localRepCountRef.current = 0;
        setCurrentReps(0);
        recorderRef.current = null;
        bestRepRef.current = null;
        try { sessionStorage.removeItem('fitvision_errors'); } catch { /* ignore */ }
        setIsTrackingStarted(true);
        isTrackingStartedRef.current = true;
        workoutStartTimeRef.current = Date.now();
    };

    const startWorkoutCountdown = () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (!prefsRef.current.countdown) {
            beginTracking();
            return;
        }
        setCountdown(3);
        let count = 3;
        countdownTimerRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) setCountdown(count);
            else {
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
                setCountdown(null);
                beginTracking();
            }
        }, 1000);
    };

    const getExerciseName = (ex: ExerciseId) => {
        if (ex === "squat") return t.camera.exerciseName.squat;
        if (ex === "deadlift") return t.camera.exerciseName.deadlift;
        return t.camera.exerciseName.benchpress;
    };
    const exerciseName = getExerciseName(currentExercise);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const debugAngleRef = useRef<HTMLDivElement>(null);
    const [isModelReady, setIsModelReady] = useState(false);
    const [areScriptsLoaded, setAreScriptsLoaded] = useState(false);
    const [isBackendReady, setIsBackendReady] = useState(false);
    const [backendStatus, setBackendStatus] = useState<"checking" | "waking" | "ready">("checking");

    // Auto-Capture Replay State
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const lastErrorTimeRef = useRef<number>(0);

    // Score smoothing: rolling window of last N predictions
    const recentPredictions = useRef<{ correct: boolean, confidence: number }[]>([]);

    // Dynamic AI State
    const [isGoodForm, setIsGoodForm] = useState(true);
    const isGoodFormRef = useRef(true);
    const [feedbackTitle, setFeedbackTitle] = useState(t.camera.feedback.aiReady);
    const [feedbackDetail, setFeedbackDetail] = useState(t.camera.feedback.startExercising);
    const [formScore, setFormScore] = useState(100);
    const [riskLevel, setRiskLevel] = useState<{ level: string; label: string; label_th: string; score: number; color: string; factors: string[]; recommendation: string } | null>(null);

    // Workout elapsed time tracking for error timestamps
    const workoutStartTimeRef = useRef<number>(0);

    // Stats tracking
    const statsRef = useRef({ scores: [] as number[], exerciseName: exerciseName });
    useEffect(() => { statsRef.current.exerciseName = exerciseName; }, [exerciseName]);

    // Ping Render backend until it wakes up
    useEffect(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://fitvision-backend-production-a307.up.railway.app";
        let attempts = 0;
        let stopped = false;

        const ping = async () => {
            if (stopped) return;
            try {
                attempts++;
                if (attempts > 1) setBackendStatus("waking");
                const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(8000) });
                if (res.ok) {
                    setIsBackendReady(true);
                    setBackendStatus("ready");
                    return;
                }
            } catch {
                // still waking — ignore error and retry
            }
            if (!stopped) setTimeout(ping, 3000);
        };

        ping();
        return () => { stopped = true; };
    }, []);

    // Developer Test Mode refs
    const cameraWrapperRef = useRef<any>(null);
    const poseWrapperRef = useRef<any>(null);
    const isMockVideoPlaying = useRef<boolean>(false);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !videoRef.current || !poseWrapperRef.current) return;

        if (cameraWrapperRef.current) {
            cameraWrapperRef.current.stop();
        }

        const videoUrl = URL.createObjectURL(file);
        const videoElement = videoRef.current;
        videoElement.srcObject = null;
        videoElement.src = videoUrl;
        videoElement.loop = true;
        videoElement.muted = true;

        isMockVideoPlaying.current = true;
        beginTracking();

        setFeedbackDetail(t.camera.feedback.processingSim);

        videoElement.play();

        const processFrame = async () => {
            if (!isMockVideoPlaying.current || !videoElement || videoElement.paused || videoElement.ended) return;
            try {
                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    await poseWrapperRef.current.send({ image: videoElement });
                }
            } catch (err) {
                console.error("Mock Video Processing Error", err);
            }
            if ((videoElement as any).requestVideoFrameCallback) {
                (videoElement as any).requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        videoElement.onplay = () => {
            if ((videoElement as any).requestVideoFrameCallback) {
                (videoElement as any).requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };
    };

    /** Close the current set: slice this set's scores and mistakes into a SetResult. */
    const finishSet = () => {
        const n = currentSetRef.current;
        if (setsRef.current.some((x) => x.set === n) || localRepCountRef.current === 0) return;
        const scores = statsRef.current.scores.slice(setStartRef.current.score);
        setsRef.current.push({
            set: n,
            reps: localRepCountRef.current,
            avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
            errorCount: errorsRef.current.length - setStartRef.current.err,
        });
    };

    const startNextSet = () => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        restTimerRef.current = null;
        setRestLeft(null);
        const n = currentSetRef.current + 1;
        currentSetRef.current = n;
        setCurrentSet(n);
        setStartRef.current = { score: statsRef.current.scores.length, err: errorsRef.current.length };
        localRepCountRef.current = 0;
        repStateRef.current = "up";
        setCurrentReps(0);
        goalCelebratedRef.current = false;
        trackerRef.current.reset();
        isTrackingStartedRef.current = true;
        if (prefsRef.current.voiceFeedback) speak(t.sets.spokenNext.replace("{n}", String(n)), language);
    };

    const startRest = () => {
        isTrackingStartedRef.current = false; // pause counting + predictions while resting
        let left = restSeconds;
        setRestLeft(left);
        if (prefsRef.current.voiceFeedback) speak(t.sets.spokenRest.replace("{s}", String(restSeconds)), language);
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        restTimerRef.current = setInterval(() => {
            left -= 1;
            if (left <= 0) {
                startNextSet();
                return;
            }
            setRestLeft(left);
            if (left <= 3 && prefsRef.current.voiceFeedback) speak(String(left), languageRef.current);
        }, 1000);
    };

    // Rep goal reached: rest before the next set, or celebrate the last one
    const goalCelebratedRef = useRef(false);
    useEffect(() => {
        if (!isTrackingStarted) { goalCelebratedRef.current = false; return; }
        if (currentReps >= repGoal && repGoal > 0 && !goalCelebratedRef.current && restLeft === null) {
            goalCelebratedRef.current = true;
            try { navigator.vibrate?.([80, 60, 80]); } catch { /* not supported */ }
            if (currentSetRef.current < setGoal) {
                finishSet();
                startRest();
            } else if (prefsRef.current.voiceFeedback) {
                speak(t.motivation.spokenGoal, language);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentReps, repGoal, isTrackingStarted, restLeft]);

    useEffect(() => {
        const active = loadMissions().active;
        const parsed = active ? parseIssueKey(active.key) : null;
        const label = active ? (parsed ? describeIssue(parsed, t.body).title : active.label) : "";
        setMissionFocus(active && active.exerciseId === currentExercise ? { key: active.key, label } : null);
    }, [currentExercise, t]);

    useEffect(() => {
        ghostRef.current = loadGhost(currentExercise);
        setHasGhost(ghostRef.current !== null);
        recorderRef.current = null;
    }, [currentExercise]);

    useEffect(() => () => { if (restTimerRef.current) clearInterval(restTimerRef.current); }, []);

    const exerciseRef = useRef(currentExercise);
    useEffect(() => {
        exerciseRef.current = currentExercise;
        setIsGoodForm(true);
        isGoodFormRef.current = true;
        setFeedbackTitle(t.camera.feedback.aiReady);
        setFeedbackDetail(t.camera.feedback.waitForAI);
        setFormScore(100);
        setCurrentReps(0);
        localRepCountRef.current = 0;
        repStateRef.current = "up";
    }, [currentExercise, t]);

    useEffect(() => {
        if (!areScriptsLoaded) return;

        const win = window as any;
        const Pose = win.Pose;
        const Camera = win.Camera;
        const drawConnectors = win.drawConnectors;
        const drawLandmarks = win.drawLandmarks;
        const POSE_CONNECTIONS = win.POSE_CONNECTIONS;

        if (!Pose || !Camera) return;

        let camera: any = null;
        let isUnmounted = false;
        let frameCount = 0;
        let isPredicting = false;
        let lastSpokenAt = 0;

        const initMediaPipe = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const canvasCtx = canvasElement.getContext("2d");

            const pose = new Pose({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                },
            });
            poseWrapperRef.current = pose;

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            pose.onResults(async (results: any) => {
                if (isUnmounted) return;
                setIsModelReady(true);

                if (!canvasCtx || !canvasElement || !videoElement) return;

                if (canvasElement.width !== videoElement.videoWidth) {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                }

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                if (results.image) {
                    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
                } else if (videoElement && videoElement.videoWidth > 0) {
                    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                }

                if (results.poseLandmarks) {
                    const isGood = isGoodFormRef.current;
                    const primaryColor = isGood ? "#38ff14" : "#ff1e1e";

                    canvasCtx.save();
                    canvasCtx.shadowBlur = 15;
                    canvasCtx.shadowColor = primaryColor;

                    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: primaryColor, lineWidth: 6 });

                    canvasCtx.shadowBlur = 0;
                    drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#ffffff", fillColor: primaryColor, lineWidth: 2, radius: 4 });

                    canvasCtx.restore();

                    frameCount++;
                    const lm = results.poseLandmarks;
                    const exercise = exerciseRef.current;
                    const features = [
                        calculateAngle(lm[11], lm[13], lm[15]),  // [0] left_elbow_angle
                        calculateAngle(lm[12], lm[14], lm[16]),  // [1] right_elbow_angle
                        calculateAngle(lm[23], lm[11], lm[13]),  // [2] left_shoulder_angle
                        calculateAngle(lm[24], lm[12], lm[14]),  // [3] right_shoulder_angle
                        calculateAngle(lm[11], lm[23], lm[25]),  // [4] left_hip_angle
                        calculateAngle(lm[12], lm[24], lm[26]),  // [5] right_hip_angle
                        calculateAngle(lm[23], lm[25], lm[27]),  // [6] left_knee_angle
                        calculateAngle(lm[24], lm[26], lm[28]),  // [7] right_knee_angle
                        // Distances must be computed exactly like training (extract_features.py):
                        // 2D Euclidean, torso = left shoulder → left hip. See AGENTS.md Gotcha #12.
                        dist2d(lm[11], lm[12]),                  // [8] shoulder_width
                        dist2d(lm[23], lm[24]),                  // [9] hip_width
                        dist2d(lm[11], lm[23]),                  // [10] torso_length
                    ];
                    // Compute symmetry from angles already calculated above
                    const elbow_symmetry = Math.abs(features[0] - features[1]);  // [11]
                    const knee_symmetry = Math.abs(features[6] - features[7]);   // [12]
                    features.push(elbow_symmetry, knee_symmetry);

                    if (isTrackingStartedRef.current) {
                        let mainAngle = 0;
                        let upThreshold = 150;
                        let downThreshold = 100;

                        if (exercise === "squat") {
                            mainAngle = (features[6] + features[7]) / 2;
                            upThreshold = 160;
                            downThreshold = 110;
                        } else if (exercise === "deadlift") {
                            mainAngle = (features[4] + features[5]) / 2;
                            upThreshold = 165;
                            downThreshold = 120;
                        } else if (exercise === "benchpress") {
                            // Use elbow angle (shoulder-elbow-wrist) for scale-invariant rep counting
                            const leftElbowAngle = calculateAngle(lm[11], lm[13], lm[15]);
                            const rightElbowAngle = calculateAngle(lm[12], lm[14], lm[16]);
                            mainAngle = (leftElbowAngle + rightElbowAngle) / 2;
                            upThreshold = 155;
                            downThreshold = 95;
                        }

                        if (debugAngleRef.current) {
                            debugAngleRef.current.innerText = `Angle: ${Math.round(mainAngle)} | State: ${repStateRef.current}`;
                        }

                        // Record this frame for the ghost rep (clean = good form and no body-part warning)
                        const cw = canvasElement.width;
                        const ch = canvasElement.height;
                        if (!recorderRef.current || recorderRef.current.exercise !== exercise) {
                            recorderRef.current = { exercise, rec: new RepRecorder(exercise, upThreshold) };
                        }
                        recorderRef.current.rec.push(lm, mainAngle, isGoodFormRef.current && trackerRef.current.current().length === 0, cw, ch);

                        if (mainAngle > upThreshold) {
                            if (repStateRef.current === "down") {
                                const rep = recorderRef.current.rec.completeRep();
                                if (rep && isBetterGhost(rep, bestRepRef.current)) bestRepRef.current = rep;
                                localRepCountRef.current += 1;
                                setCurrentReps(localRepCountRef.current);
                                if (prefsRef.current.voiceFeedback) {
                                    speak(String(localRepCountRef.current), languageRef.current);
                                    lastSpokenAt = Date.now();
                                }
                            }
                            repStateRef.current = "up";
                        } else if (mainAngle < downThreshold) {
                            repStateRef.current = "down";
                        }

                        // Ghost of the best rep, matched to how deep the person is right now
                        if (showGhostRef.current && ghostRef.current && ghostRef.current.exerciseId === exercise) {
                            drawGhost(canvasCtx, ghostRef.current, lm, mainAngle, repStateRef.current === "up", cw, ch);
                        }
                    }

                    // ── Where is the form off? (body part + side) ──
                    if (isTrackingStartedRef.current) {
                        const started = trackerRef.current.update(analyzePose(lm, exercise));
                        const active = trackerRef.current.current();

                        // Ring the offending joints on the skeleton
                        canvasCtx.save();
                        canvasCtx.lineWidth = 5;
                        canvasCtx.strokeStyle = "#FDBA74";
                        for (const issue of active) {
                            for (const j of issue.joints) {
                                const p = lm[j];
                                if (!p) continue;
                                canvasCtx.beginPath();
                                canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 22, 0, Math.PI * 2);
                                canvasCtx.stroke();
                            }
                        }
                        canvasCtx.restore();

                        const top = active[0] ?? null;
                        const topKey = top ? issueKey(top) : "";
                        if (topKey !== topIssueKeyRef.current) {
                            topIssueKeyRef.current = topKey;
                            setTopIssue(top);
                        }

                        for (const issue of started) {
                            const key = issueKey(issue);
                            const now = Date.now();
                            if (now - (issueLoggedAtRef.current.get(key) ?? 0) < 5000) continue;
                            issueLoggedAtRef.current.set(key, now);
                            const text = describeIssue(issue, tRef.current.body);
                            const elapsedSec = Math.round((now - workoutStartTimeRef.current) / 1000);
                            errorsRef.current.push({
                                title: text.title,
                                detail: text.cue,
                                time: new Date(now).toLocaleTimeString(),
                                elapsedSeconds: elapsedSec,
                                elapsedFormatted: `${Math.floor(elapsedSec / 60)}:${(elapsedSec % 60).toString().padStart(2, '0')}`,
                                repNumber: localRepCountRef.current,
                                riskColor: '#FDBA74',
                                exercise,
                                issueKey: key,
                                setNumber: currentSetRef.current,
                            });
                            try { sessionStorage.setItem('fitvision_errors', JSON.stringify(errorsRef.current)); } catch { /* ignore */ }
                            if (prefsRef.current.voiceFeedback && now - lastSpokenAt > 3500) {
                                speak(text.cue, languageRef.current);
                                lastSpokenAt = now;
                            }
                        }
                    }

                    if (frameCount % 5 === 0 && !isPredicting && isTrackingStartedRef.current) {
                        isPredicting = true;

                        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://fitvision-backend-production-a307.up.railway.app";

                        (async () => {
                            try {
                                let payload: any;
                                if (exercise === 'squat') {
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
                                        hip_depth: mid_hip.y
                                    };
                                } else {
                                    payload = { features };
                                }

                                const res = await fetch(`${API_BASE_URL}/predict/${exercise}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });

                                if (res.ok) {
                                    const data = await res.json();

                                    recentPredictions.current.push({ correct: data.form_correct, confidence: data.confidence });
                                    if (recentPredictions.current.length > 5) recentPredictions.current.shift();

                                    const window = recentPredictions.current;
                                    const incorrectCount = window.filter(p => !p.correct).length;
                                    const isFormCorrect = incorrectCount < Math.ceil(window.length / 2);

                                    const wasGood = isGoodFormRef.current;
                                    setIsGoodForm(isFormCorrect);
                                    isGoodFormRef.current = isFormCorrect;
                                    setFeedbackDetail(data.feedback);
                                    setFeedbackTitle(isFormCorrect ? tRef.current.camera.feedback.goodForm : tRef.current.camera.feedback.correctionNeeded);

                                    // Spoken cue when form turns bad — the user is 2–3 m from the screen
                                    if (wasGood && !isFormCorrect && prefsRef.current.voiceFeedback && Date.now() - lastSpokenAt > 4000) {
                                        speak(data.feedback || tRef.current.camera.feedback.correctionNeeded, languageRef.current);
                                        lastSpokenAt = Date.now();
                                    }

                                    let rawScore: number;
                                    if (isFormCorrect) {
                                        const correctPreds = window.filter(p => p.correct);
                                        const avgConf = correctPreds.length > 0 ? correctPreds.reduce((s, p) => s + p.confidence, 0) / correctPreds.length : 0.8;
                                        rawScore = avgConf * 100;
                                        if (rawScore > 98) rawScore = 98;
                                        if (rawScore < 70) rawScore = 70;
                                    } else {
                                        const badPreds = window.filter(p => !p.correct);
                                        const avgConf = badPreds.length > 0 ? badPreds.reduce((s, p) => s + p.confidence, 0) / badPreds.length : 0.5;
                                        rawScore = (1 - avgConf) * 100;
                                        rawScore = Math.max(15, Math.min(55, rawScore));
                                    }
                                    const currentScore = Math.round(Math.max(0, Math.min(100, rawScore)));

                                    setFormScore(currentScore);
                                    statsRef.current.scores.push(currentScore);

                                    // Parse injury risk assessment from API
                                    if (data.risk_assessment) {
                                        setRiskLevel({
                                            level: data.risk_assessment.risk_level,
                                            label: data.risk_assessment.risk_label,
                                            label_th: data.risk_assessment.risk_label_th,
                                            score: data.risk_assessment.risk_score,
                                            color: data.risk_assessment.risk_color,
                                            factors: data.risk_assessment.risk_factors,
                                            recommendation: data.risk_assessment.recommendation,
                                        });
                                    }

                                    if (!isFormCorrect) {
                                        const now = Date.now();
                                        if (now - lastErrorTimeRef.current > 6000) {
                                            lastErrorTimeRef.current = now;

                                            // Record the mistake right away so it is counted even if
                                            // the workout ends before the clip finishes recording.
                                            const elapsedSec = Math.round((now - workoutStartTimeRef.current) / 1000);
                                            const errorRecord: ErrorRecord = {
                                                title: data.error_type || tRef.current.camera.feedback.correctionNeeded,
                                                detail: data.feedback,
                                                time: new Date(now).toLocaleTimeString(),
                                                elapsedSeconds: elapsedSec,
                                                elapsedFormatted: `${Math.floor(elapsedSec / 60)}:${(elapsedSec % 60).toString().padStart(2, '0')}`,
                                                repNumber: localRepCountRef.current,
                                                riskLevel: data.risk_assessment?.risk_level || 'unknown',
                                                riskScore: data.risk_assessment?.risk_score || 0,
                                                riskLabelTh: data.risk_assessment?.risk_label_th || '',
                                                riskColor: data.risk_assessment?.risk_color || '#f59e0b',
                                                riskFactors: data.risk_assessment?.risk_factors || [],
                                                recommendation: data.risk_assessment?.recommendation || '',
                                                exercise: exercise,
                                            };
                                            errorsRef.current.push(errorRecord);
                                            try { sessionStorage.setItem('fitvision_errors', JSON.stringify(errorsRef.current)); } catch { /* ignore */ }

                                            if (prefsRef.current.autoSaveClips && typeof MediaRecorder !== 'undefined') {
                                                try {
                                                    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                                                        mediaRecorderRef.current.stop();
                                                    }
                                                    const stream = (canvasElement as any).captureStream(30);
                                                    const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
                                                    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                                                    const chunks: Blob[] = [];

                                                    recorder.ondataavailable = (e) => {
                                                        if (e.data.size > 0) chunks.push(e.data);
                                                    };

                                                    recorder.onstop = () => {
                                                        if (chunks.length === 0) return;
                                                        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
                                                        errorRecord.url = URL.createObjectURL(blob);
                                                        try { sessionStorage.setItem('fitvision_errors', JSON.stringify(errorsRef.current)); } catch { /* ignore */ }
                                                    };

                                                    recorder.start();
                                                    mediaRecorderRef.current = recorder;

                                                    setTimeout(() => {
                                                        if (recorder.state !== 'inactive') {
                                                            recorder.stop();
                                                        }
                                                    }, 3000);
                                                } catch (err) {
                                                    console.warn("Failed to start on-demand MediaRecorder", err);
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    const errText = await res.text();
                                    console.error(`API Error ${res.status}:`, errText);
                                    setFeedbackDetail(res.status === 429 || res.status >= 500
                                        ? tRef.current.camera.serverBusy
                                        : `Backend Error: ${res.status}`);
                                }
                            } catch (e) {
                                console.error("AI Predict Error", e);
                            } finally {
                                isPredicting = false;
                            }
                        })();
                    }
                }
                canvasCtx.restore();
            });

            camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (isUnmounted) return;
                    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                        try {
                            if (!isMockVideoPlaying.current) {
                                await poseWrapperRef.current?.send({ image: videoElement });
                            }
                        } catch (e) {
                            console.error("Mediapipe Error onFrame", e);
                        }
                    }
                },
                width: 640,
                height: 480,
                facingMode: facingMode
            });
            cameraWrapperRef.current = camera;
            camera.start();
        };

        initMediaPipe();

        return () => {
            isUnmounted = true;
            if (cameraWrapperRef.current) {
                cameraWrapperRef.current.stop();
            }
            if (poseWrapperRef.current) {
                poseWrapperRef.current.close();
            }
            isMockVideoPlaying.current = false;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [areScriptsLoaded, facingMode]);

    const endWorkoutData = async () => {
        // Both the HUD and the "complete" overlay can end a session — only save once.
        if (sessionEndedRef.current) return;
        sessionEndedRef.current = true;
        isTrackingStartedRef.current = false;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();

        if (restTimerRef.current) clearInterval(restTimerRef.current);
        finishSet();
        const sets = [...setsRef.current];
        const totalReps = sets.length ? sets.reduce((a, x) => a + x.reps, 0) : localRepCountRef.current;

        const scores = statsRef.current.scores;
        // null (not 100) when the AI server never answered — don't show a fake perfect score
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const errors = [...errorsRef.current];

        const sessionPayload: WorkoutSession = {
            id: Date.now().toString(),
            exerciseId: currentExercise,
            exercise: exerciseName,
            avgScore,
            errorCount: errors.length,
            completedReps: totalReps,
            repGoal: repGoal * Math.max(1, sets.length || 1),
            timestamp: new Date().toISOString(),
            errors,
            setGoal,
            sets: sets.length > 1 || setGoal > 1 ? sets : undefined,
            weightKg,
            restSeconds: setGoal > 1 ? restSeconds : undefined,
        };

        // Errors array is shared so clip URLs that finish after this point still reach the summary
        errorsRef.current = errors;
        setCurrentSession(sessionPayload, true);
        saveSessionToHistory(sessionPayload);

        // Keep this session's cleanest rep as the ghost if it beats the saved one
        const best = bestRepRef.current;
        if (best && isBetterGhost(best, loadGhost(best.exerciseId))) {
            saveGhost(best);
            try { sessionStorage.setItem("fitvision_ghost_saved", sessionPayload.id); } catch { /* ignore */ }
        }

        // Cloud backup + weekly totals for friends (both no-ops unless signed in with Supabase)
        void pushSession(sessionPayload).then(() => publishMyStats()).catch(() => { /* offline — next sync catches up */ });

        if (!isSupabaseConfigured) return;
        try {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase.from('workout_history').insert({
                    user_id: session.user.id,
                    exercise_type: currentExercise,
                    reps: localRepCountRef.current,
                    average_confidence: avgScore,
                });
            }
        } catch (e) {
            console.error("Failed to save workout to Supabase", e);
        }
    };

    return (
        <div className="bg-black font-display text-white h-screen flex flex-col overflow-hidden">
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" strategy="lazyOnload"
                onLoad={() => { setTimeout(() => setAreScriptsLoaded(true), 500); }}
            />

            <div className="flex flex-col lg:flex-row flex-1 h-full overflow-hidden">
                {/* ── Camera View ── */}
                <div className="relative flex-1 flex flex-col min-h-0">
                    <video ref={videoRef} autoPlay playsInline muted
                        className="absolute inset-0 z-0 w-full h-full object-cover"
                        style={{ filter: "brightness(0.6) contrast(1.1)", transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)" }}
                    />
                    <canvas ref={canvasRef}
                        className="absolute inset-0 z-10 w-full h-full object-cover pointer-events-none"
                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)" }}
                    />

                    {/* Debug Display — dev only */}
                    {process.env.NODE_ENV === "development" && (
                    <div ref={debugAngleRef} className="absolute bottom-48 left-4 z-50 bg-black/70 text-primary font-mono p-2 rounded text-sm pointer-events-none border border-primary/30">
                        Angle: 0 | State: up
                    </div>
                    )}

                    {/* Top Bar */}
                    <header className="relative z-30 flex items-center justify-between p-3 md:p-4">
                        <Link href="/" className="flex items-center gap-1.5 text-white/80 hover:text-white bg-black/30 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 transition-colors">
                            <span className="material-symbols-outlined text-lg">arrow_back_ios_new</span>
                            <span className="text-sm font-semibold hidden sm:block">{t.camera.back}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <button type="button" aria-label={language === "th" ? "สลับกล้องหน้า/หลัง" : "Switch camera"} onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
                                className="lg:hidden flex items-center justify-center w-10 h-10 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white/80 active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-lg">flip_camera_ios</span>
                            </button>
                            {isTrackingStarted && (
                                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white/80 tracking-wider">
                                    <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>{t.camera.aiActive}
                                </div>
                            )}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider ${isModelReady ? "bg-red-600/80 text-white" : "bg-orange-500/80 text-white"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full bg-white ${isModelReady ? "animate-pulse" : ""}`}></div>
                                {isModelReady ? t.camera.live : t.camera.loading}
                            </div>
                        </div>
                    </header>

                    {/* ── Warmup Overlay ── */}
                    {!isTrackingStarted && (
                        <div className="absolute inset-0 z-40 flex flex-col">
                            {/* Countdown overlay */}
                            {countdown !== null && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                                    <div className="text-8xl md:text-9xl font-black text-primary drop- ">{countdown}</div>
                                </div>
                            )}

                            {/* Main warmup card */}
                            {countdown === null && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-4 md:pb-6 px-3 md:px-4 z-40">
                                    {isSetupMinimized ? (
                                        /* Collapsed View: Floating Mini Action Bar for 100% Full Camera Framing */
                                        <div className="max-w-md mx-auto flex items-center justify-between gap-2 bg-[#0a100b]/80 backdrop-blur-xl border border-primary/30 rounded-2xl p-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <button
                                                type="button"
                                                onClick={() => setIsSetupMinimized(false)}
                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 touch-manipulation"
                                            >
                                                <span className="material-symbols-outlined text-base text-primary">tune</span>
                                                <span className="truncate max-w-[130px]">{exerciseName} ({repGoal})</span>
                                                <span className="material-symbols-outlined text-sm text-slate-400">expand_less</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={startWorkoutCountdown}
                                                disabled={!isModelReady}
                                                className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                                                    isModelReady
                                                        ? "bg-primary text-black hover:bg-primary/90"
                                                        : "bg-white/10 text-slate-400 cursor-not-allowed"
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-lg font-bold">play_arrow</span>
                                                <span>{language === "th" ? "เริ่มออกกำลังกาย" : "START"}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Expanded View */
                                        <div className="max-w-md mx-auto flex flex-col gap-2.5 md:gap-3.5 bg-[#0a100b]/80 backdrop-blur-xl border border-primary/25 rounded-3xl p-3.5 md:p-5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">

                                            {/* Header: Title + Minimize Button */}
                                            <div className="flex items-center justify-between pb-1 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-7 md:size-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined text-base md:text-lg font-bold">tune</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-black text-xs md:text-sm tracking-tight leading-none">
                                                            {language === "th" ? "ตั้งค่าก่อนเริ่มฝึก" : "Workout Setup"}
                                                        </h3>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {language === "th" ? "เลือกท่าและเป้าหมาย" : "Configure exercise & target"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Minimize to preview full camera */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSetupMinimized(true)}
                                                    className="flex items-center gap-1 min-h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
                                                    title={language === "th" ? "ซ่อนการ์ดเพื่อดูมุมกล้องเต็มจอ" : "Minimize to check full camera"}
                                                >
                                                    <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                                                    <span>{language === "th" ? "ดูกล้องเต็มจอ" : "Full View"}</span>
                                                    <span className="material-symbols-outlined text-xs">expand_more</span>
                                                </button>
                                            </div>

                                            {/* ── 3-Point System Telemetry Status Bar ── */}
                                            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 text-xs md:text-sm font-semibold">
                                                {/* 1. Camera */}
                                                <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                    areScriptsLoaded 
                                                        ? "bg-primary/10 border-primary/30 text-primary" 
                                                        : "bg-white/5 border-white/5 text-slate-400"
                                                }`}>
                                                    <span className={`size-1.5 rounded-full shrink-0 ${areScriptsLoaded ? "bg-primary" : "bg-slate-500 animate-pulse"}`} />
                                                    <span className="material-symbols-outlined text-xs shrink-0">{areScriptsLoaded ? "check_circle" : "videocam"}</span>
                                                    <span className="truncate">{language === "th" ? "กล้อง" : "Camera"}{areScriptsLoaded ? "" : "…"}</span>
                                                </div>

                                                {/* 2. Pose AI */}
                                                <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                    isModelReady 
                                                        ? "bg-primary/10 border-primary/30 text-primary" 
                                                        : "bg-white/5 border-white/5 text-slate-400"
                                                }`}>
                                                    <span className={`size-1.5 rounded-full shrink-0 ${isModelReady ? "bg-primary" : "bg-slate-500 animate-pulse"}`} />
                                                    <span className="material-symbols-outlined text-xs shrink-0">{isModelReady ? "check_circle" : "psychology"}</span>
                                                    <span className="truncate">{language === "th" ? "ตรวจจับท่า" : "Pose AI"}{isModelReady ? "" : "…"}</span>
                                                </div>

                                                {/* 3. AI Server */}
                                                <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                    isBackendReady 
                                                        ? "bg-primary/10 border-primary/30 text-primary" 
                                                        : backendStatus === "waking"
                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                                            : "bg-white/5 border-white/5 text-slate-400"
                                                }`}>
                                                    <span className={`size-1.5 rounded-full shrink-0 ${isBackendReady ? "bg-primary" : "bg-amber-400 animate-pulse"}`} />
                                                    <span className="material-symbols-outlined text-xs shrink-0">{isBackendReady ? "check_circle" : "cloud_sync"}</span>
                                                    <span className="truncate">
                                                        {language === "th" ? "เซิร์ฟเวอร์" : "Server"}{isBackendReady ? "" : "…"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subtle server connecting status message if not ready */}
                                            {!isBackendReady && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs md:text-sm leading-tight">
                                                    <span className="material-symbols-outlined text-xs text-amber-400 shrink-0">info</span>
                                                    <span className="truncate">
                                                        {language === "th" 
                                                            ? "คลาวด์ AI กำลังเชื่อมต่อ (สามารถเริ่มฝึกและนับรอบได้ทันที)" 
                                                            : "Cloud AI connecting (live pose tracking is ready to start)"}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Exercise Selector: 3 Segmented Interactive Cards */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-slate-400 text-xs md:text-sm uppercase tracking-wider font-bold">
                                                    {t.camera.warmup.exerciseLabel}
                                                </label>
                                                <div className="grid grid-cols-3 gap-1.5 md:gap-2.5">
                                                    {[
                                                        { 
                                                            id: "benchpress", 
                                                            name: t.camera.exerciseName.benchpress, 
                                                            icon: "fitness_center", 
                                                            focus: language === "th" ? "อก • หลังแขน" : "Chest & Arms" 
                                                        },
                                                        { 
                                                            id: "squat", 
                                                            name: t.camera.exerciseName.squat, 
                                                            icon: "accessibility_new", 
                                                            focus: language === "th" ? "ต้นขา • สะโพก" : "Quads & Glutes" 
                                                        },
                                                        { 
                                                            id: "deadlift", 
                                                            name: t.camera.exerciseName.deadlift, 
                                                            icon: "sports_gymnastics", 
                                                            focus: language === "th" ? "หลัง • แฮมสตริง" : "Back & Core" 
                                                        },
                                                    ].map((item) => {
                                                        const isSelected = currentExercise === item.id;
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => setCurrentExercise(item.id as ExerciseId)}
                                                                className={`flex flex-col items-center justify-center p-2 md:p-3 rounded-2xl border transition-all text-center group cursor-pointer relative touch-manipulation ${
                                                                    isSelected
                                                                        ? "bg-primary/15 border-primary text-white ring-1 ring-primary/40"
                                                                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-slate-300 active:scale-95"
                                                                }`}
                                                            >
                                                                {isSelected && (
                                                                    <div className="absolute top-1.5 right-1.5 size-1.5 md:size-2 rounded-full bg-primary" />
                                                                )}
                                                                <div className={`size-8 md:size-10 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${
                                                                    isSelected ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-400 group-hover:text-white"
                                                                }`}>
                                                                <span className="material-symbols-outlined text-xl md:text-2xl">{item.icon}</span>
                                                            </div>
                                                            <span className={`text-sm font-black tracking-tight leading-tight ${isSelected ? "text-white" : "text-slate-200"}`}>
                                                                {item.name}
                                                            </span>
                                                            <span className={`text-xs mt-0.5 font-medium leading-none ${isSelected ? "text-primary/90" : "text-slate-400"}`}>
                                                                {item.focus}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Goal Reps Selector with Presets & Stepper */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 md:p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <div className="size-7 md:size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                                    <span className="material-symbols-outlined text-sm md:text-base">flag</span>
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-bold leading-tight">
                                                        {language === "th" ? "เป้าหมาย" : "Target Reps"}
                                                    </div>
                                                    <div className="text-slate-400 text-xs hidden sm:block">
                                                        {language === "th" ? "นับรอบและวิเคราะห์ทุกครั้ง" : "AI counts reps & tracks tempo"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1 md:gap-2 ml-auto">
                                                {/* Preset Pills */}
                                                <div className="flex items-center gap-1">
                                                    {[8, 10, 12, 15].map((preset) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => setRepGoal(preset)}
                                                            className={`min-w-10 h-10 px-2 rounded-lg text-sm font-bold transition-all cursor-pointer touch-manipulation ${
                                                                repGoal === preset
                                                                    ? "bg-primary text-black font-black"
                                                                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                                                            }`}
                                                        >
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Stepper */}
                                                <div className="flex items-center bg-black/40 border border-white/15 rounded-xl px-1 py-0.5 ml-0.5">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setRepGoal(r => Math.max(1, r - 1))} 
                                                        className="text-slate-300 hover:text-white w-10 h-10 flex items-center justify-center text-base font-bold rounded-lg hover:bg-white/10 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="text-primary font-black text-sm md:text-base w-8 text-center font-mono">
                                                        {repGoal}
                                                    </span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setRepGoal(r => Math.min(50, r + 1))} 
                                                        className="text-slate-300 hover:text-white w-10 h-10 flex items-center justify-center text-base font-bold rounded-lg hover:bg-white/10 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Action Button */}
                                        <button
                                            type="button"
                                            onClick={startWorkoutCountdown}
                                            disabled={!isModelReady}
                                            className={`w-full py-3 md:py-3.5 rounded-2xl text-sm md:text-base font-semibold shadow-xl transition-all flex items-center justify-center gap-2 touch-manipulation ${
                                                isModelReady
                                                    ? "bg-primary text-black hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                                                    : "bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed"
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-xl md:text-2xl font-bold">
                                                {isModelReady ? "play_arrow" : "hourglass_top"}
                                            </span>
                                            <span>
                                                {isModelReady
                                                    ? (language === "th" ? "เริ่มออกกำลังกาย" : t.camera.warmup.startAnalysis)
                                                    : (language === "th" ? "กำลังเตรียมระบบกล้อง AI..." : t.camera.warmup.loadingPose)}
                                            </span>
                                        </button>

                                        {/* Video Upload Fallback */}
                                        <label className={`w-full min-h-11 py-2 rounded-xl text-sm font-semibold tracking-wider transition-all flex items-center justify-center gap-2 border touch-manipulation ${
                                            isModelReady 
                                                ? "border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-98 cursor-pointer" 
                                                : "border-white/10 text-slate-400 opacity-60 pointer-events-none"
                                        }`}>
                                            <span className="material-symbols-outlined text-sm md:text-base text-primary">upload_file</span>
                                            <span>{t.camera.warmup.uploadVideo}</span>
                                            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={!isModelReady} />
                                        </label>
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Workout Complete Overlay ── */}
                    {isTrackingStarted && currentReps >= repGoal && repGoal > 0 && currentSet >= setGoal && restLeft === null && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center flex items-center flex-col animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-5 border border-primary/30">
                                    <span className="material-symbols-outlined text-primary text-5xl">task_alt</span>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">{t.motivation.goalHit.replace("{n}", String(repGoal))}</h2>
                                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                                    {t.camera.workoutComplete.subtitle1} <strong>{repGoal}</strong> {t.camera.reps.toLowerCase()} {t.camera.workoutComplete.subtitle2} <strong>{exerciseName}</strong>.
                                </p>
                                
                                <Link href="/summary" onClick={endWorkoutData}
                                    className="w-full py-4 bg-primary text-black font-semibold rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
                                    <span className="material-symbols-outlined text-xl">analytics</span>
                                    {t.camera.workoutComplete.viewSummary}
                                </Link>
                                
                                <button 
                                    type="button"
                                    onClick={() => setRepGoal(prev => prev + 5)}
                                    className="mt-4 text-white/40 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors py-2">
                                    {t.camera.workoutComplete.continue}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Rest between sets ── */}
                    {restLeft !== null && (
                        <div role="timer" aria-live="polite" className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6">
                            <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
                                <p className="text-lg text-slate-300">{t.sets.resting} · {t.sets.setOf.replace("{n}", String(currentSet)).replace("{total}", String(setGoal))} ✓</p>
                                <p className="text-sm text-slate-400">{t.sets.nextIn.replace("{n}", String(currentSet + 1))}</p>
                                <p className="text-8xl font-bold text-white tabular-nums leading-none">{restLeft}</p>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(restLeft / restSeconds) * 100}%` }} />
                                </div>
                                {setsRef.current.length > 0 && (
                                    <p className="text-sm text-slate-300">
                                        {t.sets.set} {setsRef.current[setsRef.current.length - 1].set}: {setsRef.current[setsRef.current.length - 1].reps} {t.sets.reps}
                                        {setsRef.current[setsRef.current.length - 1].avgScore !== null && ` · ${t.sets.score} ${setsRef.current[setsRef.current.length - 1].avgScore}%`}
                                    </p>
                                )}
                                <button type="button" onClick={startNextSet} className="mt-2 h-14 w-full rounded-2xl bg-primary text-background-dark font-semibold text-lg cursor-pointer">
                                    {t.sets.skipRest}
                                </button>
                            </div>
                        </div>
                    )}

                    <CameraMobileHUD props={{
                        t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, 
                        currentReps, repGoal, exerciseName, endWorkoutData, riskLevel,
                        issue: topIssue ? describeIssue(topIssue, t.body) : null,
                        setLabel: setGoal > 1 ? t.sets.setOf.replace("{n}", String(currentSet)).replace("{total}", String(setGoal)) : null,
                        missionFocus: missionFocus ? t.missions.focus.replace("{cue}", missionFocus.label) : null,
                        ghost: { available: hasGhost, on: showGhost, toggle: toggleGhost },
                    }} />
                </div>

                <CameraDesktopPanel props={{
                        t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, 
                        currentReps, repGoal, exerciseName, endWorkoutData, riskLevel,
                        issue: topIssue ? describeIssue(topIssue, t.body) : null,
                        setLabel: setGoal > 1 ? t.sets.setOf.replace("{n}", String(currentSet)).replace("{total}", String(setGoal)) : null,
                        missionFocus: missionFocus ? t.missions.focus.replace("{cue}", missionFocus.label) : null,
                        ghost: { available: hasGhost, on: showGhost, toggle: toggleGhost },
                    }} />
            </div>
        </div>
    );
}

export default function CameraPage() {
    const { t } = useLanguage();
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">{t.camera.loadingCamera}</div>}>
            <CameraContent />
        </Suspense>
    );
}
