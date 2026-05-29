/**
 * Build match-links.json — a mapping from each match to its direct
 * Wikipedia article URL and FIFA match centre URL (when available).
 *
 * Run via: `npx tsx scripts/build-links.ts`
 *
 * Strategy:
 * 1. Read data/matches.json to get every match and determine which
 *    tournament years are present.
 * 2. For each year, fetch the raw wikitext of relevant Wikipedia
 *    articles (knockout stage, final, group pages, etc.).
 * 3. Extract FIFA match centre URLs from the wikitext and match them
 *    to our matches using surrounding team-name context.
 * 4. Write data/match-links.json with direct Wikipedia article links
 *    and FIFA URLs keyed by "date|homeTeam|awayTeam".
 *
 * The script is idempotent — running it again overwrites the output.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface MatchLink {
  wikipedia: string;
  fifa?: string;
}

interface FifaCandidate {
  url: string;
  context: string; // surrounding text from wikitext
  source: string; // which wikipedia page it came from
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = join(dirname(import.meta.url.replace("file://", "")), "..");
const MATCHES_PATH = join(ROOT, "data", "matches.json");
const OUTPUT_PATH = join(ROOT, "data", "match-links.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKIPEDIA_RAW = "https://en.wikipedia.org/w/index.php";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/wiki";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYear(match: Match): string {
  return match.tournament.replace(" FIFA Men's World Cup", "").trim();
}

function matchKey(match: Match): string {
  return `${match.date}|${match.homeTeam}|${match.awayTeam}`;
}

/**
 * Fetch the raw wikitext for a Wikipedia article. Returns null on 404
 * or other errors.
 */
async function fetchWikitext(article: string): Promise<string | null> {
  const url = `${WIKIPEDIA_RAW}?title=${encodeURIComponent(article)}&action=raw`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`  [404] ${article}`);
      } else {
        console.log(`  [${res.status}] ${article}`);
      }
      return null;
    }
    console.log(`  [200] ${article}`);
    return await res.text();
  } catch (err) {
    console.log(`  [ERR] ${article}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Extract FIFA match centre URLs and their surrounding context from
 * raw wikitext. We grab ~300 chars around each URL to help with
 * matching to our matches.
 */
function extractFifaCandidates(
  wikitext: string,
  source: string,
): FifaCandidate[] {
  const candidates: FifaCandidate[] = [];
  // Match FIFA match centre URLs — various path patterns
  const regex = /https?:\/\/www\.fifa\.com\/[^\s\]|}<>)]+match-centre[^\s\]|}<>)]*/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(wikitext)) !== null) {
    const start = Math.max(0, m.index - 300);
    const end = Math.min(wikitext.length, m.index + m[0].length + 300);
    const context = wikitext.slice(start, end);
    candidates.push({ url: m[0], context, source });
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Team name normalization & matching
// ---------------------------------------------------------------------------

/**
 * Common name mappings from Wikipedia's wikitext names to our data's
 * team names. Wikipedia uses short common names; our data may use
 * either common or formal names.
 */
const TEAM_ALIASES: Record<string, string[]> = {
  "United States": ["USA", "United States", "US", "U.S."],
  "South Korea": ["Korea Republic", "South Korea", "Korea", "Korea Rep."],
  "North Korea": [
    "Korea DPR",
    "North Korea",
    "DPR Korea",
    "Korea, DPR",
    "Korea (North)",
  ],
  Yugoslavia: ["Yugoslavia", "SFR Yugoslavia"],
  "Soviet Union": ["Soviet Union", "USSR"],
  "Czech Republic": ["Czech Republic", "Czechia"],
  Czechoslovakia: ["Czechoslovakia"],
  "West Germany": ["West Germany", "Germany FR", "FR Germany"],
  "East Germany": ["East Germany", "Germany DR", "DR Germany"],
  Germany: ["Germany"],
  China: ["China PR", "China"],
  "Côte d'Ivoire": ["Côte d'Ivoire", "Ivory Coast", "Cote d'Ivoire"],
  "Dutch East Indies": ["Dutch East Indies"],
  "Trinidad and Tobago": ["Trinidad and Tobago", "Trinidad & Tobago"],
  "Bosnia and Herzegovina": [
    "Bosnia and Herzegovina",
    "Bosnia & Herzegovina",
    "Bosnia-Herzegovina",
  ],
  "Serbia and Montenegro": ["Serbia and Montenegro", "Serbia & Montenegro"],
  Zaire: ["Zaire"],
  "FR Yugoslavia": ["FR Yugoslavia"],
};

/** Build a lookup: alias → canonical name in our data. */
function buildAliasLookup(matches: Match[]): Map<string, string> {
  const allTeams = new Set<string>();
  for (const m of matches) {
    allTeams.add(m.homeTeam);
    allTeams.add(m.awayTeam);
  }

  const lookup = new Map<string, string>();
  // Identity mapping
  for (const t of allTeams) {
    lookup.set(t.toLowerCase(), t);
  }
  // Alias mapping
  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    if (allTeams.has(canonical)) {
      for (const alias of aliases) {
        lookup.set(alias.toLowerCase(), canonical);
      }
    }
  }
  // Also map country codes
  for (const m of matches) {
    lookup.set(m.homeCode.toLowerCase(), m.homeTeam);
    lookup.set(m.awayCode.toLowerCase(), m.awayTeam);
  }

  return lookup;
}

/**
 * Check if a context string mentions a team name. We do a
 * case-insensitive search for the team name and its known aliases.
 */
function contextMentionsTeam(
  context: string,
  teamName: string,
  aliasLookup: Map<string, string>,
): boolean {
  const lower = context.toLowerCase();

  // Direct match
  if (lower.includes(teamName.toLowerCase())) return true;

  // Check aliases that map to this team
  for (const [alias, canonical] of aliasLookup) {
    if (canonical === teamName && alias.length >= 3 && lower.includes(alias)) {
      return true;
    }
  }

  return false;
}

/**
 * Try to match a FIFA candidate URL to one of our matches based on
 * surrounding wikitext context.
 */
function matchCandidateToMatch(
  candidate: FifaCandidate,
  yearMatches: Match[],
  aliasLookup: Map<string, string>,
): Match | null {
  // Try to find a match where both team names appear in the context
  const bestMatches: Match[] = [];

  for (const m of yearMatches) {
    const homeMentioned = contextMentionsTeam(
      candidate.context,
      m.homeTeam,
      aliasLookup,
    );
    const awayMentioned = contextMentionsTeam(
      candidate.context,
      m.awayTeam,
      aliasLookup,
    );

    if (homeMentioned && awayMentioned) {
      bestMatches.push(m);
    }
  }

  // If exactly one match, we're confident
  if (bestMatches.length === 1) return bestMatches[0];

  // If multiple matches (e.g., same teams played twice), try to
  // disambiguate by score in the context
  if (bestMatches.length > 1) {
    for (const m of bestMatches) {
      // Look for the score pattern in context (e.g., "3–1" or "3-1")
      const scorePattern = new RegExp(
        `${m.homeScore}\\s*[–\\-—]\\s*${m.awayScore}`,
      );
      if (scorePattern.test(candidate.context)) {
        return m;
      }
    }
    // If still ambiguous, return the first one
    return bestMatches[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Wikipedia article URL mapping per stage
// ---------------------------------------------------------------------------

function getWikipediaArticle(match: Match): string {
  const year = getYear(match);
  const prefix = `${year}_FIFA_World_Cup`;

  switch (match.stage) {
    case "final":
      return `${prefix}_final`;
    case "third-place match":
    case "semi-finals":
    case "quarter-finals":
    case "round of 16":
      return `${prefix}_knockout_stage`;
    case "final round":
      return `${prefix}_final_round`;
    case "group stage":
    case "second group stage":
      // We don't know which group, so link to the main tournament page
      return prefix;
    default:
      return prefix;
  }
}

function getWikipediaUrl(match: Match): string {
  return `${WIKIPEDIA_BASE}/${getWikipediaArticle(match)}`;
}

// ---------------------------------------------------------------------------
// Determine which Wikipedia pages to fetch per tournament year
// ---------------------------------------------------------------------------

function getPagesToPull(year: string, stages: Set<string>): string[] {
  const prefix = `${year}_FIFA_World_Cup`;
  const pages: string[] = [];

  // Always fetch the main tournament page
  pages.push(prefix);

  // Final article
  pages.push(`${prefix}_final`);

  // Knockout stage
  if (
    stages.has("quarter-finals") ||
    stages.has("semi-finals") ||
    stages.has("round of 16") ||
    stages.has("third-place match")
  ) {
    pages.push(`${prefix}_knockout_stage`);
  }

  // Group pages — try both letter and number naming conventions
  if (stages.has("group stage")) {
    // Modern naming: Group A through H
    for (const letter of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      pages.push(`${prefix}_Group_${letter}`);
    }
    // Older naming: Group 1 through 4
    for (const num of [1, 2, 3, 4]) {
      pages.push(`${prefix}_Group_${num}`);
    }
  }

  // Final round (1950)
  if (stages.has("final round")) {
    pages.push(`${prefix}_final_round`);
  }

  // Second group stage (1974, 1978, 1982) — try various article names
  if (stages.has("second group stage")) {
    pages.push(`${prefix}_second_round`);
    pages.push(`${prefix}_Second_group_stage`);
    // Also try group pages for second round (some years have separate articles)
    for (const letter of ["A", "B"]) {
      pages.push(`${prefix}_Second_round_Group_${letter}`);
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Reading matches.json...");
  const matches: Match[] = JSON.parse(readFileSync(MATCHES_PATH, "utf-8"));
  console.log(`Loaded ${matches.length} matches\n`);

  // Group matches by tournament year
  const byYear = new Map<string, Match[]>();
  for (const m of matches) {
    const year = getYear(m);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(m);
  }

  // Build alias lookup for team name matching
  const aliasLookup = buildAliasLookup(matches);

  // Result map — start from existing data if available
  let result: Record<string, MatchLink> = {};
  try {
    const existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    if (typeof existing === "object" && existing !== null) {
      result = existing;
      console.log(`Loaded ${Object.keys(result).length} existing entries from match-links.json`);
    }
  } catch {
    // No existing file, start fresh
  }

  // Pre-populate every match with its direct Wikipedia article URL
  // (only if not already set)
  for (const m of matches) {
    const key = matchKey(m);
    if (!result[key]) {
      result[key] = { wikipedia: getWikipediaUrl(m) };
    } else if (!result[key].wikipedia) {
      result[key].wikipedia = getWikipediaUrl(m);
    }
  }

  // Now fetch wikitext and extract FIFA URLs per year
  const years = [...byYear.keys()].sort();

  for (const year of years) {
    const yearMatches = byYear.get(year)!;

    // Skip year if all matches already have FIFA links
    const missingFifa = yearMatches.filter((m) => !result[matchKey(m)]?.fifa);
    if (missingFifa.length === 0) {
      console.log(`\n=== ${year} — all ${yearMatches.length} matches already have FIFA links, skipping ===`);
      continue;
    }

    const stages = new Set(yearMatches.map((m) => m.stage));
    const pages = getPagesToPull(year, stages);

    console.log(
      `\n=== ${year} (${yearMatches.length} matches, ${missingFifa.length} missing FIFA links, ${pages.length} pages to fetch) ===`,
    );

    const allCandidates: FifaCandidate[] = [];

    for (const page of pages) {
      const wikitext = await fetchWikitext(page);
      if (wikitext) {
        const candidates = extractFifaCandidates(wikitext, page);
        allCandidates.push(...candidates);
      }
      // Be nice to Wikipedia — use longer delays to avoid 429s
      await sleep(1500);
    }

    console.log(`  Found ${allCandidates.length} FIFA URLs in wikitext`);

    // Deduplicate FIFA URLs
    const seenUrls = new Set<string>();
    const uniqueCandidates = allCandidates.filter((c) => {
      if (seenUrls.has(c.url)) return false;
      seenUrls.add(c.url);
      return true;
    });

    // Match FIFA URLs to our matches
    let matched = 0;
    for (const candidate of uniqueCandidates) {
      const match = matchCandidateToMatch(
        candidate,
        yearMatches,
        aliasLookup,
      );
      if (match) {
        const key = matchKey(match);
        if (result[key]) {
          result[key].fifa = candidate.url;
          matched++;
        }
      }
    }

    console.log(
      `  Matched ${matched}/${uniqueCandidates.length} FIFA URLs to matches`,
    );
  }

  // Write output
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n");

  // Summary
  const total = Object.keys(result).length;
  const withFifa = Object.values(result).filter((v) => v.fifa).length;
  console.log(`\nDone! Wrote ${OUTPUT_PATH}`);
  console.log(`  ${total} matches total`);
  console.log(`  ${withFifa} with FIFA match centre URLs`);
  console.log(`  ${total - withFifa} with Wikipedia-only links`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
