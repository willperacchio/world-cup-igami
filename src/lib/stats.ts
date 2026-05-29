/**
 * Pure statistical computations for the Fun Facts page.
 *
 * All functions here are free of React / UI / i18n concerns.
 * They take matches + scorigami data and return derived analytics.
 */

import type { Match, ScorigamiEntry } from "./types";
import { parseTournamentYear } from "./match-utils";

// ── Output types ──

export interface TeamScorigamiCount {
  team: string;
  code: string;
  count: number;
}

export interface TournamentStats {
  year: string;
  teams: number;
  matches: number;
  goalsPerGame: number;
  scorigamis: number;
}

export interface StageStats {
  stage: string;
  totalMatches: number;
  scorigamis: number;
  rate: number; // percentage
}

export interface StageSummary {
  total: number;
  scorigamis: number;
  rate: number;
}

export interface HostScorigami {
  match: Match;
  hostTeam: string;
}

export interface PenaltigamiEntry {
  /** Oriented penalty score, e.g. "5–4" (winner first) */
  penaltyScore: string;
  /** Match score at end of extra time, e.g. "1–1" */
  matchScore: string;
  /** Combined label, e.g. "1–1 (5–4 pens)" */
  label: string;
  /** All matches with this exact combo */
  matches: Match[];
  /** Whether this combo happened only once */
  isUnique: boolean;
}

export interface PenaltyGridCell {
  winner: number;
  loser: number;
  count: number;
  matches: Match[];
}

export interface PenaltigamiData {
  /** Unique match+penalty score combos */
  entries: PenaltigamiEntry[];
  /** Grid of penalty scores (winner × loser) for the heatmap */
  grid: PenaltyGridCell[];
  /** Max penalty score seen */
  maxPenScore: number;
}

export interface FunFactsData {
  uniqueScores: ScorigamiEntry[];
  mostCommon: ScorigamiEntry[];
  highestScoring: Match[];
  mostLopsided: Match[];
  mostRecent: Match | undefined;
  topTeams: TeamScorigamiCount[];
  scorigamiLeaders: TeamScorigamiCount[];
  tournamentStats: TournamentStats[];
  topFinalScore: { score: string; count: number; years: string[] } | null;
  allFinals: Match[];
  finalsScorigamis: Match[];
  hostScorigamis: HostScorigami[];
  penaltyCount: number;
  penaltigami: PenaltigamiData;
  extraTimeCount: number;
  totalGoals: number;
  goalDistribution: { totalGoals: number; count: number }[];
  stageBreakdown: StageStats[];
  stageSummary: { group: StageSummary; knockout: StageSummary };
  topScorigamiStage: StageStats | null;
}

// ── Helpers ──

function countByTeam(
  entries: ScorigamiEntry[],
): Record<string, { code: string; count: number }> {
  const counts: Record<string, { code: string; count: number }> = {};
  for (const s of entries) {
    const m = s.firstMatch;
    for (const [team, code] of [
      [m.homeTeam, m.homeCode],
      [m.awayTeam, m.awayCode],
    ]) {
      if (!counts[team]) counts[team] = { code, count: 0 };
      counts[team].count++;
    }
  }
  return counts;
}

function toLeaderboard(
  counts: Record<string, { code: string; count: number }>,
  limit: number,
): TeamScorigamiCount[] {
  return Object.entries(counts)
    .map(([team, { code, count }]) => ({ team, code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Computation stages (each handles one section of the Fun Facts page) ──

export function computeUniqueScores(scorigami: ScorigamiEntry[]): ScorigamiEntry[] {
  return scorigami.filter((s) => s.count === 1);
}

/**
 * Sort scorelines by frequency, then by total goals ascending (ties feel
 * more "common" at lower totals), then by margin ascending.
 */
export function computeMostCommon(scorigami: ScorigamiEntry[]): ScorigamiEntry[] {
  return [...scorigami]
    .filter((s) => s.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const totalA = a.highScore + a.lowScore;
      const totalB = b.highScore + b.lowScore;
      if (totalA !== totalB) return totalA - totalB;
      return (a.highScore - a.lowScore) - (b.highScore - b.lowScore);
    });
}

export function computeHighestScoring(matches: Match[], minGoals = 10): Match[] {
  return [...matches]
    .sort((a, b) => (b.homeScore + b.awayScore) - (a.homeScore + a.awayScore))
    .filter((m) => m.homeScore + m.awayScore >= minGoals);
}

export function computeMostLopsided(matches: Match[], limit = 5): Match[] {
  return [...matches]
    .sort((a, b) =>
      Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore),
    )
    .slice(0, limit);
}

export function computeMostRecentScorigami(uniqueScores: ScorigamiEntry[]): Match | undefined {
  const sorted = uniqueScores
    .map((s) => s.firstMatch)
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

export function computeTeamLeaders(
  scorigami: ScorigamiEntry[],
  limit = 10,
): TeamScorigamiCount[] {
  return toLeaderboard(countByTeam(scorigami), limit);
}

export function computeUniqueTeamLeaders(
  uniqueScores: ScorigamiEntry[],
  limit = 8,
): TeamScorigamiCount[] {
  return toLeaderboard(countByTeam(uniqueScores), limit);
}

export function computeTournamentStats(
  matches: Match[],
  scorigami: ScorigamiEntry[],
): TournamentStats[] {
  const data = new Map<string, { goals: number; matches: number; teams: Set<string> }>();
  for (const m of matches) {
    const year = parseTournamentYear(m.tournament);
    const d = data.get(year) || { goals: 0, matches: 0, teams: new Set<string>() };
    d.goals += m.homeScore + m.awayScore;
    d.matches++;
    d.teams.add(m.homeTeam);
    d.teams.add(m.awayTeam);
    data.set(year, d);
  }

  const scorigamiByTournament = new Map<string, number>();
  for (const s of scorigami) {
    if (s.count > 0) {
      const year = parseTournamentYear(s.firstMatch.tournament);
      scorigamiByTournament.set(year, (scorigamiByTournament.get(year) || 0) + 1);
    }
  }

  return [...data.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { goals, matches: count, teams }]) => ({
      year,
      teams: teams.size,
      matches: count,
      goalsPerGame: Math.round((goals / count) * 100) / 100,
      scorigamis: scorigamiByTournament.get(year) || 0,
    }));
}

export function computeFinalsData(matches: Match[], scorigami: ScorigamiEntry[]) {
  const finals = matches.filter((m) => m.stage === "final");

  // Most common finals score
  const finalScores: Record<string, { count: number; years: string[] }> = {};
  for (const m of finals) {
    const lo = Math.min(m.homeScore, m.awayScore);
    const hi = Math.max(m.homeScore, m.awayScore);
    const key = `${hi}-${lo}`;
    if (!finalScores[key]) finalScores[key] = { count: 0, years: [] };
    finalScores[key].count++;
    finalScores[key].years.push(m.date.slice(0, 4));
  }
  const topEntry = Object.entries(finalScores).sort((a, b) => b[1].count - a[1].count)[0];
  const topFinalScore = topEntry
    ? { score: topEntry[0], count: topEntry[1].count, years: topEntry[1].years }
    : null;

  // Finals where the scoreline happened for the first time ever
  const firstMatchKeys = new Set(
    scorigami.map((s) => `${s.firstMatch.date}|${s.firstMatch.homeTeam}|${s.firstMatch.awayTeam}`),
  );
  const finalsScorigamis = finals.filter((m) =>
    firstMatchKeys.has(`${m.date}|${m.homeTeam}|${m.awayTeam}`),
  );

  return { topFinalScore, allFinals: finals.sort((a, b) => a.date.localeCompare(b.date)), finalsScorigamis };
}

export function computeHostScorigamis(scorigami: ScorigamiEntry[]): HostScorigami[] {
  const results: HostScorigami[] = [];
  for (const s of scorigami) {
    const m = s.firstMatch;
    const hostCountry = m.country;
    if (m.homeTeam === hostCountry || m.awayTeam === hostCountry) {
      results.push({ match: m, hostTeam: hostCountry });
    }
  }
  results.sort((a, b) => a.match.date.localeCompare(b.match.date));
  return results;
}

/**
 * Bucket match total goals into a histogram.
 * Goals above `maxBucket` are collapsed into a single "N+" bucket.
 */
export function computeGoalDistribution(
  matches: Match[],
  maxBucket = 12,
): { totalGoals: number; count: number }[] {
  const counts: Record<number, number> = {};
  for (const m of matches) {
    const total = m.homeScore + m.awayScore;
    const bucket = total >= maxBucket ? maxBucket : total;
    counts[bucket] = (counts[bucket] || 0) + 1;
  }
  return Array.from({ length: maxBucket + 1 }, (_, i) => ({
    totalGoals: i,
    count: counts[i] || 0,
  }));
}

const ALL_STAGES = [
  "group stage", "second group stage", "round of 32", "round of 16",
  "quarter-finals", "semi-finals", "third-place match", "final round", "final",
] as const;

const GROUP_STAGES = ["group stage", "second group stage"];
const KNOCKOUT_STAGES = [
  "round of 32", "round of 16", "quarter-finals", "semi-finals",
  "third-place match", "final round", "final",
];

export function computeStageBreakdown(
  matches: Match[],
  scorigami: ScorigamiEntry[],
): { breakdown: StageStats[]; summary: { group: StageSummary; knockout: StageSummary }; topStage: StageStats | null } {
  const matchesByStage: Record<string, number> = {};
  for (const m of matches) {
    matchesByStage[m.stage] = (matchesByStage[m.stage] || 0) + 1;
  }

  const scorigamiByStage: Record<string, number> = {};
  for (const s of scorigami) {
    const stage = s.firstMatch.stage;
    scorigamiByStage[stage] = (scorigamiByStage[stage] || 0) + 1;
  }

  const breakdown = ALL_STAGES
    .filter((s) => matchesByStage[s])
    .map((stage) => ({
      stage,
      totalMatches: matchesByStage[stage] || 0,
      scorigamis: scorigamiByStage[stage] || 0,
      rate: matchesByStage[stage]
        ? ((scorigamiByStage[stage] || 0) / matchesByStage[stage]) * 100
        : 0,
    }));

  function sumStages(stages: string[]): StageSummary {
    const total = stages.reduce((s, st) => s + (matchesByStage[st] || 0), 0);
    const scorigamis = stages.reduce((s, st) => s + (scorigamiByStage[st] || 0), 0);
    return { total, scorigamis, rate: total ? (scorigamis / total) * 100 : 0 };
  }

  const topStage = breakdown.length > 0
    ? breakdown.reduce((best, s) => (s.scorigamis > best.scorigamis ? s : best), breakdown[0])
    : null;

  return {
    breakdown,
    summary: { group: sumStages(GROUP_STAGES), knockout: sumStages(KNOCKOUT_STAGES) },
    topStage,
  };
}

// ── Penaltigami ──

function computePenaltigami(matches: Match[]): PenaltigamiData {
  const penaltyMatches = matches
    .filter((m) => m.penaltyShootout && m.penaltyScore)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by oriented (matchScore, penaltyScore) combo for entries.
  const groups = new Map<string, Match[]>();
  // Grid: group just by penalty score (winner × loser) for the heatmap.
  const gridMap = new Map<string, Match[]>();
  let maxPenScore = 0;

  for (const m of penaltyMatches) {
    const ms = Math.max(m.homeScore, m.awayScore);
    const matchScore = `${ms}–${ms}`;

    const parts = m.penaltyScore.split(/[–-]/);
    const pHome = parseInt(parts[0]);
    const pAway = parseInt(parts[1]);
    const winner = Math.max(pHome, pAway);
    const loser = Math.min(pHome, pAway);
    const penaltyScore = `${winner}–${loser}`;
    maxPenScore = Math.max(maxPenScore, winner);

    const key = `${matchScore}|${penaltyScore}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);

    const gridKey = `${winner}-${loser}`;
    if (!gridMap.has(gridKey)) gridMap.set(gridKey, []);
    gridMap.get(gridKey)!.push(m);
  }

  const entries: PenaltigamiEntry[] = [];
  for (const [key, ms] of groups) {
    const [matchScore, penaltyScore] = key.split("|");
    entries.push({
      penaltyScore,
      matchScore,
      label: `${matchScore} (${penaltyScore} pens)`,
      matches: ms.sort((a, b) => a.date.localeCompare(b.date)),
      isUnique: ms.length === 1,
    });
  }

  entries.sort((a, b) => {
    if (a.isUnique !== b.isUnique) return a.isUnique ? -1 : 1;
    return a.matches[0].date.localeCompare(b.matches[0].date);
  });

  const grid: PenaltyGridCell[] = [];
  for (const [key, ms] of gridMap) {
    const [w, l] = key.split("-").map(Number);
    grid.push({ winner: w, loser: l, count: ms.length, matches: ms });
  }

  return { entries, grid, maxPenScore };
}

// ── Main aggregator ──

/**
 * Compute all Fun Facts data in one pass. This is a pure function — no React,
 * no hooks, no side effects. Easy to test in isolation.
 */
export function computeFunFacts(matches: Match[], scorigami: ScorigamiEntry[]): FunFactsData {
  const uniqueScores = computeUniqueScores(scorigami);
  const mostCommon = computeMostCommon(scorigami);
  const { topFinalScore, allFinals, finalsScorigamis } = computeFinalsData(matches, scorigami);
  const { breakdown, summary, topStage } = computeStageBreakdown(matches, scorigami);

  return {
    uniqueScores,
    mostCommon,
    highestScoring: computeHighestScoring(matches),
    mostLopsided: computeMostLopsided(matches),
    mostRecent: computeMostRecentScorigami(uniqueScores),
    topTeams: computeUniqueTeamLeaders(uniqueScores),
    scorigamiLeaders: computeTeamLeaders(scorigami),
    tournamentStats: computeTournamentStats(matches, scorigami),
    topFinalScore,
    allFinals,
    finalsScorigamis,
    hostScorigamis: computeHostScorigamis(scorigami),
    penaltyCount: matches.filter((m) => m.penaltyShootout).length,
    penaltigami: computePenaltigami(matches),
    extraTimeCount: matches.filter((m) => m.extraTime).length,
    totalGoals: matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0),
    goalDistribution: computeGoalDistribution(matches),
    stageBreakdown: breakdown,
    stageSummary: summary,
    topScorigamiStage: topStage,
  };
}
