import type { Match } from "./types";

/** A match reoriented so the winner's info comes first. */
export interface OrientedMatch {
  winnerTeam: string;
  winnerCode: string;
  winnerScore: number;
  loserTeam: string;
  loserCode: string;
  loserScore: number;
  /** The penalty display string, already reoriented (winner–loser). */
  penaltyDisplay: string | null;
  /** Year parsed from match date, for flag lookups. */
  year: number;
  /** The original match data, for accessing date/stage/venue/etc. */
  original: Match;
}

/**
 * Reorient a match so the winner's data comes first.
 *
 * For draws decided by penalties, the penalty winner is treated as the winner.
 * For regular draws (no shootout), the home team is listed first by convention.
 */
export function orientMatch(m: Match): OrientedMatch {
  let wTeam = m.homeTeam,
    wCode = m.homeCode,
    wScore = m.homeScore;
  let lTeam = m.awayTeam,
    lCode = m.awayCode,
    lScore = m.awayScore;
  let penaltyDisplay: string | null = m.penaltyShootout ? m.penaltyScore : null;

  if (m.homeScore < m.awayScore) {
    // Away team won on regular score
    [wTeam, lTeam] = [lTeam, wTeam];
    [wCode, lCode] = [lCode, wCode];
    [wScore, lScore] = [lScore, wScore];
  } else if (
    m.homeScore === m.awayScore &&
    m.penaltyShootout &&
    m.penaltyScore
  ) {
    // Draw decided by penalties — check who won the shootout
    const parts = m.penaltyScore.split("–");
    const [penHome, penAway] = parts.map(Number);
    if (penAway > penHome) {
      [wTeam, lTeam] = [lTeam, wTeam];
      [wCode, lCode] = [lCode, wCode];
      [wScore, lScore] = [lScore, wScore];
      penaltyDisplay = `${penAway}–${penHome}`;
    }
  }

  return {
    winnerTeam: wTeam,
    winnerCode: wCode,
    winnerScore: wScore,
    loserTeam: lTeam,
    loserCode: lCode,
    loserScore: lScore,
    penaltyDisplay,
    year: parseInt(m.date.slice(0, 4)),
    original: m,
  };
}

/** Extract the tournament year from a tournament name string. */
export function parseTournamentYear(tournament: string): string {
  return tournament.replace(" FIFA Men's World Cup", "");
}

/** Parse the numeric year from a match's tournament field. */
export function getMatchYear(m: Match): number {
  return parseInt(parseTournamentYear(m.tournament));
}
