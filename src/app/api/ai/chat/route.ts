import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/apiHelpers";
import { validateMessages } from "@/lib/validation";

export async function POST(request: NextRequest) {
    const { success, response, limiter } = await checkRateLimit(request, 20, 60_000);
    if (!success) {
        return response;
    }
    // ── Rate Limiting (done via checkRateLimit) ──────────────────────────────────

    // ── Input validation ────────────────────────────────────────────────────
    try {
        const body = await request.json();
        const { messages } = body;

        const validationError = validateMessages(messages);
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 });
        }

        // ── AI call ─────────────────────────────────────────────────────────
        const openai = new OpenAI({
            apiKey: process.env.AI_API_KEY,
            baseURL: process.env.AI_BASE_URL,
        });

        const systemMessage = {
            role: "system" as const,
            content: `You are FitVision AI Coach — a world-class fitness and biomechanics expert powered by advanced AI.

Your role:
- Help users improve their exercise form
- Answer questions about fitness, exercise technique, injury prevention, and workout programming
- Provide science-backed advice on biomechanics and movement patterns
- Be encouraging, supportive, and motivational
- Keep responses concise and practical (not too long)

Exercises you specialize in: Bench Press, Squat, Deadlift (but can discuss any exercise)

Rules:
- Always prioritize safety
- If someone describes pain, recommend they see a medical professional
- Use bullet points and short paragraphs for readability
- You can use emoji sparingly for friendliness
- Reply in the same language the user is using (Thai or English)`,
        };

        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || "gemini-2.5-flash-lite",
            messages: [systemMessage, ...messages],
            stream: false,
        });

        const content =
            response.choices[0]?.message?.content ||
            "Sorry, I couldn't generate a response.";

        return NextResponse.json(
            { message: content },
            {
                headers: {
                    "X-RateLimit-Remaining": String(limiter?.remaining || 0),
                },
            }
        );
    } catch (error: unknown) {
        console.error(
            "Chat API Error:",
            error instanceof Error ? error.message : error
        );
        return NextResponse.json(
            { error: "Chat failed. Please try again." },
            { status: 500 }
        );
    }
}
