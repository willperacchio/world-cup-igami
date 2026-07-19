"use client";

import { useSyncExternalStore } from "react";

/** How long a scorigami stays "fresh" enough to celebrate, in days. */
export const FRESH_WINDOW_DAYS = 30;

const subscribe = () => () => {};

/** Whether `date` is within the last `windowDays` of the viewer's clock. */
function isWithinDays(date: string, windowDays: number): boolean {
  const days = (Date.now() - Date.parse(`${date}T12:00:00Z`)) / 86_400_000;
  return days >= 0 && days <= windowDays;
}

/**
 * True when `date` (a YYYY-MM-DD match date) falls within the last
 * FRESH_WINDOW_DAYS. Gated on mount via useSyncExternalStore (server snapshot
 * false, client snapshot true) so server and client render agree, then
 * evaluated against the viewer's clock — so a celebration auto-expires without
 * needing a rebuild, and never triggers a hydration mismatch.
 */
export function useIsRecent(date: string | undefined, windowDays = FRESH_WINDOW_DAYS): boolean {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted && !!date && isWithinDays(date, windowDays);
}
