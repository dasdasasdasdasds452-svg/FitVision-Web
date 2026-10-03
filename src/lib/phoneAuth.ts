// Phone number = account. Supabase is set up for email + password, so a phone
// number is mapped to an internal email address (never shown to the user).
// That keeps per-account storage, cloud sync and friends working unchanged.
// NOTE: Supabase "Confirm email" must be OFF, since these addresses receive no mail.

/** Domain for internal phone-account emails. Must never be a real mailbox domain. */
export const PHONE_EMAIL_DOMAIN = "phone.fitvision.app";

/**
 * Normalise a Thai mobile number to E.164 digits without "+" (e.g. "66812345678").
 * Accepts "0812345678", "081-234-5678", "812345678", "+66812345678", "66812345678".
 * Returns null when it is not a 9-digit Thai number after the country code.
 */
export function normalizeThaiPhone(input: string): string | null {
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("66")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    // Thai mobile numbers: 6/8/9 + 8 digits (landlines are 8 digits and can't receive SMS later).
    return /^[689]\d{8}$/.test(digits) ? `66${digits}` : null;
}

export function phoneToEmail(phone66: string): string {
    return `${phone66}@${PHONE_EMAIL_DOMAIN}`;
}

export function isPhoneEmail(email: string | null | undefined): boolean {
    return !!email && email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/** "66812345678" → "081 234 5678" (local format, for display). */
export function formatThaiPhone(phone66: string): string {
    const local = "0" + phone66.replace(/^66/, "");
    return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}

/** What to show for an account: the phone number for phone accounts, else the email. */
export function displayAccount(email: string | null | undefined): string {
    if (!email) return "";
    if (isPhoneEmail(email)) return formatThaiPhone(email.split("@")[0]);
    return email;
}

/** Format digits as the user types: "0812345678" → "081 234 5678". */
export function formatPhoneInput(raw: string): string {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
