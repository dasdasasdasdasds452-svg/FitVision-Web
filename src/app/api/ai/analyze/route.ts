import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/apiHelpers";

const MAX_INPUT_LENGTH = 2000;
const MAX_SESSION_ERRORS = 30;

const clip = (v: unknown, max = 300): string => String(v ?? "").slice(0, max);

interface SessionPayload {
    exercise: string;
    completedReps: number;
    repGoal: number;
    score: number | null;
    errors: { title: string; detail: string; time: string; rep: number; factors: string }[];
}

function parseSessionPayload(body: Record<string, unknown>): SessionPayload | null {
    const rawErrors = body.errors;
    if (!Array.isArray(rawErrors)) return null;
    const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.min(1000, Math.round(n))) : 0;
    };
    return {
        exercise: clip(body.exercise, 60) || "Unknown",
        completedReps: num(body.completedReps),
        repGoal: num(body.repGoal),
        score: body.score === null || body.score === undefined ? null : num(body.score),
        errors: rawErrors.slice(0, MAX_SESSION_ERRORS).map((e) => {
            const r = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
            return {
                title: clip(r.title, 120),
                detail: clip(r.detail),
                time: clip(r.time, 20),
                rep: num(r.repNumber),
                factors: Array.isArray(r.riskFactors) ? clip(r.riskFactors.map(String).join(", ")) : "",
            };
        }),
    };
}

export async function POST(request: NextRequest) {
    const { success, response, limiter } = await checkRateLimit(request, 10, 60_000);
    if (!success) {
        return response;
    }
    // ── Rate Limiting (done via checkRateLimit) ──────────────────────────────────

    // ── Input validation ────────────────────────────────────────────────────
    try {
        const body = await request.json();
        const { errorTitle, errorDetail, exercise, timestamp, language, mode } = body;

        const openai = new OpenAI({
            apiKey: process.env.AI_API_KEY,
            baseURL: process.env.AI_BASE_URL,
        });

        // Mode 1: Whole-session analysis (from summary page).
        // The prompt is built here from structured data so the endpoint can't be
        // used as a general-purpose LLM proxy.
        if (mode === "session") {
            const session = parseSessionPayload(body);
            if (!session) {
                return NextResponse.json({ error: "Invalid session payload" }, { status: 400 });
            }
            const isThai = language === "th";
            const summarySystemPrompt = `You are FitVision AI Coach — a world-class biomechanics and fitness expert.
Provide practical, science-backed feedback on the user's workout session.
Write your response in ${isThai ? "Thai" : "English"}.
Use clean Markdown: short bold headers and bullet points. Keep it under 250 words.
If the user may be in pain, recommend seeing a medical professional.`;

            const errorLines = session.errors
                .map((e, i) => `${i + 1}. [${e.time}]${e.rep ? ` rep #${e.rep}` : ""} — ${e.title}: ${e.detail}${e.factors ? ` (risk factors: ${e.factors})` : ""}`)
                .join("\n");

            const userPrompt = `Exercise: ${session.exercise}
Reps: ${session.completedReps}/${session.repGoal}
Average form score: ${session.score === null ? "not available" : `${session.score}%`}
Detected form errors (${session.errors.length}):
${errorLines || "none"}

Respond with:
1. The main problem (which body part / movement is wrong)
2. Likely causes
3. Specific fixes for the next set
4. 1–2 accessory drills that help
5. Safety notes`;

            const response = await openai.chat.completions.create({
                model: process.env.AI_MODEL || "gemini-2.5-flash-lite",
                messages: [
                    { role: "system", content: summarySystemPrompt },
                    { role: "user", content: userPrompt },
                ],
                stream: false,
            });

            const content = response.choices[0]?.message?.content || "";
            return NextResponse.json({
                response: content,
            }, {
                headers: {
                    "X-RateLimit-Remaining": String(limiter?.remaining || 0),
                },
            });
        }

        // Mode 2: Single error detail analysis (from history detail page)
        if (!errorTitle || typeof errorTitle !== "string") {
            return NextResponse.json({ error: "Missing errorTitle or question" }, { status: 400 });
        }
        if (errorTitle.length > MAX_INPUT_LENGTH) {
            return NextResponse.json(
                { error: `errorTitle too long (max ${MAX_INPUT_LENGTH} chars)` },
                { status: 400 }
            );
        }
        if (errorDetail && typeof errorDetail === "string" && errorDetail.length > MAX_INPUT_LENGTH) {
            return NextResponse.json(
                { error: `errorDetail too long (max ${MAX_INPUT_LENGTH} chars)` },
                { status: 400 }
            );
        }

        const systemPrompt = `You are FitVision AI Coach — a world-class biomechanics and fitness expert. You analyze exercise form errors detected by AI pose estimation.

Your responses should be:
- Concise and actionable (2-4 bullet points max)
- Written in a supportive, coaching tone
- Based on sports science and biomechanics principles
- Include specific corrective exercises when relevant

Format your response as JSON with this structure:
{
  "severity": "high" | "moderate" | "low",
  "summary": "One sentence summary of the issue",
  "corrections": [
    { "title": "Short title", "description": "Brief explanation", "icon": "material_icon_name" }
  ],
  "trainerNote": "A personalized coaching note (1-2 sentences)",
  "warmupTip": "A specific warm-up exercise to prevent this issue"
}

IMPORTANT: You MUST write your entire response (all JSON values) in ${language === "th" ? "Thai" : "English"}.`;

        const userPrompt = `Analyze this exercise form error:
- Exercise: ${clip(exercise, 60) || "Unknown"}
- Error: ${errorTitle}
- Details: ${errorDetail || "No additional details"}
- Timestamp in session: ${clip(timestamp, 20) || "Unknown"}

Provide corrective feedback as JSON.`;

        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || "gemini-2.5-flash-lite",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            stream: false,
        });

        const content = response.choices[0]?.message?.content || "";

        // Try to parse JSON from the response
        let parsed;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            // If parsing fails, return raw text as a fallback
            parsed = {
                severity: "moderate",
                summary: content.substring(0, 200),
                corrections: [
                    { title: "Review Form", description: content.substring(0, 300), icon: "fitness_center" }
                ],
                trainerNote: "Please review the AI analysis above for personalized guidance.",
                warmupTip: "Always warm up thoroughly before heavy lifts."
            };
        }

        return NextResponse.json(parsed, {
            headers: {
                "X-RateLimit-Remaining": String(limiter?.remaining || 0),
            },
        });
    } catch (error: unknown) {
        console.error(
            "AI API Error:",
            error instanceof Error ? error.message : error
        );
        return NextResponse.json(
            { error: "AI analysis failed. Please try again." },
            { status: 500 }
        );
    }
}
