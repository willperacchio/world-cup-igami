"use client";

import type { Match } from "@/lib/types";
import { orientMatch } from "@/lib/match-utils";
import { getWikipediaUrl, getFifaUrl } from "@/lib/external-links";
import { Flag } from "./Flag";

/**
 * Single source of truth for rendering a match as a horizontal scoreline:
 *
 *   [prefix?]  [date?]  team A  flag  score  flag  team B  (year?)  [venue?]  [↗ links?]
 *
 * Used by MatchDetail (open one match) and FunFacts (featured matches in
 * various sections). MatchTable uses a tabular layout instead, but shares the
 * Flag and score-formatting conventions via this component's siblings.
 *
 * Defaults are tuned for the FunFacts "compact" use case; opt into showDate
 * and showVenue for the MatchDetail "detailed" use case.
 */

interface MatchScorelineProps {
  match: Match;
  /**
   * "winner" puts the higher-scoring team on the left; "home" preserves the
   * original home/away order from the data.
   */
  orient?: "winner" | "home";
  /** Show the full date column at the start of the row. */
  showDate?: boolean;
  /** Show the year suffix "(YYYY)" before the link column. */
  showYear?: boolean;
  /** Show the stage + city/country block (hidden on mobile). */
  showVenue?: boolean;
  /** Show Wikipedia + FIFA ↗ links at the end of the row. */
  showLinks?: boolean;
  /** Display variant for the links column: "labels" (text) or "icons" (↗ only). */
  linkVariant?: "labels" | "icons";
  /** A custom prefix slot — e.g. ⚽ marker, rank number. */
  prefix?: React.ReactNode;
  /** Override flag size. */
  flagSize?: "xs" | "sm" | "md";
  /** Localized stage label (translated via tStages). Defaults to raw stage. */
  stageLabel?: string;
}

export function MatchScoreline({
  match,
  orient = "winner",
  showDate = false,
  showYear = true,
  showVenue = false,
  showLinks = false,
  linkVariant = "icons",
  prefix,
  flagSize = "sm",
  stageLabel,
}: MatchScorelineProps) {
  const o = orientMatch(match);

  const left = orient === "winner"
    ? { team: o.winnerTeam, code: o.winnerCode, score: o.winnerScore }
    : { team: match.homeTeam, code: match.homeCode, score: match.homeScore };
  const right = orient === "winner"
    ? { team: o.loserTeam, code: o.loserCode, score: o.loserScore }
    : { team: match.awayTeam, code: match.awayCode, score: match.awayScore };
  const penaltyDisplay = orient === "winner" ? o.penaltyDisplay : match.penaltyScore;

  return (
    <div className="flex items-center gap-2 w-full text-sm">
      {prefix !== undefined && (
        <span className="shrink-0 text-xs w-4 sm:w-5 text-center">{prefix}</span>
      )}
      {showDate && (
        <span className="text-zinc-400 text-[10px] sm:text-xs w-16 sm:w-24 shrink-0">
          {match.date}
        </span>
      )}
      <span className="flex-1 text-end font-medium flex items-center justify-end gap-1.5 min-w-0">
        <span className="truncate">{left.team}</span>
        <Flag code={left.code} year={o.year} size={flagSize} alt={left.team} />
      </span>
      <span className="font-bold w-16 sm:w-20 text-center shrink-0">
        {left.score}–{right.score}
        {match.extraTime && !match.penaltyShootout && (
          <span className="text-[10px] text-zinc-400 block leading-tight">aet</span>
        )}
        {match.penaltyShootout && penaltyDisplay && (
          <span className="text-[10px] text-zinc-400 block leading-tight">
            {penaltyDisplay} pen
          </span>
        )}
      </span>
      <span className="flex-1 font-medium flex items-center gap-1.5 min-w-0">
        <Flag code={right.code} year={o.year} size={flagSize} alt={right.team} />
        <span className="truncate">{right.team}</span>
      </span>
      {showYear && !showDate && (
        <span className="text-zinc-400 text-xs shrink-0 sb-numeral">({o.year})</span>
      )}
      {showVenue && (
        <span className="hidden sm:block text-zinc-400 text-xs w-32 text-end shrink-0">
          <span className="block">{stageLabel ?? match.stage}</span>
          <span className="text-zinc-500">{match.city}, {match.country}</span>
        </span>
      )}
      {showLinks && (
        <span className="hidden sm:flex items-center gap-2 shrink-0 text-[10px]">
          <a
            href={getWikipediaUrl(match)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400/70 hover:text-amber-300 underline decoration-amber-400/30 hover:decoration-amber-300 underline-offset-2 transition-colors"
            aria-label={`Wikipedia: ${left.team} vs ${right.team} (${o.year})`}
            title="Read more on Wikipedia"
            onClick={(e) => e.stopPropagation()}
          >
            {linkVariant === "labels" ? "Wikipedia ↗" : "W↗"}
          </a>
          <a
            href={getFifaUrl(match)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-400 hover:text-stone-200 underline decoration-stone-400/30 hover:decoration-stone-200 underline-offset-2 transition-colors"
            aria-label={`FIFA: ${left.team} vs ${right.team} (${o.year})`}
            title="View on FIFA"
            onClick={(e) => e.stopPropagation()}
          >
            {linkVariant === "labels" ? "FIFA ↗" : "F↗"}
          </a>
        </span>
      )}
    </div>
  );
}
