/**
 * Pure mapping helpers that turn football-data.org's v4 match payload into
 * the internal `Match` shape the app reads from data/matches.json.
 *
 * Kept separate from scripts/fetch-live-matches.ts so it can be unit-tested
 * without importing the side-effectful fetch entry point.
 */

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  homeTeam: { id: number; name: string; shortName?: string; tla?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string };
  score: {
    winner: string | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
  venue?: string | null;
  competition?: { name?: string };
  season?: { startDate?: string };
}

export interface InternalMatch {
  date: string;
  tournament: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  extraTime: boolean;
  penaltyShootout: boolean;
  penaltyScore: string;
  stadium: string;
  city: string;
  country: string;
}

/**
 * Map football-data.org stage codes onto the strings the existing UI/i18n
 * already knows. Anything unrecognized falls through as lowercase-with-dashes
 * so a translation can be added later without breaking the build.
 */
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group stage",
  LAST_32: "round of 32",
  LAST_16: "round of 16",
  ROUND_OF_16: "round of 16",
  QUARTER_FINALS: "quarter-finals",
  SEMI_FINALS: "semi-finals",
  THIRD_PLACE: "third-place match",
  FINAL: "final",
};

export function mapStage(fdStage: string): string {
  if (STAGE_MAP[fdStage]) return STAGE_MAP[fdStage];
  return fdStage.toLowerCase().replace(/_/g, "-");
}

/**
 * Map a football-data.org match payload onto our internal Match shape.
 * Returns null if the match is missing a final scoreline (e.g. it's still
 * scheduled or in progress).
 *
 * For scorigami purposes the final scoreline is regulation + extra time;
 * penalty shootouts do not modify the scoreline. football-data.org's
 * `score.fullTime` follows this convention, so we use it directly.
 */
export function mapMatch(m: FdMatch): InternalMatch | null {
  const home = m.score.fullTime.home;
  const away = m.score.fullTime.away;
  if (home == null || away == null) return null;

  const date = m.utcDate.slice(0, 10); // YYYY-MM-DD
  const year = date.slice(0, 4);
  const tournament = `${year} FIFA Men's World Cup`;

  const penaltyShootout = m.score.duration === "PENALTY_SHOOTOUT";
  const extraTime =
    m.score.duration === "EXTRA_TIME" || penaltyShootout;

  let penaltyScore = "";
  if (penaltyShootout && m.score.penalties) {
    const ph = m.score.penalties.home;
    const pa = m.score.penalties.away;
    if (ph != null && pa != null) penaltyScore = `${ph}-${pa}`;
  }

  return {
    date,
    tournament,
    stage: mapStage(m.stage),
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    homeCode: m.homeTeam.tla || m.homeTeam.shortName || "",
    awayCode: m.awayTeam.tla || m.awayTeam.shortName || "",
    homeScore: home,
    awayScore: away,
    extraTime,
    penaltyShootout,
    penaltyScore,
    stadium: m.venue || "",
    city: "",
    country: "",
  };
}
