import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/**
 * false during the server render and the hydration pass, true afterwards.
 * Lets a page read browser-only data (localStorage) without calling setState in an effect.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
