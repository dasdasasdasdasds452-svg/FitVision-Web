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
import type { MediaPipePose, MediaPipeWindow, PoseResults } from "@/types/mediapipe";

type Facing = "user" | "environment";

const BACK_LABEL = /back|rear|environment|world|หลัง/i;
const FRONT_LABEL = /front|user|facetime|selfie|หน้า/i;

/** Which way a track faces: what the browser reports, else a guess from the device label. */
function facingOfTrack(track: MediaStreamTrack | undefined): Facing | null {
    if (!track) return null;
    const reported = track.getSettings().facingMode;
    if (reported === "environment" || reported === "user") return reported;
    if (BACK_LABEL.test(track.label)) return "environment";
    if (FRONT_LABEL.test(track.label)) return "user";
    return null;
}

/** Another camera to try when `facingMode` can't move us off the current one (e.g. some Android phones). */
function pickOtherCamera(cams: MediaDeviceInfo[], currentId: string | null, want: Facing): string | null {
    const others = cams.filter((c) => c.deviceId && c.deviceId !== currentId);
    if (others.length === 0) return null;
    const byLabel = others.find((c) => (want === "environment" ? BACK_LABEL : FRONT_LABEL).test(c.label));
    if (byLabel) return byLabel.deviceId;
    // No useful labels: take the next camera after the current one in the list
    const i = cams.findIndex((c) => c.deviceId === currentId);
    return (cams.slice(i + 1).find((c) => c.deviceId !== currentId) ?? others[0]).deviceId;
}

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
    /** What the camera effect should open: `isSwitch` = flip away from the camera that is open now. */
    const [cameraRequest, setCameraRequest] = useState<{ facing: Facing; isSwitch: boolean; n: number }>(
        { facing: "user", isSwitch: false, n: 0 });
    /** Which way the open camera really faces (desktop webcams may ignore the request). */
    const [actualFacing, setActualFacing] = useState<Facing>("user");
    const [cameraCount, setCameraCount] = useState(0); // 0 = not known yet
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(true);
    const [cameraError, setCameraError] = useState(false);
    const [cameraNotice, setCameraNotice] = useState<{ text: string; failed: boolean } | null>(null);
    const cameraNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const deviceIdRef = useRef<string | null>(null);
    /** Camera opens run one after another — a phone can't open the next camera while the last is still opening. */
    const cameraQueueRef = useRef<Promise<void>>(Promise.resolve());
    const switchCamera = () => {
        if (isSwitchingCamera) return;
        setIsSwitchingCamera(true);
        setCameraError(false);
        setCameraRequest((r) => ({ facing: actualFacing === "user" ? "environment" : "user", isSwitch: true, n: r.n + 1 }));
    };
    const retryCamera = () => {
        setIsSwitchingCamera(true);
        setCameraError(false);
        setCameraRequest((r) => ({ ...r, isSwitch: false, n: r.n + 1 }));
    };
    const showCameraNotice = (text: string, failed: boolean) => {
        if (cameraNoticeTimerRef.current) clearTimeout(cameraNoticeTimerRef.current);
        setCameraNotice({ text, failed });
        cameraNoticeTimerRef.current = setTimeout(() => setCameraNotice(null), failed ? 3500 : 1600);
    };
    useEffect(() => () => { if (cameraNoticeTimerRef.current) clearTimeout(cameraNoticeTimerRef.current); }, []);
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
    const poseWrapperRef = useRef<MediaPipePose | null>(null);
    const isMockVideoPlaying = useRef<boolean>(false);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !videoRef.current || !poseWrapperRef.current) return;

        // Release the live camera; the uploaded video takes its place in the same <video>.
        (videoRef.current.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());

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
                    await poseWrapperRef.current?.send({ image: videoElement });
                }
            } catch (err) {
                console.error("Mock Video Processing Error", err);
            }
            if ("requestVideoFrameCallback" in videoElement) {
                videoElement.requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        videoElement.onplay = () => {
            if ("requestVideoFrameCallback" in videoElement) {
                videoElement.requestVideoFrameCallback(processFrame);
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

        const win = window as unknown as MediaPipeWindow;
        const Pose = win.Pose;
        const drawConnectors = win.drawConnectors;
        const drawLandmarks = win.drawLandmarks;
        const POSE_CONNECTIONS = win.POSE_CONNECTIONS;

        if (!Pose) return;

        // The pose model is created ONCE. Switching cameras only swaps the video stream
        // (effect below): MediaPipe Pose often fails to start a second time on the same page.
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

            pose.onResults(async (results: PoseResults) => {
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
                                let payload: Record<string, unknown>;
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
                                                    const stream = canvasElement.captureStream(30);
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
        };

        initMediaPipe();

        return () => {
            isUnmounted = true;
            if (poseWrapperRef.current) {
                poseWrapperRef.current.close();
                poseWrapperRef.current = null;
            }
            isMockVideoPlaying.current = false;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [areScriptsLoaded]);

    // ── Camera stream: (re)opened on start, on switch front/back and on retry ──
    useEffect(() => {
        if (!areScriptsLoaded) return;
        const video = videoRef.current;
        if (!video) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            // Insecure page (http) or very old browser: no camera API at all.
            Promise.resolve().then(() => {
                setCameraError(true);
                setIsSwitchingCamera(false);
            });
            return;
        }

        const { facing: want, isSwitch } = cameraRequest;
        let cancelled = false;
        let raf = 0;
        let stream: MediaStream | null = null;

        const open = async (constraints: MediaTrackConstraints): Promise<MediaStream | null> => {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, ...constraints },
                });
            } catch (err) {
                console.warn("Camera open failed:", constraints, err);
                return null;
            }
        };
        const listCameras = async (): Promise<MediaDeviceInfo[]> => {
            try {
                return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
            } catch {
                return [];
            }
        };
        const idOf = (s: MediaStream | null) => s?.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        const stop = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

        const run = async () => {
            if (cancelled) return;
            const prevId = deviceIdRef.current;
            // Phones can't open two cameras at once: fully release the old one first.
            stop(video.srcObject as MediaStream | null);
            video.srcObject = null;

            let fromFacing = true; // false = picked by deviceId, so the requested facing proves nothing
            let next: MediaStream | null = null;
            if (isSwitch) {
                // `ideal` alone often hands back the same camera — insist first.
                next = await open({ facingMode: { exact: want } });
                if (next && prevId && idOf(next) === prevId) { stop(next); next = null; }
                if (!next) {
                    const other = pickOtherCamera(await listCameras(), prevId, want);
                    if (other) {
                        next = await open({ deviceId: { exact: other } });
                        fromFacing = false;
                    }
                }
            }
            if (!next) {
                next = await open({ facingMode: { ideal: want } });
                fromFacing = true;
            }
            if (cancelled) { stop(next); return; }

            if (!next) {
                setCameraError(true);
                setIsSwitchingCamera(false);
                return;
            }
            stream = next;
            const track = stream.getVideoTracks()[0];
            const nowId = idOf(stream);
            const switched = !isSwitch || !prevId || nowId !== prevId;
            deviceIdRef.current = nowId;

            isMockVideoPlaying.current = false;
            video.removeAttribute("src");
            video.srcObject = stream;
            await video.play().catch(() => { /* autoplay is allowed for muted video */ });

            const facing = facingOfTrack(track) ?? (fromFacing && switched ? want : "user");
            setActualFacing(facing);
            setIsSwitchingCamera(false);
            if (isSwitch) {
                const s = tRef.current.camera.setup;
                if (switched) showCameraNotice(facing === "environment" ? s.backCamera : s.frontCamera, false);
                else showCameraNotice(s.switchFailed, true);
            }
            const cams = await listCameras();
            if (!cancelled && cams.length > 0) setCameraCount(cams.length);

            // Feed frames to the pose model one at a time.
            const loop = async () => {
                if (cancelled) return;
                if (!isMockVideoPlaying.current && video.videoWidth > 0 && poseWrapperRef.current) {
                    try {
                        await poseWrapperRef.current.send({ image: video });
                    } catch (e) {
                        console.error("Mediapipe Error onFrame", e);
                    }
                }
                if (!cancelled) raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
        };
        const queued = cameraQueueRef.current.then(run);
        cameraQueueRef.current = queued.catch(() => { /* logged in open() */ });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            stop(stream);
            if (stream && video.srcObject === stream) video.srcObject = null;
        };
    }, [areScriptsLoaded, cameraRequest]);

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

    const setup = t.camera.setup;
    const mirrored = actualFacing !== "environment";
    const exercises: { id: ExerciseId; icon: string }[] = [
        { id: "benchpress", icon: "fitness_center" },
        { id: "squat", icon: "accessibility_new" },
        { id: "deadlift", icon: "sports_gymnastics" },
    ];
    const readiness = [
        { label: setup.statusCamera, ready: !isSwitchingCamera && !cameraError && areScriptsLoaded },
        { label: setup.statusPose, ready: isModelReady },
        { label: setup.statusServer, ready: isBackendReady },
    ];
    // Unknown camera count (before permission): offer the switch on phones only.
    const canSwitch = cameraCount > 1 || cameraCount === 0;
    const status = cameraError
        ? { text: setup.cameraErrorTitle, dot: "bg-orange-400", pulse: false }
        : isTrackingStarted
            ? { text: `${t.camera.live} · ${setup.statusLive}`, dot: "bg-red-500", pulse: true }
            : isModelReady
                ? { text: setup.statusReady, dot: "bg-primary", pulse: false }
                : { text: setup.statusPreparing, dot: "bg-amber-400", pulse: true };
    const restProgress = restLeft !== null ? restLeft / restSeconds : 0;
    const lastSet = setsRef.current.length > 0 ? setsRef.current[setsRef.current.length - 1] : null;

    const startButton = (compact: boolean) => (
        <button
            type="button"
            onClick={startWorkoutCountdown}
            disabled={!isModelReady}
            className={`${compact ? "h-12 flex-1 px-4 text-sm" : "h-14 w-full text-base"} rounded-2xl font-semibold flex items-center justify-center gap-2 transition touch-manipulation ${
                isModelReady
                    ? "bg-primary text-background-dark hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    : "bg-white/[0.06] text-slate-400 cursor-not-allowed"
            }`}
        >
            {isModelReady ? (
                <span className="material-symbols-outlined text-2xl filled" aria-hidden="true">play_arrow</span>
            ) : (
                <span className="size-4 rounded-full border-2 border-white/20 border-t-slate-300 animate-spin" aria-hidden="true" />
            )}
            {isModelReady ? setup.start : setup.preparing}
        </button>
    );

    return (
        <div className="bg-black text-white h-[100dvh] flex flex-col overflow-hidden">
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" strategy="lazyOnload"
                onLoad={() => { setTimeout(() => setAreScriptsLoaded(true), 500); }}
            />

            <div className="flex flex-col lg:flex-row flex-1 h-full overflow-hidden">
                {/* ── Camera View ── */}
                <div className="relative flex-1 flex flex-col min-h-0 bg-black">
                    <video ref={videoRef} autoPlay playsInline muted
                        className={`absolute inset-0 z-0 w-full h-full object-cover transition-opacity duration-300 ${isSwitchingCamera ? "opacity-0" : "opacity-100"}`}
                        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
                    />
                    <canvas ref={canvasRef}
                        className={`absolute inset-0 z-10 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isSwitchingCamera ? "opacity-0" : "opacity-100"}`}
                        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
                    />
                    {/* Scrims keep the controls readable on any background */}
                    <div className="absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" aria-hidden="true" />

                    {/* Debug Display — dev only */}
                    {process.env.NODE_ENV === "development" && (
                        <div ref={debugAngleRef} className="absolute bottom-48 left-4 z-50 bg-black/70 text-primary font-mono p-2 rounded text-sm pointer-events-none border border-primary/30">
                            Angle: 0 | State: up
                        </div>
                    )}

                    {/* ── Top bar ── */}
                    <header className="relative z-30 flex items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:px-4">
                        <Link href="/" aria-label={t.camera.back}
                            className="size-11 shrink-0 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                            <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_back</span>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold leading-tight truncate drop-shadow">{exerciseName}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-200" aria-live="polite">
                                <span className={`size-2 rounded-full ${status.dot} ${status.pulse ? "animate-pulse" : ""}`} aria-hidden="true" />
                                {status.text}
                            </p>
                        </div>
                        {canSwitch && !cameraError && (
                            <button type="button" onClick={switchCamera} disabled={isSwitchingCamera}
                                aria-label={`${setup.switchCamera} (${actualFacing === "environment" ? setup.backCamera : setup.frontCamera})`}
                                title={setup.switchCamera}
                                className={`h-11 shrink-0 rounded-full bg-black/50 backdrop-blur-md border border-white/15 pl-2.5 pr-3.5 flex items-center gap-1.5 text-white hover:bg-black/70 hover:border-white/30 active:scale-95 transition disabled:cursor-wait touch-manipulation cursor-pointer ${cameraCount === 0 ? "lg:hidden" : ""}`}>
                                <span className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center" aria-hidden="true">
                                    <span className="material-symbols-outlined text-lg transition-transform duration-500 ease-out"
                                        style={{ transform: `rotate(${cameraRequest.n * 180}deg)` }}>
                                        cameraswitch
                                    </span>
                                </span>
                                <span className="text-sm font-medium tabular-nums" aria-hidden="true">
                                    {actualFacing === "environment" ? setup.backShort : setup.frontShort}
                                </span>
                            </button>
                        )}
                    </header>

                    {/* Switching / camera error */}
                    {isSwitchingCamera && areScriptsLoaded && !cameraError && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <p role="status" className="rounded-full bg-black/70 backdrop-blur px-4 py-2 text-sm text-slate-100 flex items-center gap-2">
                                <span className="size-4 rounded-full border-2 border-white/20 border-t-primary animate-spin" aria-hidden="true" />
                                {setup.switching}
                            </p>
                        </div>
                    )}
                    {cameraNotice && !isSwitchingCamera && !cameraError && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-6">
                            <p key={cameraNotice.text} role="status"
                                className="animate-pop rounded-full bg-black/70 backdrop-blur border border-white/10 px-4 py-2 text-sm text-slate-100 flex items-center gap-2 text-center">
                                <span className={`material-symbols-outlined text-lg ${cameraNotice.failed ? "text-orange-300" : "text-primary filled"}`} aria-hidden="true">
                                    {cameraNotice.failed ? "no_photography" : "check_circle"}
                                </span>
                                {cameraNotice.text}
                            </p>
                        </div>
                    )}
                    {cameraError && !isTrackingStarted && (
                        <div className="absolute inset-x-0 top-24 z-30 px-4">
                            <div role="alert" className="mx-auto max-w-md rounded-3xl bg-surface-dark/95 backdrop-blur border border-white/10 p-5 flex gap-4">
                                <span className="material-symbols-outlined text-3xl text-orange-300 shrink-0" aria-hidden="true">videocam_off</span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-white">{setup.cameraErrorTitle}</p>
                                    <p className="mt-1 text-sm text-slate-300">{setup.cameraErrorBody}</p>
                                    <button type="button" onClick={retryCamera}
                                        className="mt-3 h-11 px-4 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 cursor-pointer">
                                        {setup.retry}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Before the workout: countdown + setup sheet ── */}
                    {!isTrackingStarted && (
                        <>
                            {countdown !== null && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60" role="timer" aria-live="assertive">
                                    <div className="size-44 md:size-52 rounded-full border-4 border-primary/40 bg-black/40 flex items-center justify-center">
                                        <span key={countdown} className="animate-pop text-8xl md:text-9xl font-bold text-primary tabular-nums leading-none">{countdown}</span>
                                    </div>
                                    <p className="text-lg text-slate-200">{setup.getReady}</p>
                                </div>
                            )}

                            {countdown === null && (
                                <div className="absolute inset-x-0 bottom-0 z-40 md:px-4 md:pb-6">
                                    <section aria-label={setup.title}
                                        className="mx-auto w-full md:max-w-md rounded-t-3xl md:rounded-3xl bg-surface-dark/95 backdrop-blur-xl border border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-5 shadow-2xl">
                                        <button type="button" onClick={() => setIsSetupMinimized(!isSetupMinimized)}
                                            aria-expanded={!isSetupMinimized} aria-label={isSetupMinimized ? setup.expand : setup.collapse}
                                            className="w-full h-7 flex items-center justify-center cursor-pointer touch-manipulation">
                                            <span className="h-1.5 w-10 rounded-full bg-white/25" aria-hidden="true" />
                                        </button>

                                        {isSetupMinimized ? (
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setIsSetupMinimized(false)}
                                                    className="h-12 min-w-0 flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/10 px-3 text-sm text-slate-100 cursor-pointer touch-manipulation">
                                                    <span className="material-symbols-outlined text-lg text-primary shrink-0" aria-hidden="true">tune</span>
                                                    <span className="truncate">{setup.summary.replace("{exercise}", exerciseName).replace("{reps}", String(repGoal))}</span>
                                                </button>
                                                {startButton(true)}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <h2 className="text-lg font-semibold text-white">{setup.title}</h2>
                                                    <Link href="/tutorial" className="min-h-11 inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4">
                                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">help</span>
                                                        {setup.howToPlace}
                                                    </Link>
                                                </div>

                                                {/* System readiness */}
                                                <div>
                                                    <ul className="flex flex-wrap gap-2">
                                                        {readiness.map((r) => (
                                                            <li key={r.label}
                                                                className={`inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-xs font-medium ${r.ready ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/[0.04] border-white/10 text-slate-300"}`}>
                                                                {r.ready ? (
                                                                    <span className="material-symbols-outlined text-base filled" aria-hidden="true">check_circle</span>
                                                                ) : (
                                                                    <span className="size-3 rounded-full border-2 border-white/20 border-t-slate-300 animate-spin" aria-hidden="true" />
                                                                )}
                                                                {r.label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {!isBackendReady && <p className="mt-2 text-xs text-slate-400">{setup.serverNote}</p>}
                                                </div>

                                                {/* Exercise */}
                                                <fieldset>
                                                    <legend className="text-sm font-medium text-slate-200 mb-2">{setup.exercise}</legend>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {exercises.map((item) => {
                                                            const selected = currentExercise === item.id;
                                                            return (
                                                                <button key={item.id} type="button" aria-pressed={selected}
                                                                    onClick={() => setCurrentExercise(item.id)}
                                                                    className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors cursor-pointer touch-manipulation ${selected ? "bg-primary/10 border-primary" : "bg-white/[0.04] border-white/10 hover:border-white/25"}`}>
                                                                    <span className={`size-9 rounded-xl flex items-center justify-center ${selected ? "bg-primary text-background-dark" : "bg-white/[0.06] text-slate-300"}`}>
                                                                        <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>
                                                                    </span>
                                                                    <span className="min-w-0">
                                                                        <span className="block text-sm font-semibold text-white leading-tight">{getExerciseName(item.id)}</span>
                                                                        <span className="block mt-0.5 text-xs text-slate-400 leading-tight">{setup.focus[item.id]}</span>
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </fieldset>

                                                {/* Reps */}
                                                <div>
                                                    <div className="flex items-baseline justify-between mb-2">
                                                        <span className="text-sm font-medium text-slate-200">{setup.reps}</span>
                                                        {setGoal > 1 && (
                                                            <span className="text-xs text-slate-400">{setup.setsInfo.replace("{sets}", String(setGoal)).replace("{rest}", String(restSeconds))}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex gap-1.5">
                                                            {[8, 10, 12, 15].map((preset) => (
                                                                <button key={preset} type="button" onClick={() => setRepGoal(preset)} aria-pressed={repGoal === preset}
                                                                    className={`h-11 min-w-11 px-2 rounded-xl text-sm font-semibold tabular-nums transition-colors cursor-pointer touch-manipulation ${repGoal === preset ? "bg-primary text-background-dark" : "bg-white/[0.06] text-slate-200 hover:bg-white/10"}`}>
                                                                    {preset}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center h-11 rounded-xl border border-white/15">
                                                            <button type="button" onClick={() => setRepGoal((r) => Math.max(1, r - 1))} aria-label={setup.decrease}
                                                                className="size-11 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer touch-manipulation">
                                                                <span className="material-symbols-outlined text-xl" aria-hidden="true">remove</span>
                                                            </button>
                                                            <span className="w-8 text-center text-lg font-semibold text-white tabular-nums" aria-live="polite">{repGoal}</span>
                                                            <button type="button" onClick={() => setRepGoal((r) => Math.min(50, r + 1))} aria-label={setup.increase}
                                                                className="size-11 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer touch-manipulation">
                                                                <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-1">
                                                    {startButton(false)}
                                                    <label className={`min-h-11 inline-flex items-center gap-1.5 px-2 text-sm transition-colors touch-manipulation ${isModelReady ? "text-slate-300 hover:text-white cursor-pointer" : "text-slate-500 pointer-events-none"}`}>
                                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">upload_file</span>
                                                        {t.camera.warmup.uploadVideo}
                                                        <input type="file" accept="video/*" className="sr-only" onChange={handleVideoUpload} disabled={!isModelReady} />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Workout Complete Overlay ── */}
                    {isTrackingStarted && currentReps >= repGoal && repGoal > 0 && currentSet >= setGoal && restLeft === null && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="w-full max-w-sm rounded-3xl bg-surface-dark border border-white/10 p-6 text-center flex flex-col items-center animate-pop">
                                <div className="size-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-primary text-5xl" aria-hidden="true">task_alt</span>
                                </div>
                                <h2 className="text-2xl font-semibold text-white">{t.motivation.goalHit.replace("{n}", String(repGoal))}</h2>
                                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                                    {t.camera.workoutComplete.subtitle1} <strong className="text-white">{repGoal}</strong> {t.camera.reps.toLowerCase()} {t.camera.workoutComplete.subtitle2} <strong className="text-white">{exerciseName}</strong>
                                </p>
                                <Link href="/summary" onClick={endWorkoutData}
                                    className="mt-6 w-full h-14 rounded-2xl bg-primary text-background-dark font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition">
                                    <span className="material-symbols-outlined text-xl" aria-hidden="true">analytics</span>
                                    {t.camera.workoutComplete.viewSummary}
                                </Link>
                                <button type="button" onClick={() => setRepGoal((prev) => prev + 5)}
                                    className="mt-2 min-h-11 px-3 text-sm text-slate-300 hover:text-white cursor-pointer">
                                    {t.camera.workoutComplete.continue}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Rest between sets ── */}
                    {restLeft !== null && (
                        <div role="timer" aria-live="polite" className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6">
                            <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
                                <div>
                                    <p className="text-sm text-primary font-medium">
                                        {t.sets.setOf.replace("{n}", String(currentSet)).replace("{total}", String(setGoal))} ✓
                                    </p>
                                    <h2 className="mt-1 text-2xl font-semibold text-white">{setup.restTitle}</h2>
                                </div>
                                <div className="relative size-52">
                                    <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
                                        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                                        <circle cx="100" cy="100" r="90" fill="none" stroke="#39FF14" strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 90} strokeDashoffset={2 * Math.PI * 90 * (1 - restProgress)}
                                            className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-7xl font-bold text-white tabular-nums leading-none">{restLeft}</span>
                                        <span className="mt-1 text-sm text-slate-400">{setup.secondsLeft}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-300">{t.sets.nextIn.replace("{n}", String(currentSet + 1))}</p>
                                {lastSet && (
                                    <p className="rounded-2xl bg-surface-dark border border-white/10 px-4 py-2.5 text-sm text-slate-200">
                                        {t.sets.set} {lastSet.set}: <strong className="text-white">{lastSet.reps}</strong> {t.sets.reps}
                                        {lastSet.avgScore !== null && <> · {t.sets.score} <strong className="text-white">{lastSet.avgScore}%</strong></>}
                                    </p>
                                )}
                                <button type="button" onClick={startNextSet}
                                    className="h-14 w-full rounded-2xl bg-primary text-background-dark font-semibold text-base hover:brightness-110 active:scale-[0.98] transition cursor-pointer">
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
