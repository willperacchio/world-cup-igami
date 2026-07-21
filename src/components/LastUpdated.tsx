"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";

/**
 * "Data updated 8 minutes ago" indicator.
 *
 * The site is statically generated, so the timestamp baked in at build time
 * goes stale between deploys. To stay honest we re-fetch live-matches.json
 * from the repo's raw GitHub URL (which the data-refresh cron commits to
 * every 10 minutes) and fall back to the build-time value if that fails.
 *
 * Renders nothing until mounted (relative times depend on Date.now(), which
 * would mismatch between server and client render) and nothing at all if no
 * fetch timestamp exists yet.
 */

/**
 * Each edition refreshes from its own live-data file so the indicator (and its
 * off-season auto-hide) is correct per edition. The women's file only exists
 * once the 2027 WWC live pipeline is wired (see REACTIVATION.md); until then
 * the women's page passes no timestamp and nothing renders.
 */
const RAW_URL: Record<"mens" | "womens", string> = {
  mens: "https://raw.githubusercontent.com/willperacchio/world-cup-igami/main/data/live-matches.json",
  womens:
    "https://raw.githubusercontent.com/willperacchio/world-cup-igami/main/data/womens/live-matches.json",
};

interface Props {
  /** Build-time lastFetched value from the edition's live-matches.json ("" if never fetched). */
  initialTimestamp: string;
  /** Which edition's live data to poll. Defaults to men's. */
  edition?: "mens" | "womens";
}

function formatRelative(iso: string, locale: string): string | null {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  // A timestamp from the future (clock skew) just reads as "now".
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMin < 1) return rtf.format(0, "minute");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}

/** Whether the pipeline is actively refreshing (last fetch within 3 days). */
function isFreshEnough(iso: string): boolean {
  const ageDays = (Date.now() - Date.parse(iso)) / 86_400_000;
  return Number.isFinite(ageDays) && ageDays <= 3;
}

export default function LastUpdated({
  initialTimestamp,
  edition = "mens",
}: Props) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  // Gate rendering on mount so server and client HTML always match —
  // useSyncExternalStore returns the server snapshot (false) during
  // hydration and the client snapshot (true) after.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Re-render every 30s so the label ticks over without a fetch.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(RAW_URL[edition], { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { lastFetched?: string };
        if (!cancelled && data.lastFetched) setTimestamp(data.lastFetched);
      } catch {
        // Offline or GitHub unreachable — keep whatever we have.
      }
    };

    refresh();
    const fetchInterval = setInterval(refresh, 5 * 60_000);
    const tickInterval = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(fetchInterval);
      clearInterval(tickInterval);
    };
  }, [edition]);

  if (!mounted || !timestamp) return null;
  // Off-season auto-hide: the "live" indicator only makes sense while the
  // data pipeline is actively refreshing. Once the last fetch is older than
  // 3 days (cron slowed or paused between tournaments), showing "updated
  // N weeks ago" reads as broken — hide instead. Reappears automatically
  // when the pipeline spins back up.
  if (!isFreshEnough(timestamp)) return null;
  const relative = formatRelative(timestamp, locale);
  if (!relative) return null;

  return (
    <p className="mt-2 flex items-center justify-end gap-1.5 font-mono text-[10px] tracking-[0.06em] uppercase text-stone-500">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
      </span>
      {t("lastUpdated", { time: relative })}
    </p>
  );
}
