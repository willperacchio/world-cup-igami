/**
 * Pure merge: combine historical CSV-derived matches with live results from
 * football-data.org and any hand-curated overrides.
 *
 * Dedup key is (date|homeTeam|awayTeam). Precedence (last write wins):
 *   overrides > live > historical
 *
 * Returned array is sorted by date ascending so downstream consumers don't
 * have to re-sort.
 */

export interface MatchLike {
  date: string;
  /** Optional full UTC kickoff timestamp; preferred over `date` for sorting. */
  kickoff?: string;
  homeTeam: string;
  awayTeam: string;
}

export interface MergeResult<T extends MatchLike> {
  matches: T[];
  /** How many live matches were new (i.e. not already in historical). */
  liveAdded: number;
  /** How many override entries were applied. */
  overridesApplied: number;
}

const key = (m: MatchLike) => `${m.date}|${m.homeTeam}|${m.awayTeam}`;

export function mergeMatches<T extends MatchLike>(
  historical: T[],
  live: T[] = [],
  overrides: T[] = [],
): MergeResult<T> {
  const merged = new Map<string, T>();

  for (const m of historical) merged.set(key(m), m);

  let liveAdded = 0;
  for (const m of live) {
    if (!merged.has(key(m))) liveAdded++;
    merged.set(key(m), m);
  }

  let overridesApplied = 0;
  for (const m of overrides) {
    overridesApplied++;
    merged.set(key(m), m);
  }

  // Sort chronologically. Prefer the full kickoff timestamp when present (live
  // matches) so same-day games order by actual kickoff time; fall back to the
  // calendar date for historical matches. ISO strings sort lexically, and a
  // bare "YYYY-MM-DD" sorts before any same-day "YYYY-MM-DDThh:..." timestamp.
  const sortKey = (m: T) => m.kickoff || m.date;
  const matches = Array.from(merged.values()).sort((a, b) =>
    sortKey(a).localeCompare(sortKey(b)),
  );

  return { matches, liveAdded, overridesApplied };
}
