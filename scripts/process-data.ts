/**
 * Build matches.json / scorigami.json / summary.json from:
 *   1. matches.csv         — historical record (Fjelstul World Cup Database)
 *   2. live-matches.json   — recently-finished matches from football-data.org
 *                            (written by scripts/fetch-live-matches.ts)
 *   3. overrides.json      — hand-curated corrections (optional, wins over both)
 *
 * Dedup key is (date|homeTeam|awayTeam). Precedence: overrides > live > csv.
 * Run via: `npx tsx scripts/process-data.ts`
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { mergeMatches } from "./lib/merge-matches";

const dataDir = join(__dirname, "../data");
const raw = readFileSync(join(dataDir, "matches.csv"), "utf-8");
const lines = raw.trim().split("\n");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const headers = parseCSVLine(lines[0]);

function getCol(row: string[], col: string): string {
  return row[headers.indexOf(col)] ?? "";
}

// Resolve T-code IDs to proper team names
const teamIdToName: Record<string, string> = {};
lines.slice(1).forEach((line) => {
  const cols = parseCSVLine(line);
  const hid = getCol(cols, "home_team_id");
  const hname = getCol(cols, "home_team_name");
  const aid = getCol(cols, "away_team_id");
  const aname = getCol(cols, "away_team_name");
  if (hid && hname && !hname.startsWith("T-")) teamIdToName[hid] = hname;
  if (aid && aname && !aname.startsWith("T-")) teamIdToName[aid] = aname;
});

function resolveTeamName(name: string, id: string): string {
  if (name.startsWith("T-")) return teamIdToName[id] || name;
  return name;
}

interface Match {
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

const allMatches = lines.slice(1).map((line) => {
  const cols = parseCSVLine(line);
  const homeId = getCol(cols, "home_team_id");
  const awayId = getCol(cols, "away_team_id");
  return {
    date: getCol(cols, "match_date"),
    tournament: getCol(cols, "tournament_name"),
    stage: getCol(cols, "stage_name"),
    homeTeam: resolveTeamName(getCol(cols, "home_team_name"), homeId),
    awayTeam: resolveTeamName(getCol(cols, "away_team_name"), awayId),
    homeCode: getCol(cols, "home_team_code"),
    awayCode: getCol(cols, "away_team_code"),
    homeScore: parseInt(getCol(cols, "home_team_score")),
    awayScore: parseInt(getCol(cols, "away_team_score")),
    extraTime: getCol(cols, "extra_time") === "1",
    penaltyShootout: getCol(cols, "penalty_shootout") === "1",
    penaltyScore: getCol(cols, "score_penalties"),
    stadium: getCol(cols, "stadium_name"),
    city: getCol(cols, "city_name"),
    country: getCol(cols, "country_name"),
  };
});

// Filter to Men's World Cup only
const historicalMatches: Match[] = allMatches.filter((m) =>
  m.tournament.includes("Men's World Cup")
);

// Merge in live results from football-data.org (if present) and any
// hand-curated overrides. Precedence: overrides > live > historical CSV.
const livePath = join(dataDir, "live-matches.json");
const liveMatches: Match[] = existsSync(livePath)
  ? (JSON.parse(readFileSync(livePath, "utf-8")) as { matches: Match[] }).matches
  : [];

const overridesPath = join(dataDir, "overrides.json");
let overrideMatches: Match[] = [];
if (existsSync(overridesPath)) {
  const raw = JSON.parse(readFileSync(overridesPath, "utf-8")) as
    | Match[]
    | { matches: Match[] };
  overrideMatches = Array.isArray(raw) ? raw : raw.matches;
}

const { matches, liveAdded, overridesApplied } = mergeMatches(
  historicalMatches,
  liveMatches,
  overrideMatches,
);
const overridesAdded = overridesApplied;

// Build scorigami matrix: key is "lowScore-highScore" to normalize
const scorigamiMap = new Map<
  string,
  { count: number; firstMatch: Match; lastMatch: Match }
>();

for (const match of matches) {
  const low = Math.min(match.homeScore, match.awayScore);
  const high = Math.max(match.homeScore, match.awayScore);
  const key = `${low}-${high}`;

  const existing = scorigamiMap.get(key);
  if (!existing) {
    scorigamiMap.set(key, { count: 1, firstMatch: match, lastMatch: match });
  } else {
    existing.count++;
    existing.lastMatch = match;
  }
}

const scorigami = Array.from(scorigamiMap.entries())
  .map(([key, val]) => {
    const [low, high] = key.split("-").map(Number);
    return {
      lowScore: low,
      highScore: high,
      count: val.count,
      firstMatch: val.firstMatch,
      lastMatch: val.lastMatch,
    };
  })
  .sort((a, b) => a.lowScore - b.lowScore || a.highScore - b.highScore);

const maxScore = Math.max(...matches.map((m) => Math.max(m.homeScore, m.awayScore)));

const summary = {
  totalMatches: matches.length,
  uniqueScores: scorigami.length,
  maxScore,
  dateRange: {
    first: matches[0].date,
    last: matches[matches.length - 1].date,
  },
};

writeFileSync(join(dataDir, "matches.json"), JSON.stringify(matches, null, 2));
writeFileSync(join(dataDir, "scorigami.json"), JSON.stringify(scorigami, null, 2));
writeFileSync(join(dataDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log("Processed data:");
console.log(`  ${historicalMatches.length} matches from historical CSV`);
console.log(`  ${liveAdded} new match(es) from live-matches.json`);
console.log(`  ${overridesAdded} override(s) applied`);
console.log(`  ${summary.totalMatches} matches total`);
console.log(`  ${summary.uniqueScores} unique score combinations`);
console.log(`  Max score in a match: ${maxScore}`);
console.log(`  Date range: ${summary.dateRange.first} to ${summary.dateRange.last}`);
