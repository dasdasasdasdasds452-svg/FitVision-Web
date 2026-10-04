// Per-account localStorage keys, so people who share a device don't see each
// other's workouts, chats or profile. The account is identified by email.

/** Keys that belong to one account. Device-wide settings (language, voice…) are not listed. */
export const USER_SCOPED_KEYS = [
    "fitvision_history",
    "fitvision_chat_history",
    "fitvision_display_name",
    "fitvision_avatar",
    "fitvision_height",
    "fitvision_weight",
    "fitvision_age",
    "fitvision_last_setup",
    "fitvision_weekly_goal",
    "fitvision_missions",
    "fitvision_ghost_reps",
    "fitvision_guide_seen",
] as const;
export type UserScopedKey = (typeof USER_SCOPED_KEYS)[number];

const LEGACY_OWNER_KEY = "fitvision_legacy_owner";
let currentAccount: string | null = null;

export function accountIdFor(user: { email?: string | null; id?: string } | null | undefined): string | null {
    if (!user) return null;
    return (user.email || user.id || "").trim().toLowerCase() || null;
}

export function scopedKey(base: UserScopedKey, account: string | null = currentAccount): string {
    return account ? `${base}:${account}` : base;
}

/**
 * Data saved before accounts were separated has no owner. Hand it to the first
 * account that signs in on this device (that is who has been using it), once.
 */
function claimLegacyData(account: string): void {
    try {
        const ls = window.localStorage;
        if (ls.getItem(LEGACY_OWNER_KEY)) return;
        let found = false;
        for (const base of USER_SCOPED_KEYS) {
            const legacy = ls.getItem(base);
            if (legacy === null) continue;
            found = true;
            if (ls.getItem(scopedKey(base, account)) === null) ls.setItem(scopedKey(base, account), legacy);
            ls.removeItem(base);
        }
        if (found) ls.setItem(LEGACY_OWNER_KEY, account);
    } catch {
        /* storage unavailable */
    }
}

/** Called by AuthProvider whenever the signed-in account changes. */
export function setStorageAccount(account: string | null): void {
    if (account === currentAccount) return;
    currentAccount = account;
    if (account && typeof window !== "undefined") claimLegacyData(account);
}

/** The account whose data is currently read and written (lower-case email), if any. */
export function getStorageAccount(): string | null {
    return currentAccount;
}

export function getUserItem(base: UserScopedKey): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(scopedKey(base));
    } catch {
        return null;
    }
}

/** Read another account's value (e.g. right after sign-in, before the account switch renders). */
export function getUserItemFor(base: UserScopedKey, account: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(scopedKey(base, account));
    } catch {
        return null;
    }
}

export function setUserItem(base: UserScopedKey, value: string, account: string | null = currentAccount): boolean {
    if (typeof window === "undefined") return false;
    try {
        window.localStorage.setItem(scopedKey(base, account), value);
        return true;
    } catch {
        return false;
    }
}

export function removeUserItem(base: UserScopedKey): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(scopedKey(base));
    } catch {
        /* ignore */
    }
}
