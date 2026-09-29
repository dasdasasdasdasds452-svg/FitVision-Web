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
    const { t, language } = useLanguage();
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
        workoutStartTimeRef.current = Date.now();

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
                                                    const elapsedSec = Math.round((Date.now() - workoutStartTimeRef.current) / 1000);
                                                    const mins = Math.floor(elapsedSec / 60);
                                                    const secs = elapsedSec % 60;
                                                    const errorRecord = {
                                                        url,
                                                        title: data.error_type || t.camera.feedback.correctionNeeded,
                                                        detail: data.feedback,
                                                        time: new Date().toLocaleTimeString(),
                                                        elapsedSeconds: elapsedSec,
                                                        elapsedFormatted: `${mins}:${secs.toString().padStart(2, '0')}`,
                                                        repNumber: localRepCountRef.current,
                                                        riskLevel: data.risk_assessment?.risk_level || 'unknown',
                                                        riskScore: data.risk_assessment?.risk_score || 0,
                                                        riskLabelTh: data.risk_assessment?.risk_label_th || '',
                                                        riskColor: data.risk_assessment?.risk_color || '#f59e0b',
                                                        riskFactors: data.risk_assessment?.risk_factors || [],
                                                        recommendation: data.risk_assessment?.recommendation || '',
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
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-4 md:pb-6 px-3 md:px-4 z-40 max-h-[85vh] overflow-y-auto">
                                    <div className="max-w-md mx-auto flex flex-col gap-3 md:gap-4 bg-[#0d140e]/95 backdrop-blur-2xl border border-primary/25 rounded-3xl p-4 md:p-5 shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
                                        {/* Subtle top neon ambient glow line */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

                                        {/* Header: Title */}
                                        <div className="flex items-center justify-between pb-1 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 md:size-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(57,255,20,0.25)]">
                                                    <span className="material-symbols-outlined text-base md:text-lg font-bold">tune</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-black text-xs md:text-sm tracking-tight leading-none">
                                                        {language === "th" ? "ตั้งค่าก่อนเริ่มฝึก" : "Workout Setup"}
                                                    </h3>
                                                    <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">
                                                        {language === "th" ? "เลือกท่าและเป้าหมายจำนวนครั้ง" : "Configure exercise & target"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── 3-Point System Telemetry Status Bar ── */}
                                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 text-[10px] md:text-xs font-semibold">
                                            {/* 1. Camera */}
                                            <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                areScriptsLoaded 
                                                    ? "bg-primary/10 border-primary/30 text-primary" 
                                                    : "bg-white/5 border-white/5 text-slate-400"
                                            }`}>
                                                <span className={`size-1.5 rounded-full shrink-0 ${areScriptsLoaded ? "bg-primary shadow-[0_0_6px_#39ff14]" : "bg-slate-500 animate-pulse"}`} />
                                                <span className="material-symbols-outlined text-xs shrink-0">{areScriptsLoaded ? "check_circle" : "videocam"}</span>
                                                <span className="truncate">{language === "th" ? "กล้อง" : "Camera"}{areScriptsLoaded ? " ✓" : "..."}</span>
                                            </div>

                                            {/* 2. Pose AI */}
                                            <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                isModelReady 
                                                    ? "bg-primary/10 border-primary/30 text-primary" 
                                                    : "bg-white/5 border-white/5 text-slate-400"
                                            }`}>
                                                <span className={`size-1.5 rounded-full shrink-0 ${isModelReady ? "bg-primary shadow-[0_0_6px_#39ff14]" : "bg-slate-500 animate-pulse"}`} />
                                                <span className="material-symbols-outlined text-xs shrink-0">{isModelReady ? "check_circle" : "psychology"}</span>
                                                <span className="truncate">{language === "th" ? "ตรวจจับท่า" : "Pose AI"}{isModelReady ? " ✓" : "..."}</span>
                                            </div>

                                            {/* 3. AI Server */}
                                            <div className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border transition-all ${
                                                isBackendReady 
                                                    ? "bg-primary/10 border-primary/30 text-primary" 
                                                    : backendStatus === "waking"
                                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                                        : "bg-white/5 border-white/5 text-slate-400"
                                            }`}>
                                                <span className={`size-1.5 rounded-full shrink-0 ${isBackendReady ? "bg-primary shadow-[0_0_6px_#39ff14]" : "bg-amber-400 animate-pulse"}`} />
                                                <span className="material-symbols-outlined text-xs shrink-0">{isBackendReady ? "check_circle" : "cloud_sync"}</span>
                                                <span className="truncate">
                                                    {language === "th" ? "เซิร์ฟเวอร์" : "Server"}{isBackendReady ? " ✓" : "..."}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Subtle server connecting status message if not ready */}
                                        {!isBackendReady && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[10px] md:text-[11px] leading-tight">
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
                                            <label className="text-slate-400 text-[10px] md:text-[11px] uppercase tracking-wider font-bold">
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
                                                            onClick={() => setCurrentExercise(item.id)}
                                                            className={`flex flex-col items-center justify-center p-2 md:p-3 rounded-2xl border transition-all text-center group cursor-pointer relative touch-manipulation ${
                                                                isSelected
                                                                    ? "bg-primary/15 border-primary text-white shadow-[0_0_20px_rgba(57,255,20,0.25)] ring-1 ring-primary/40"
                                                                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-slate-300 active:scale-95"
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <div className="absolute top-1.5 right-1.5 size-1.5 md:size-2 rounded-full bg-primary shadow-[0_0_8px_#39ff14]" />
                                                            )}
                                                            <div className={`size-8 md:size-10 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${
                                                                isSelected ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-400 group-hover:text-white"
                                                            }`}>
                                                                <span className="material-symbols-outlined text-xl md:text-2xl">{item.icon}</span>
                                                            </div>
                                                            <span className={`text-[11px] md:text-sm font-black tracking-tight leading-tight ${isSelected ? "text-white" : "text-slate-200"}`}>
                                                                {item.name}
                                                            </span>
                                                            <span className={`text-[8px] md:text-[10px] mt-0.5 font-medium leading-none ${isSelected ? "text-primary/90" : "text-slate-400"}`}>
                                                                {item.focus}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Goal Reps Selector with Presets & Stepper */}
                                        <div className="flex items-center justify-between gap-2 p-2.5 md:p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <div className="size-7 md:size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                                    <span className="material-symbols-outlined text-sm md:text-base">flag</span>
                                                </div>
                                                <div>
                                                    <div className="text-white text-[11px] md:text-xs font-bold leading-tight">
                                                        {language === "th" ? "เป้าหมาย" : "Target Reps"}
                                                    </div>
                                                    <div className="text-slate-400 text-[9px] md:text-[10px] hidden sm:block">
                                                        {language === "th" ? "นับรอบและวิเคราะห์ทุกครั้ง" : "AI counts reps & tracks tempo"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 md:gap-2">
                                                {/* Preset Pills */}
                                                <div className="flex items-center gap-1">
                                                    {[8, 10, 12, 15].map((preset) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => setRepGoal(preset)}
                                                            className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[11px] md:text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                                                                repGoal === preset
                                                                    ? "bg-primary text-black shadow-[0_0_10px_rgba(57,255,20,0.3)] font-black"
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
                                                        className="text-slate-300 hover:text-white w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-base font-bold rounded-lg hover:bg-white/10 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="text-primary font-black text-sm md:text-base w-6 md:w-7 text-center font-mono">
                                                        {repGoal}
                                                    </span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setRepGoal(r => Math.min(50, r + 1))} 
                                                        className="text-slate-300 hover:text-white w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-base font-bold rounded-lg hover:bg-white/10 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Action Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCountdown(3); 
                                                let count = 3;
                                                const timer = setInterval(() => {
                                                    count -= 1;
                                                    if (count > 0) setCountdown(count);
                                                    else { 
                                                        clearInterval(timer); 
                                                        setCountdown(null); 
                                                        setIsTrackingStarted(true); 
                                                        isTrackingStartedRef.current = true; 
                                                        workoutStartTimeRef.current = Date.now(); 
                                                    }
                                                }, 1000);
                                            }}
                                            disabled={!isModelReady}
                                            className={`w-full py-3.5 md:py-4 rounded-2xl text-sm md:text-base font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 touch-manipulation ${
                                                isModelReady
                                                    ? "bg-primary text-black hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                                                    : "bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed"
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
                                        <label className={`w-full py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-2 border touch-manipulation ${
                                            isModelReady 
                                                ? "border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-98 cursor-pointer" 
                                                : "border-white/5 text-slate-600 pointer-events-none"
                                        }`}>
                                            <span className="material-symbols-outlined text-sm md:text-base text-primary">upload_file</span>
                                            <span>{t.camera.warmup.uploadVideo}</span>
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
                        currentReps, repGoal, exerciseName, endWorkoutData, riskLevel
                    }} />
                </div>

                <CameraDesktopPanel props={{
                        t, isTrackingStarted, isGoodForm, formScore, feedbackTitle, feedbackDetail, 
                        currentReps, repGoal, exerciseName, endWorkoutData, riskLevel
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
