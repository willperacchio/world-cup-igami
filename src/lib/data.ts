import matchesData from "../../data/matches.json";
import scorigamiData from "../../data/scorigami.json";
import summaryData from "../../data/summary.json";
import type { Match, ScorigamiEntry, Summary } from "./types";

export const matches = matchesData as Match[];
export const scorigami = scorigamiData as ScorigamiEntry[];
export const summary = summaryData as Summary;

export function getScorigamiGrid(): Map<string, ScorigamiEntry> {
  const map = new Map<string, ScorigamiEntry>();
  for (const entry of scorigami) {
    map.set(`${entry.lowScore}-${entry.highScore}`, entry);
  }
  return map;
}

export function getMatchesForScore(
  low: number,
  high: number
): Match[] {
  return matches.filter((m) => {
    const lo = Math.min(m.homeScore, m.awayScore);
    const hi = Math.max(m.homeScore, m.awayScore);
    return lo === low && hi === high;
  });
}

export function buildGridFromMatches(filtered: Match[]): Map<string, ScorigamiEntry> {
  const buckets = new Map<string, Match[]>();
  for (const m of filtered) {
    const lo = Math.min(m.homeScore, m.awayScore);
    const hi = Math.max(m.homeScore, m.awayScore);
    const key = `${lo}-${hi}`;
    const arr = buckets.get(key) || [];
    arr.push(m);
    buckets.set(key, arr);
  }
  const grid = new Map<string, ScorigamiEntry>();
  for (const [key, arr] of buckets) {
    const sorted = arr.sort((a, b) => a.date.localeCompare(b.date));
    const [lo, hi] = key.split("-").map(Number);
    grid.set(key, {
      lowScore: lo,
      highScore: hi,
      count: arr.length,
      firstMatch: sorted[0],
      lastMatch: sorted[sorted.length - 1],
    });
  }
  return grid;
}

export const tournamentYears: number[] = (() => {
  const years = new Set(matches.map((m) => parseInt(m.tournament.replace(" FIFA Men's World Cup", ""))));
  return [...years].sort((a, b) => a - b);
})();
