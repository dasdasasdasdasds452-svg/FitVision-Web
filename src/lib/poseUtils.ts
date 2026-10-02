// Types for MediaPipe Landmarks
export interface Landmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}

/**
 * Calculate the angle between three points (a, b, c).
 * Point b is the vertex of the angle.
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle || 0;
}

/**
 * 2D distance in normalized image coordinates.
 * Must match tools/features/extract_features.py (np.linalg.norm on [x, y]) —
 * the deadlift and bench press models were trained on these values.
 */
export function dist2d(a: Landmark, b: Landmark): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
