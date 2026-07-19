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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
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

// The CSV's women's rows use singular stage names ("quarter-final") where the
// men's rows — and the UI's i18n keys — use plural. Normalize at ingestion.
const STAGE_NORMALIZE: Record<string, string> = {
  "quarter-final": "quarter-finals",
  "semi-final": "semi-finals",
};

const allMatches = lines.slice(1).map((line) => {
  const cols = parseCSVLine(line);
  const homeId = getCol(cols, "home_team_id");
  const awayId = getCol(cols, "away_team_id");
  const rawStage = getCol(cols, "stage_name");
  return {
    date: getCol(cols, "match_date"),
    tournament: getCol(cols, "tournament_name"),
    stage: STAGE_NORMALIZE[rawStage] || rawStage,
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

// Backfill venue for 2026 matches. football-data.org provides no venue for
// World Cup matches, so live/override 2026 entries arrive with empty
// stadium/city/country. data/venues-2026.json (built from FIFA's API by
// scripts/build-venues.ts) supplies them, keyed by date + team codes.
const venuesPath = join(dataDir, "venues-2026.json");
let venuesAdded = 0;
if (existsSync(venuesPath)) {
  const venues = JSON.parse(readFileSync(venuesPath, "utf-8")) as Record<
    string,
    { stadium: string; city: string; country: string }
  >;
  for (const m of matches) {
    if (m.city || !m.tournament.includes("2026")) continue;
    const v =
      venues[`${m.date}|${m.homeCode}|${m.awayCode}`] ||
      venues[`${m.date}|${m.awayCode}|${m.homeCode}`];
    if (v) {
      if (!m.stadium) m.stadium = v.stadium;
      m.city = v.city;
      m.country = v.country;
      venuesAdded++;
    }
  }
}

// Build scorigami matrix + summary for a set of matches. Shared between the
// men's and women's editions — each edition is its own scorigami universe.
function buildOutputs(sorted: Match[]) {
  const scorigamiMap = new Map<
    string,
    { count: number; firstMatch: Match; lastMatch: Match }
  >();

  for (const match of sorted) {
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

  const maxScore = Math.max(...sorted.map((m) => Math.max(m.homeScore, m.awayScore)));

  const summary = {
    totalMatches: sorted.length,
    uniqueScores: scorigami.length,
    maxScore,
    dateRange: {
      first: sorted[0].date,
      last: sorted[sorted.length - 1].date,
    },
  };

  return { scorigami, summary };
}

const { scorigami, summary } = buildOutputs(matches);

writeFileSync(join(dataDir, "matches.json"), JSON.stringify(matches, null, 2));
writeFileSync(join(dataDir, "scorigami.json"), JSON.stringify(scorigami, null, 2));
writeFileSync(join(dataDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log("Processed data:");
console.log(`  ${historicalMatches.length} matches from historical CSV`);
console.log(`  ${liveAdded} new match(es) from live-matches.json`);
console.log(`  ${overridesAdded} override(s) applied`);
console.log(`  ${venuesAdded} match(es) enriched with venue data`);
console.log(`  ${summary.totalMatches} matches total`);
console.log(`  ${summary.uniqueScores} unique score combinations`);
console.log(`  Max score in a match: ${summary.maxScore}`);
console.log(`  Date range: ${summary.dateRange.first} to ${summary.dateRange.last}`);

// ─── Women's edition ────────────────────────────────────────────────────────
// Separate scorigami universe: Women's World Cups 1991–2019 from the same CSV,
// plus the 2023 tournament backfilled from FIFA's API (data/womens-2023.json,
// written by scripts/backfill-womens-2023.ts). Live 2027 results will merge in
// the same way the men's live feed does today.
const womensHistorical: Match[] = allMatches.filter((m) =>
  m.tournament.includes("Women's World Cup"),
);

const womens2023Path = join(dataDir, "womens-2023.json");
const womens2023: Match[] = existsSync(womens2023Path)
  ? (JSON.parse(readFileSync(womens2023Path, "utf-8")) as { matches: Match[] }).matches
  : [];

const womensOverridesPath = join(dataDir, "womens-overrides.json");
let womensOverrides: Match[] = [];
if (existsSync(womensOverridesPath)) {
  const rawW = JSON.parse(readFileSync(womensOverridesPath, "utf-8")) as
    | Match[]
    | { matches: Match[] };
  womensOverrides = Array.isArray(rawW) ? rawW : rawW.matches;
}

const womensMerge = mergeMatches(womensHistorical, womens2023, womensOverrides);
const womensOut = buildOutputs(womensMerge.matches);

mkdirSync(join(dataDir, "womens"), { recursive: true });
writeFileSync(join(dataDir, "womens/matches.json"), JSON.stringify(womensMerge.matches, null, 2));
writeFileSync(join(dataDir, "womens/scorigami.json"), JSON.stringify(womensOut.scorigami, null, 2));
writeFileSync(join(dataDir, "womens/summary.json"), JSON.stringify(womensOut.summary, null, 2));

console.log("Women's edition:");
console.log(`  ${womensHistorical.length} matches from historical CSV (1991–2019)`);
console.log(`  ${womensMerge.liveAdded} match(es) from womens-2023.json`);
console.log(`  ${womensOut.summary.totalMatches} matches total`);
console.log(`  ${womensOut.summary.uniqueScores} unique score combinations`);
console.log(`  Max score in a match: ${womensOut.summary.maxScore}`);
console.log(`  Date range: ${womensOut.summary.dateRange.first} to ${womensOut.summary.dateRange.last}`);
