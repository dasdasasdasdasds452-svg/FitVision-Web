import { useEffect, useRef, useCallback } from "react";
import type { MediaPipeWindow, MediaPipePose, MediaPipeCamera } from "@/types/mediapipe";
import type { Landmark } from "@/lib/poseUtils";
import { calculateAngle } from "@/lib/poseUtils";

interface UsePoseTrackerOptions {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    facingMode: "user" | "environment";
    areScriptsLoaded: boolean;
    isGoodForm: boolean;
    onModelReady: () => void;
    onFrame: (landmarks: Landmark[], features: number[]) => void;
}

/**
 * Custom hook for MediaPipe Pose detection.
 * Manages the lifecycle of the Pose model and Camera,
 * computes features from landmarks, and calls onFrame callback.
 */
export function usePoseTracker({
    videoRef,
    canvasRef,
    facingMode,
    areScriptsLoaded,
    isGoodForm,
    onModelReady,
    onFrame,
}: UsePoseTrackerOptions) {
    const cameraRef = useRef<MediaPipeCamera | null>(null);
    const poseRef = useRef<MediaPipePose | null>(null);
    const isMockVideoPlaying = useRef(false);
    const isGoodFormRef = useRef(isGoodForm);

    // Keep ref in sync without re-running the main effect
    useEffect(() => {
        isGoodFormRef.current = isGoodForm;
    }, [isGoodForm]);

    // Compute the 13 base features from landmarks
    const computeFeatures = useCallback((lm: Landmark[]): number[] => {
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
        // Symmetry features
        const elbow_symmetry = Math.abs(features[0] - features[1]);  // [11]
        const knee_symmetry = Math.abs(features[6] - features[7]);   // [12]
        features.push(elbow_symmetry, knee_symmetry);
        return features;
    }, []);

    // Handle video file upload for test mode
    const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !videoRef.current || !poseRef.current) return;

        if (cameraRef.current) {
            cameraRef.current.stop();
        }

        const videoUrl = URL.createObjectURL(file);
        const videoElement = videoRef.current;
        videoElement.srcObject = null;
        videoElement.src = videoUrl;
        videoElement.loop = true;
        videoElement.muted = true;

        isMockVideoPlaying.current = true;
        videoElement.play();

        const processFrame = async () => {
            if (!isMockVideoPlaying.current || !videoElement || videoElement.paused || videoElement.ended) return;
            try {
                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && poseRef.current) {
                    await poseRef.current.send({ image: videoElement });
                }
            } catch (err) {
                if (process.env.NODE_ENV === "development") console.error("Mock Video Processing Error", err);
            }
            if ("requestVideoFrameCallback" in videoElement) {
                (videoElement as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        videoElement.onplay = () => {
            if ("requestVideoFrameCallback" in videoElement) {
                (videoElement as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(processFrame);
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        return () => {
            isMockVideoPlaying.current = false;
        };
    }, [videoRef]);

    // Main MediaPipe initialization effect
    useEffect(() => {
        if (!areScriptsLoaded) return;

        const win = window as unknown as MediaPipeWindow;
        const Pose = win.Pose;
        const Camera = win.Camera;
        const drawConnectors = win.drawConnectors;
        const drawLandmarks = win.drawLandmarks;
        const POSE_CONNECTIONS = win.POSE_CONNECTIONS;

        if (!Pose || !Camera) return;

        let isUnmounted = false;

        const initMediaPipe = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const canvasCtx = canvasElement.getContext("2d");

            const pose = new Pose({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
            });
            poseRef.current = pose;

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            pose.onResults((results) => {
                if (isUnmounted || !canvasCtx || !canvasElement || !videoElement) return;
                onModelReady();

                if (canvasElement.width !== videoElement.videoWidth) {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                }

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                if (results.image) {
                    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
                } else if (videoElement.videoWidth > 0) {
                    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                }

                if (results.poseLandmarks) {
                    const currentIsGood = isGoodFormRef.current;
                    const primaryColor = currentIsGood ? "#38ff14" : "#ff1e1e";

                    canvasCtx.save();
                    canvasCtx.shadowBlur = 15;
                    canvasCtx.shadowColor = primaryColor;
                    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: primaryColor, lineWidth: 6 });
                    canvasCtx.shadowBlur = 0;
                    drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#ffffff", fillColor: primaryColor, lineWidth: 2, radius: 4 });
                    canvasCtx.restore();

                    const features = computeFeatures(results.poseLandmarks);
                    onFrame(results.poseLandmarks, features);
                }
                canvasCtx.restore();
            });

            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (isUnmounted || isMockVideoPlaying.current) return;
                    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                        try {
                            await poseRef.current?.send({ image: videoElement });
                        } catch (e) {
                            if (process.env.NODE_ENV === "development") console.error("Mediapipe Error onFrame", e);
                        }
                    }
                },
                width: 640,
                height: 480,
                facingMode: facingMode,
            });
            cameraRef.current = camera;
            camera.start();
        };

        initMediaPipe();

        return () => {
            isUnmounted = true;
            cameraRef.current?.stop();
            poseRef.current?.close();
            isMockVideoPlaying.current = false;

            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((t) => t.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [areScriptsLoaded, facingMode, videoRef, canvasRef, onModelReady, onFrame, computeFeatures]);

    return { handleVideoUpload, isMockVideoPlaying };
}
