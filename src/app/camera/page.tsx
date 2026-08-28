"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLanguage } from "@/context/LanguageContext";
import { CameraMobileHUD, CameraDesktopPanel } from "@/components/camera/CameraOverlays";
import { calculateAngle, Landmark } from "@/lib/poseUtils";

function CameraContent() {
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const model = searchParams.get("model")?.toLowerCase() || "benchpress";
    const repsParam = parseInt(searchParams.get("reps") || "12", 10);

    const [currentExercise, setCurrentExercise] = useState(model);
    const [repGoal, setRepGoal] = useState(repsParam);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [isTrackingStarted, setIsTrackingStarted] = useState(false);
    const isTrackingStartedRef = useRef(false);

    const [countdown, setCountdown] = useState<number | null>(null);
    const [currentReps, setCurrentReps] = useState(0);

    const repStateRef = useRef<"up" | "down">("up");
    const localRepCountRef = useRef<number>(0);

    const getExerciseName = (ex: string) => {
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
    const [feedbackTitle, setFeedbackTitle] = useState("AI Ready");
    const [feedbackDetail, setFeedbackDetail] = useState("Start exercising to get feedback.");
    const [formScore, setFormScore] = useState(100);

    // Stats tracking
    const statsRef = useRef({ scores: [] as number[], exerciseName: exerciseName });
    useEffect(() => { statsRef.current.exerciseName = exerciseName; }, [exerciseName]);

    // Ping Render backend until it wakes up
    useEffect(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://grubby-lynnett-tonkla1-ded4b5e9.koyeb.app";
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
        setIsTrackingStarted(true);
        isTrackingStartedRef.current = true;

        repStateRef.current = "up";
        localRepCountRef.current = 0;
        setCurrentReps(0);

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

    const exerciseRef = useRef(currentExercise);
    useEffect(() => {
        exerciseRef.current = currentExercise;
        setIsGoodForm(true);
        isGoodFormRef.current = true;
        setFeedbackTitle(t.camera.feedback.aiReady);
        setFeedbackDetail(t.camera.feedback.waitForAI);
        setFormScore(100);
        setCurrentReps(0);
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
        let pose: any = null;
        let isUnmounted = false;
        let frameCount = 0;
        let isPredicting = false;
        let repState = "up";
        let localRepCount = 0;

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

                    if (!sessionStorage.getItem('fitvision_errors_cleared')) {
                        sessionStorage.removeItem('fitvision_errors');
                        sessionStorage.setItem('fitvision_errors_cleared', 'true');
                    }
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
                        Math.abs(lm[11].x - lm[12].x),           // [8] shoulder_width
                        Math.abs(lm[23].x - lm[24].x),           // [9] hip_width
                        Math.abs((lm[11].y + lm[12].y) / 2 - (lm[23].y + lm[24].y) / 2), // [10] torso_length
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

                        if (mainAngle > upThreshold) {
                            if (repStateRef.current === "down") {
                                localRepCountRef.current += 1;
                                setCurrentReps(localRepCountRef.current);
                            }
                            repStateRef.current = "up";
                        } else if (mainAngle < downThreshold) {
                            repStateRef.current = "down";
                        }
                    }

                    if (frameCount % 5 === 0 && !isPredicting && isTrackingStartedRef.current) {
                        isPredicting = true;

                        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://grubby-lynnett-tonkla1-ded4b5e9.koyeb.app";

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
                                    console.log('[FV] API Response:', { form_correct: data.form_correct, confidence: data.confidence?.toFixed(3) });

                                    recentPredictions.current.push({ correct: data.form_correct, confidence: data.confidence });
                                    if (recentPredictions.current.length > 5) recentPredictions.current.shift();

                                    const window = recentPredictions.current;
                                    const incorrectCount = window.filter(p => !p.correct).length;
                                    const isFormCorrect = incorrectCount < Math.ceil(window.length / 2);

                                    setIsGoodForm(isFormCorrect);
                                    isGoodFormRef.current = isFormCorrect;
                                    setFeedbackDetail(data.feedback);
                                    setFeedbackTitle(isFormCorrect ? t.camera.feedback.goodForm : t.camera.feedback.correctionNeeded);

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
                                    console.log('[FV] Score Update:', { isFormCorrect, incorrectCount, windowSize: window.length, currentScore });

                                    setFormScore(currentScore);
                                    statsRef.current.scores.push(currentScore);

                                    if (!isFormCorrect) {
                                        const now = Date.now();
                                        if (now - lastErrorTimeRef.current > 6000) {
                                            lastErrorTimeRef.current = now;

                                            try {
                                                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                                                    mediaRecorderRef.current.stop();
                                                }
                                                const stream = (canvasElement as any).captureStream(30);
                                                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                                                const chunks: Blob[] = [];

                                                recorder.ondataavailable = (e) => {
                                                    if (e.data.size > 0) chunks.push(e.data);
                                                };

                                                recorder.onstop = () => {
                                                    if (chunks.length === 0) return;
                                                    const blob = new Blob(chunks, { type: 'video/webm' });
                                                    const url = URL.createObjectURL(blob);
                                                    const errorRecord = {
                                                        url,
                                                        title: data.error_type || t.camera.feedback.correctionNeeded,
                                                        detail: data.feedback,
                                                        time: new Date().toLocaleTimeString()
                                                    };
                                                    const prevErrors = JSON.parse(sessionStorage.getItem('fitvision_errors') || '[]');
                                                    sessionStorage.setItem('fitvision_errors', JSON.stringify([...prevErrors, errorRecord]));
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
                                } else {
                                    const errText = await res.text();
                                    console.error(`API Error ${res.status}:`, errText);
                                    setFeedbackDetail(`Backend Error: ${res.status}`);
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
        const scores = statsRef.current.scores;
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
        const errors = JSON.parse(sessionStorage.getItem('fitvision_errors') || '[]');

        const sessionPayload = {
            id: Date.now().toString(),
            exercise: statsRef.current.exerciseName,
            avgScore,
            errorCount: errors.length,
            completedReps: currentReps,
            repGoal,
            timestamp: new Date().toISOString(),
            errors: errors
        };

        sessionStorage.setItem('fitvision_session_stats', JSON.stringify(sessionPayload));

        // Save to local storage as fallback
        const history = JSON.parse(localStorage.getItem('fitvision_history') || '[]');
        history.unshift(sessionPayload);
        if (history.length > 50) history.pop();
        localStorage.setItem('fitvision_history', JSON.stringify(history));

        // Save to Supabase
        try {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase.from('workout_history').insert({
                    user_id: session.user.id,
                    exercise_type: statsRef.current.exerciseName,
                    reps: currentReps,
                    average_confidence: avgScore
                });
                console.log("[FV] Saved workout to Supabase.");
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
                    <div ref={debugAngleRef} className="absolute top-20 left-4 z-50 bg-black/70 text-primary font-mono p-2 rounded text-sm pointer-events-none border border-primary/30">
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
                            <button onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
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
                                    <div className="text-8xl md:text-9xl font-black text-primary drop-shadow-[0_0_40px_rgba(57,255,20,0.6)] animate-pulse">{countdown}</div>
                                </div>
                            )}

                            {/* Main warmup card */}
                            {countdown === null && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-5 px-4 md:px-0">
                                    <div className="md:max-w-md md:mx-auto flex flex-col gap-4">

                                        {/* ─ Step Progress ─ */}
                                        <div className="flex items-center gap-2">
                                            <div className={`flex-1 flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${areScriptsLoaded ? "border-primary/30 bg-primary/5 text-primary" : "border-white/10 bg-white/5 text-slate-500"}`}>
                                                <span className={`text-sm material-symbols-outlined ${areScriptsLoaded ? "text-primary" : "text-slate-600"}`}>
                                                    {areScriptsLoaded ? "check_circle" : "camera_alt"}
                                                </span>
                                                <span>{areScriptsLoaded ? t.camera.warmup.cameraReady : t.camera.warmup.cameraLoading}</span>
                                            </div>
                                            <div className={`w-4 h-px ${isModelReady ? "bg-primary/40" : "bg-white/10"}`}></div>
                                            <div className={`flex-1 flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${isModelReady ? "border-primary/30 bg-primary/5 text-primary" : "border-white/10 bg-white/5 text-slate-500"}`}>
                                                <span className={`text-sm material-symbols-outlined ${isModelReady ? "text-primary" : "text-slate-600 animate-pulse"}`}>
                                                    {isModelReady ? "check_circle" : "psychology"}
                                                </span>
                                                <span>{isModelReady ? t.camera.warmup.poseReady : t.camera.warmup.poseLoading}</span>
                                            </div>
                                            <div className={`w-4 h-px ${isBackendReady ? "bg-primary/40" : "bg-white/10"}`}></div>
                                            <div className={`flex-1 flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${isBackendReady ? "border-primary/30 bg-primary/5 text-primary" : "border-orange-400/30 bg-orange-400/5 text-orange-300"}`}>
                                                <span className={`text-sm material-symbols-outlined ${isBackendReady ? "text-primary" : "text-orange-400 animate-pulse"}`}>
                                                    {isBackendReady ? "check_circle" : "cloud_sync"}
                                                </span>
                                                <span>{isBackendReady ? t.camera.warmup.serverReady : backendStatus === "waking" ? t.camera.warmup.serverWaking : t.camera.warmup.serverLoading}</span>
                                            </div>
                                        </div>

                                        {/* Server context message */}
                                        {!isBackendReady && (
                                            <div className="flex items-start gap-2 bg-orange-400/5 border border-orange-400/15 rounded-xl px-3 py-2">
                                                <span className="material-symbols-outlined text-orange-400 text-base mt-0.5 shrink-0">info</span>
                                                <p className="text-orange-200/60 text-xs leading-relaxed">
                                                    {t.camera.warmup.serverMessage} <span className="text-orange-300 font-bold">{t.camera.warmup.serverTime}</span> {t.camera.warmup.serverHint}
                                                </p>
                                            </div>
                                        )}

                                        {/* Exercise selector + reps */}
                                        <div className="flex gap-3">
                                            <div className="flex-1 relative">
                                                <label className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-1 block">{t.camera.warmup.exerciseLabel}</label>
                                                <select value={currentExercise} onChange={(e) => setCurrentExercise(e.target.value)}
                                                    className="appearance-none w-full bg-white/5 border border-white/10 rounded-xl text-white font-bold py-2.5 pl-3 pr-8 focus:outline-none focus:border-primary cursor-pointer text-sm">
                                                    <option value="benchpress">{t.camera.exerciseOptions.benchpress}</option>
                                                    <option value="squat">{t.camera.exerciseOptions.squat}</option>
                                                    <option value="deadlift">{t.camera.exerciseOptions.deadlift}</option>
                                                </select>
                                                <span className="material-symbols-outlined absolute right-2 bottom-2.5 text-white/40 pointer-events-none text-base">expand_more</span>
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-1 block">{t.camera.warmup.goalLabel}</label>
                                                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 h-[42px]">
                                                    <button onClick={() => setRepGoal(r => Math.max(1, r - 1))} className="text-white/40 hover:text-white w-6 text-lg font-bold text-center leading-none">−</button>
                                                    <span className="text-primary font-black text-lg w-7 text-center">{repGoal}</span>
                                                    <button onClick={() => setRepGoal(r => Math.min(50, r + 1))} className="text-white/40 hover:text-white w-6 text-lg font-bold text-center leading-none">+</button>
                                                </div>
                                                <label className="text-white/30 text-[9px] text-center block mt-0.5">{t.camera.reps}</label>
                                            </div>
                                        </div>

                                        {/* Start button */}
                                        <button
                                            onClick={() => {
                                                setCountdown(3); let count = 3;
                                                const timer = setInterval(() => {
                                                    count -= 1;
                                                    if (count > 0) setCountdown(count);
                                                    else { clearInterval(timer); setCountdown(null); setIsTrackingStarted(true); isTrackingStartedRef.current = true; }
                                                }, 1000);
                                            }}
                                            disabled={!isModelReady || !isBackendReady}
                                            className={`w-full py-4 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${isModelReady && isBackendReady
                                                ? "bg-primary text-black cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(57,255,20,0.35)]"
                                                : "bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed"
                                                }`}>
                                            <span className="material-symbols-outlined text-xl">
                                                {isModelReady && isBackendReady ? "play_arrow" : "hourglass_top"}
                                            </span>
                                            {isModelReady && isBackendReady
                                                ? t.camera.warmup.startAnalysis
                                                : !isModelReady ? t.camera.warmup.loadingPose
                                                    : t.camera.warmup.waitingServer}
                                        </button>

                                        {/* Upload fallback */}
                                        <label className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer ${isModelReady ? "border-white/8 text-white/30 hover:text-white/50 hover:border-white/15" : "border-white/5 text-white/15 pointer-events-none"}`}>
                                            <span className="material-symbols-outlined text-sm text-blue-400/60">upload_file</span>
                                            {t.camera.warmup.uploadVideo}
                                            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={!isModelReady} />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Workout Complete Overlay ── */}
                    {isTrackingStarted && currentReps >= repGoal && repGoal > 0 && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center flex items-center flex-col animate-in fade-in zoom-in duration-300 shadow-[0_0_50px_rgba(57,255,20,0.15)]">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-5 border border-primary/30">
                                    <span className="material-symbols-outlined text-primary text-5xl">task_alt</span>
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t.camera.workoutComplete.title}</h2>
                                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                                    {t.camera.workoutComplete.subtitle1} <strong>{repGoal}</strong> {t.camera.reps.toLowerCase()} {t.camera.workoutComplete.subtitle2} <strong>{exerciseName}</strong>.
                                </p>
                                
                                <Link href="/summary" onClick={endWorkoutData}
                                    className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.4)]">
                                    <span className="material-symbols-outlined text-xl">analytics</span>
                                    {t.camera.workoutComplete.viewSummary}
                                </Link>
                                
                                <button 
                                    onClick={() => setRepGoal(prev => prev + 5)}
                                    className="mt-4 text-white/40 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors py-2">
                                    {t.camera.workoutComplete.continue}
                                </button>
                            </div>
                        </div>
                    )}

                    <CameraMobileHUD props={{
                        t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, 
                        currentReps, repGoal, exerciseName, endWorkoutData
                    }} />
                </div>

                <CameraDesktopPanel props={{
                        t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, 
                        currentReps, repGoal, exerciseName, endWorkoutData
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
