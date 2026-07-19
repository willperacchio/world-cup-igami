"use client";

import { useTranslations } from "next-intl";
import type { Match } from "@/lib/types";
import { MatchScoreline } from "./MatchScoreline";
import { useSoccerBurst } from "@/hooks/useSoccerBurst";

interface Props {
  match: Match;
  /** Ordinal of this scoreline among all unique scorelines (e.g. 34). */
  uniqueNumber: number;
  /** Total matches in the edition, for the "in N matches" flourish. */
  totalMatches: number;
  className?: string;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/**
 * Celebratory banner announcing a brand-new scoreline. Meant to be rendered
 * only when the scorigami is fresh (see useIsRecent) — this component assumes
 * the caller has already decided to celebrate.
 */
export default function ScorigamiCelebration({ match, uniqueNumber, totalMatches, className = "" }: Props) {
  const t = useTranslations("celebration");
  const tStages = useTranslations("stages");

  // Same ⚽ burst as the highlighted grid cell, fired from wherever the
  // cursor enters the banner (or its center on keyboard focus).
  const { spawnBurstAt, spawnBurstFromElement, burstPortal } = useSoccerBurst();

  const high = Math.max(match.homeScore, match.awayScore);
  const low = Math.min(match.homeScore, match.awayScore);
  const score = `${high}–${low}`;
  const years = new Date().getFullYear() - 1930;

  return (
    <aside
      className={`sb-celebrate relative overflow-hidden rounded-sm border border-amber-300/70 bg-[#1a1608]/70 px-5 py-4 ${className}`}
      onMouseEnter={(e) => spawnBurstAt(e.clientX, e.clientY)}
      tabIndex={-1}
      onFocus={(e) => spawnBurstFromElement(e.currentTarget)}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-amber-300 mb-2">
        <span className="text-base leading-none">🎉</span>
        {t("kicker")}
      </div>
      <div className="text-lg">
        <MatchScoreline match={match} orient="winner" showLinks linkVariant="icons" />
      </div>
      <p className="text-stone-300 text-sm mt-2 leading-relaxed">
        {t("body", { score, years, total: totalMatches.toLocaleString() })}
      </p>
      <p className="text-stone-500 text-xs mt-1 font-mono">
        {tStages(match.stage)}
        {match.city ? ` · ${match.city}, ${match.country}` : ""} · {t("ordinalLine", { ordinal: ordinal(uniqueNumber) })}
      </p>
      {burstPortal}
    </aside>
  );
}
