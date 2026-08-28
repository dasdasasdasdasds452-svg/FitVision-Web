import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number;
}

// ── In-Memory Fallback ───────────────────────────────────────────────────────
interface RateLimitEntry {
    count: number;
    resetAt: number;
}
const store = new Map<string, RateLimitEntry>();

if (typeof globalThis !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (entry.resetAt <= now) store.delete(key);
        }
    }, 60_000);
}

function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ── Distributed Rate Limiter ─────────────────────────────────────────────────
let distributedLimiter: Ratelimit | null = null;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        
        distributedLimiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(20, "1 m"), // default configuration
            analytics: true,
        });
        if (process.env.NODE_ENV === 'development') {
            console.log("Upstash Redis initialized for rate limiting.");
        }
    }
} catch (error) {
    if (process.env.NODE_ENV === 'development') {
        console.error("Failed to initialize Upstash Redis:", error);
    }
}

/**
 * Check rate limit for a given key (typically IP address).
 * Defaults to Upstash if configured, otherwise falls back to in-memory Map.
 * 
 * @param key - Identifier (e.g., IP address)
 * @param limit - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export async function rateLimit(
    key: string,
    limit: number = 20,
    windowMs: number = 60_000
): Promise<RateLimitResult> {
    if (distributedLimiter) {
        try {
            // Note: Currently ignores dynamic limit/window and uses the 20/1m configured above
            const { success, limit: total, remaining, reset } = await distributedLimiter.limit(key);
            return {
                success,
                remaining,
                resetAt: reset,
            };
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error("Redis rate limit failed, falling back to in-memory:", error);
            }
            // Fall through to in-memory if Redis call fails
        }
    }
    
    return inMemoryRateLimit(key, limit, windowMs);
}
