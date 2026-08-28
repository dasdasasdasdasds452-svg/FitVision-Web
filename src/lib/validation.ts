/** Validation constants for AI API routes */
export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_TOTAL_CONTENT_LENGTH = 100_000;

/**
 * Validate incoming chat/analyze request payload.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateMessages(messages: unknown): string | null {
    if (!messages || !Array.isArray(messages)) {
        return "Missing or invalid messages array";
    }
    if (messages.length === 0) {
        return "Messages array is empty";
    }
    if (messages.length > MAX_MESSAGES) {
        return `Too many messages (max ${MAX_MESSAGES})`;
    }

    let totalContent = 0;
    for (const msg of messages) {
        if (!msg || typeof msg !== "object" || !("role" in msg) || !("content" in msg)) {
            return "Each message must have 'role' and 'content' fields";
        }
        if (typeof msg.content !== "string") {
            return "Message content must be a string";
        }
        if (msg.content.length > MAX_MESSAGE_LENGTH) {
            return `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
        }
        totalContent += msg.content.length;
    }

    if (totalContent > MAX_TOTAL_CONTENT_LENGTH) {
        return `Total content too long (max ${MAX_TOTAL_CONTENT_LENGTH} characters)`;
    }

    return null;
}
