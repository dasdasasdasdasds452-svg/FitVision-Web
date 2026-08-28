// ─── MediaPipe Global Types ───
// These types describe the MediaPipe Pose SDK loaded via CDN <script> tags.

export interface MediaPipePoseOptions {
    modelComplexity?: 0 | 1 | 2;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    smoothSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
}

export interface PoseResults {
    poseLandmarks?: import("@/lib/poseUtils").Landmark[];
    image?: CanvasImageSource;
}

export interface MediaPipePose {
    setOptions(options: MediaPipePoseOptions): void;
    onResults(callback: (results: PoseResults) => void): void;
    send(input: { image: HTMLVideoElement }): Promise<void>;
    close(): void;
}

export interface MediaPipeCamera {
    start(): void;
    stop(): void;
}

export interface MediaPipeCameraOptions {
    onFrame: () => Promise<void>;
    width: number;
    height: number;
    facingMode?: string;
}

// Augment window for MediaPipe globals
export interface MediaPipeWindow extends Window {
    Pose: new (config: { locateFile: (file: string) => string }) => MediaPipePose;
    Camera: new (video: HTMLVideoElement, options: MediaPipeCameraOptions) => MediaPipeCamera;
    drawConnectors: (
        ctx: CanvasRenderingContext2D,
        landmarks: import("@/lib/poseUtils").Landmark[],
        connections: [number, number][],
        style: { color: string; lineWidth: number }
    ) => void;
    drawLandmarks: (
        ctx: CanvasRenderingContext2D,
        landmarks: import("@/lib/poseUtils").Landmark[],
        style: { color: string; fillColor: string; lineWidth: number; radius: number }
    ) => void;
    POSE_CONNECTIONS: [number, number][];
}
