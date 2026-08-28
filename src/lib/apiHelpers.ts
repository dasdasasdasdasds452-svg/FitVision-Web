import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

export function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

export async function checkRateLimit(request: NextRequest, limit: number, windowMs: number) {
    const clientIP = getClientIp(request);
    const limiter = await rateLimit(clientIP, limit, windowMs);
    
    if (!limiter.success) {
        return {
            success: false,
            response: NextResponse.json(
                { error: "Too many requests. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((limiter.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            )
        };
    }
    
    return { success: true, limiter };
}
