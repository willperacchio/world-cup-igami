/**
 * Metadata for known-upcoming tournaments. Used to make the timeline scrubber
 * include a year even before any matches from it have finished — otherwise the
 * scrubber would top out at the most recent year in the historical data.
 *
 * As soon as the first 2026 match lands in matches.json (via the live cron
 * or an override), the year shows up "naturally" from the match data anyway,
 * so this list can stay short and only describe truly upcoming tournaments.
 */
export interface UpcomingTournament {
  /** Tournament year, matches what would be parsed out of the tournament name. */
  year: number;
  /** Localized date in ISO format (YYYY-MM-DD) of the first match. */
  firstMatchDate: string;
  /** Localized date in ISO format (YYYY-MM-DD) of the last match (final). */
  lastMatchDate: string;
}

export const UPCOMING_TOURNAMENTS: UpcomingTournament[] = [
  { year: 2026, firstMatchDate: "2026-06-11", lastMatchDate: "2026-07-19" },
];

/** Women's edition: 2027 FIFA Women's World Cup in Brazil. */
export const WOMENS_UPCOMING_TOURNAMENTS: UpcomingTournament[] = [
  { year: 2027, firstMatchDate: "2027-06-24", lastMatchDate: "2027-07-25" },
];

/**
 * Merge historical match years with the years from the given upcoming list,
 * deduplicate, and return sorted ascending. Used by lib/data*.ts to compute
 * `tournamentYears` for the timeline scrubber. Defaults to the men's list so
 * existing callers keep working.
 */
export function getEffectiveTournamentYears(
  matchYears: number[],
  upcoming: UpcomingTournament[] = UPCOMING_TOURNAMENTS,
): number[] {
  const all = new Set(matchYears);
  for (const t of upcoming) all.add(t.year);
  return [...all].sort((a, b) => a - b);
}

/**
 * If the given year is an upcoming tournament that has not started yet
 * (no matches present in the supplied list), return its metadata. Returns
 * null when the year is historical or when the upcoming tournament has
 * already kicked off (i.e. at least one match exists).
 */
export function getUpcomingTournamentStatus(
  year: number,
  matchYears: number[],
  upcoming: UpcomingTournament[] = UPCOMING_TOURNAMENTS,
): UpcomingTournament | null {
  const found = upcoming.find((t) => t.year === year);
  if (!found) return null;
  if (matchYears.includes(year)) return null;
  return found;
}
