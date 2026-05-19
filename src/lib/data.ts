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
