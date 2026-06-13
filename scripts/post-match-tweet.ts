/**
 * Post a tweet after each finished World Cup match in classic scorigami style.
 *
 * SCORIGAMI tweets are loud and historic:
 *   "SCORIGAMI!!! France 4-1 Australia — this scoreline has NEVER happened
 *    in 94 years of World Cup history! It's the 34th unique score across 965
 *    matches. worldcupigami.com"
 *
 * Non-scorigami tweets are calmer but contextual:
 *   "France 2-1 Australia — this is the 153rd 2-1 in World Cup history.
 *    First: ARG 2-1 MEX (1930). worldcupigami.com"
 *
 * Run via:  npx tsx scripts/post-match-tweet.ts
 *
 * Requires environment variables:
 *   TWITTER_API_KEY          – OAuth 1.0a consumer key
 *   TWITTER_API_SECRET       – OAuth 1.0a consumer secret
 *   TWITTER_ACCESS_TOKEN     – OAuth 1.0a access token
 *   TWITTER_ACCESS_SECRET    – OAuth 1.0a access token secret
 *
 * Optional:
 *   SITE_URL                 – defaults to "worldcupigami.com"
 *   DRY_RUN=true             – compose tweets but don't post them
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

// ─── load .env ──────────────────────────────────────────────────────────────
const envPath = join(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── paths ──────────────────────────────────────────────────────────────────
const DATA_DIR = join(__dirname, "../data");
const MATCHES_PATH = join(DATA_DIR, "matches.json");
const SCORIGAMI_PATH = join(DATA_DIR, "scorigami.json");
const SUMMARY_PATH = join(DATA_DIR, "summary.json");
const TWEETED_PATH = join(DATA_DIR, "tweeted-matches.json");

// ─── types ──────────────────────────────────────────────────────────────────
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

interface ScorigamiEntry {
  lowScore: number;
  highScore: number;
  count: number;
  firstMatch: Match;
  lastMatch: Match;
}

interface Summary {
  totalMatches: number;
  uniqueScores: number;
  maxScore: number;
  dateRange: { first: string; last: string };
}

interface TweetedLog {
  tweets: { key: string; tweetId?: string; tweetText: string; timestamp: string; failed?: boolean }[];
}

type PostResult =
  | { ok: true; id: string }
  | { ok: false; permanent: boolean; detail: string };

// ─── Twitter OAuth 1.0a ─────────────────────────────────────────────────────
// Minimal implementation — no external dependencies needed.

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join("&");
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

async function postTweet(text: string): Promise<PostResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error("Missing Twitter API credentials — set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET");
    // Credentials problem: transient so matches tweet once secrets are fixed.
    return { ok: false, permanent: false, detail: "missing credentials" };
  }

  const url = "https://api.x.com/2/tweets";
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signature = buildOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Twitter API error: ${res.status} ${res.statusText}\n${body}`);
    // Classify so the caller can avoid retrying forever on errors that will
    // never succeed. Retrying is only useful for rate limits (429), server
    // errors (5xx), and auth problems the user can fix (401/403 permissions).
    const lower = body.toLowerCase();
    const isDuplicate = res.status === 403 && lower.includes("duplicate");
    const isValidation = res.status === 400; // malformed/too-long text
    return {
      ok: false,
      permanent: isDuplicate || isValidation,
      detail: `${res.status}: ${body.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as { data?: { id: string } };
  if (!data.data) {
    return { ok: false, permanent: false, detail: "no tweet id in response" };
  }
  return { ok: true, id: data.data.id };
}

// ─── tweet composition ──────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || "world-cup-igami.vercel.app";

/** Flag emoji lookup by country code */
function flag(code: string): string {
  if (!code || code.length !== 3) return "";
  // Map 3-letter to 2-letter ISO for regional indicator symbols
  const tlaToIso2: Record<string, string> = {
    AFG: "AF", ALB: "AL", ALG: "DZ", AND: "AD", ANG: "AO", ANT: "AG",
    ARG: "AR", ARM: "AM", AUS: "AU", AUT: "AT", AZE: "AZ", BAH: "BS",
    BHR: "BH", BAN: "BD", BRB: "BB", BLR: "BY", BEL: "BE", BLZ: "BZ",
    BEN: "BJ", BER: "BM", BHU: "BT", BOL: "BO", BIH: "BA", BOT: "BW",
    BRA: "BR", BRU: "BN", BUL: "BG", BFA: "BF", BDI: "BI", CAM: "KH",
    CMR: "CM", CAN: "CA", CPV: "CV", CAY: "KY", CTA: "CF", CHA: "TD",
    CHI: "CL", CHN: "CN", COL: "CO", COM: "KM", CGO: "CG", COD: "CD",
    COK: "CK", CRC: "CR", CIV: "CI", CRO: "HR", CUB: "CU", CYP: "CY",
    CZE: "CZ", DEN: "DK", DJI: "DJ", DMA: "DM", DOM: "DO", ECU: "EC",
    EGY: "EG", SLV: "SV", EQG: "GQ", ERI: "ER", EST: "EE", SWZ: "SZ",
    ETH: "ET", FIJ: "FJ", FIN: "FI", FRA: "FR", GAB: "GA", GAM: "GM",
    GEO: "GE", GER: "DE", GHA: "GH", GRE: "GR", GRN: "GD", GUA: "GT",
    GUI: "GN", GNB: "GW", GUY: "GY", HAI: "HT", HON: "HN", HKG: "HK",
    HUN: "HU", ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ",
    IRL: "IE", ISR: "IL", ITA: "IT", JAM: "JM", JPN: "JP", JOR: "JO",
    KAZ: "KZ", KEN: "KE", KUW: "KW", KGZ: "KG", LAO: "LA", LVA: "LV",
    LBN: "LB", LES: "LS", LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT",
    LUX: "LU", MAC: "MO", MAD: "MG", MWI: "MW", MAS: "MY", MDV: "MV",
    MLI: "ML", MLT: "MT", MTN: "MR", MRI: "MU", MEX: "MX", MDA: "MD",
    MNG: "MN", MNE: "ME", MAR: "MA", MOZ: "MZ", MYA: "MM", NAM: "NA",
    NEP: "NP", NED: "NL", NCL: "NC", NZL: "NZ", NCA: "NI", NIG: "NE",
    NGA: "NG", PRK: "KP", MKD: "MK", NOR: "NO", OMA: "OM", PAK: "PK",
    PLE: "PS", PAN: "PA", PNG: "PG", PAR: "PY", PER: "PE", PHI: "PH",
    POL: "PL", POR: "PT", QAT: "QA", ROU: "RO", RUS: "RU", RWA: "RW",
    SKN: "KN", LCA: "LC", VIN: "VC", SAM: "WS", SMR: "SM", STP: "ST",
    KSA: "SA", SEN: "SN", SRB: "RS", SEY: "SC", SLE: "SL", SGP: "SG",
    SVK: "SK", SVN: "SI", SOL: "SB", SOM: "SO", RSA: "ZA", KOR: "KR",
    SSD: "SS", ESP: "ES", SRI: "LK", SDN: "SD", SUR: "SR", SWE: "SE",
    SUI: "CH", SYR: "SY", TPE: "TW", TJK: "TJ", TAN: "TZ", THA: "TH",
    TLS: "TL", TOG: "TG", TGA: "TO", TRI: "TT", TUN: "TN", TUR: "TR",
    TKM: "TM", UGA: "UG", UKR: "UA", UAE: "AE", GBR: "GB", USA: "US",
    URU: "UY", UZB: "UZ", VAN: "VU", VEN: "VE", VIE: "VN", YEM: "YE",
    ZAM: "ZM", ZIM: "ZW", ENG: "GB", SCO: "GB", WAL: "GB", NIR: "GB",
    CUR: "CW", BOE: "BQ",
    // ISO 3166-1 alpha-3 codes — match data stores these (not FIFA TLAs) after
    // ingestion, so every FIFA code above that differs needs its ISO twin here.
    HRV: "HR", DEU: "DE", NLD: "NL", BGR: "BG", PRT: "PT", GRC: "GR",
    DNK: "DK", CHE: "CH", ZAF: "ZA", TTO: "TT", CRI: "CR", HND: "HN",
    PRY: "PY", URY: "UY", DZA: "DZ", AGO: "AO", KWT: "KW", HTI: "HT",
    CHL: "CL", ZMB: "ZM", SAU: "SA", TGO: "TG",
    // Defunct nations — use successor or historical flag
    YUG: "RS", TCH: "CZ", URS: "RU", FRG: "DE", GDR: "DE", SCG: "RS",
    ZAI: "CD", DEI: "ID",
  };
  const iso2 = tlaToIso2[code.toUpperCase()];
  if (!iso2) return "";
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function matchKey(m: Match): string {
  return `${m.date}|${m.homeTeam}|${m.awayTeam}`;
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    "group stage": "Group Stage",
    "round of 32": "Round of 32",
    "round of 16": "Round of 16",
    "quarter-finals": "Quarterfinal",
    "semi-finals": "Semifinal",
    "third-place match": "3rd Place Match",
    final: "Final",
  };
  return labels[stage] || stage;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function yearsSinceFirst(): number {
  return new Date().getFullYear() - 1930;
}

/**
 * FIFA's official match hashtags use FIFA 3-letter codes (e.g. #MEXRSA), but
 * our match data stores ISO alpha-3 (ZAF) after ingestion. Map the codes that
 * differ back to FIFA's so the hashtag matches what fans actually follow.
 * Inverse of FIFA_TLA_TO_ISO3 in scripts/lib/fd-mapper.ts.
 */
const ISO3_TO_FIFA: Record<string, string> = {
  DZA: "ALG", AGO: "ANG", BGR: "BUL", CHL: "CHI", CRI: "CRC", HRV: "CRO",
  DNK: "DEN", DEU: "GER", GRC: "GRE", HTI: "HAI", HND: "HON", SAU: "KSA",
  KWT: "KUW", NLD: "NED", PRY: "PAR", PRT: "POR", ZAF: "RSA", CHE: "SUI",
  TGO: "TOG", TTO: "TRI", URY: "URU", ZMB: "ZAM",
};

function fifaCode(code: string): string {
  const c = code.toUpperCase();
  return ISO3_TO_FIFA[c] || c;
}

/**
 * Per-team supporter hashtags — the tags each fanbase actually follows, so a
 * tweet surfaces in their feed (e.g. #USMNT for the US). Keyed by ISO alpha-3
 * (the codes our match data stores). Only well-established tags are included;
 * teams without an entry simply get no team tag. Add more here as needed.
 */
const TEAM_HASHTAGS: Record<string, string> = {
  USA: "#USMNT", CAN: "#CanMNT", MEX: "#ElTri",
  ENG: "#ThreeLions", FRA: "#LesBleus", ESP: "#LaRoja",
  NLD: "#Oranje", HRV: "#Vatreni", CHE: "#Nati",
  BEL: "#RedDevils", ITA: "#Azzurri", DEU: "#DieMannschaft",
  PRT: "#VamosPortugal", AUS: "#Socceroos", JPN: "#SamuraiBlue",
  BRA: "#SeleçãoBrasileira", ARG: "#VamosArgentina", URY: "#LaCeleste",
  NGA: "#SuperEagles", GHA: "#BlackStars", CIV: "#LesElephants",
  CMR: "#LionsIndomptables", MAR: "#AtlasLions", SEN: "#LionsDeLaTeranga",
  IRN: "#TeamMelli", SCO: "#TartanArmy", WAL: "#Cymru",
};

/**
 * Fallback team tag for teams without a known supporter hashtag: the country
 * name as a clean CamelCase tag (e.g. "South Africa" -> #SouthAfrica). Strips
 * accents, apostrophes, spaces, and hyphens.
 */
function countryHashtag(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-zA-Z0-9 -]/g, "") // drop apostrophes etc.
    .split(/[ -]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return `#${cleaned}`;
}

/**
 * Discovery hashtags appended to every tweet: the evergreen tournament tag,
 * FIFA's per-match tag (home+away FIFA codes, e.g. #MEXRSA), and each team's
 * supporter tag — the known one if we have it, otherwise #CountryName.
 */
function matchHashtags(match: Match): string {
  const teamTag = (code: string, name: string) =>
    TEAM_HASHTAGS[code.toUpperCase()] || countryHashtag(name);
  return [
    `#FIFAWorldCup`,
    `#${fifaCode(match.homeCode)}${fifaCode(match.awayCode)}`,
    teamTag(match.homeCode, match.homeTeam),
    teamTag(match.awayCode, match.awayTeam),
  ].join(" ");
}

/**
 * Approximate X's weighted tweet length. Counts astral-plane characters
 * (emoji, flags) as 2 and everything else as 1. Slightly overestimates flag
 * emoji (4 vs X's 2) and the trailing URL (raw length vs t.co's 23), which is
 * the safe direction — we'd rather shorten unnecessarily than get a tweet
 * rejected.
 */
function approxTweetLength(text: string): number {
  let len = 0;
  for (const ch of text) {
    len += ch.codePointAt(0)! > 0xffff ? 2 : 1;
  }
  return len;
}

// The bot account has X Premium (25,000-char limit), so the full rich format
// always fits and the compact fallback below effectively never triggers — it's
// kept only as a safety net. Drop this to 280 if the account ever loses Premium.
const TWEET_LIMIT = 25000;

function composeScorigamiTweet(match: Match, entry: ScorigamiEntry, summary: Summary, compact = false): string {
  const hf = flag(match.homeCode);
  const af = flag(match.awayCode);
  const score = `${match.homeScore}–${match.awayScore}`;
  const stage = stageLabel(match.stage);
  const years = yearsSinceFirst();
  const totalGoals = match.homeScore + match.awayScore;

  let extra = "";
  if (match.extraTime && !match.penaltyShootout) extra = " (aet)";
  if (match.penaltyShootout) extra = ` (${match.penaltyScore} pens)`;

  const uniqueNum = ordinal(summary.uniqueScores);

  // Pick a hype opener — rotate based on score sum for variety
  const openers = [
    `\u{1F6A8}\u{1F6A8}\u{1F6A8} SCORIGAMI!!! \u{1F6A8}\u{1F6A8}\u{1F6A8}`,
    `\u{26BD}\u{1F525} SCORIGAMI!!! \u{1F525}\u{26BD}`,
    `\u{1F3C6} S C O R I G A M I \u{1F3C6}`,
    `\u{1F4A5} SCORIGAMI ALERT \u{1F4A5}`,
  ];
  const opener = openers[totalGoals % openers.length];

  // Pick a hype closer
  const closers = [
    `HISTORY. MADE.`,
    `THE BEAUTIFUL GAME JUST GOT MORE BEAUTIFUL.`,
    `ADD IT TO THE BOARD.`,
    `NEVER BEFORE. NEVER FORGOTTEN.`,
  ];
  const closer = closers[(match.homeScore + match.awayScore * 3) % closers.length];

  // Compact variant for long team names: drop the closer and the unique-score
  // line, which are flavor rather than substance.
  if (compact) {
    return [
      opener,
      ``,
      `${hf} ${match.homeTeam} ${score} ${match.awayTeam} ${af}${extra}`,
      `${stage}`,
      ``,
      `THIS SCORELINE HAS NEVER HAPPENED IN ${years} YEARS AND ${summary.totalMatches.toLocaleString()} MATCHES OF WORLD CUP HISTORY.`,
      ``,
      `${SITE_URL}`,
      ``,
      matchHashtags(match),
    ].join("\n");
  }

  const lines = [
    opener,
    ``,
    `${hf} ${match.homeTeam} ${score} ${match.awayTeam} ${af}${extra}`,
    `${stage}`,
    ``,
    `THIS SCORELINE HAS NEVER HAPPENED IN ${years} YEARS AND ${summary.totalMatches.toLocaleString()} MATCHES OF WORLD CUP HISTORY.`,
    ``,
    `${closer}`,
    ``,
    `${uniqueNum} unique score. Only in the World Cup.`,
    `${SITE_URL}`,
    ``,
    matchHashtags(match),
  ];

  return lines.join("\n");
}

function composeNonScorigamiTweet(match: Match, entry: ScorigamiEntry, allMatches: Match[], summary: Summary, compact = false): string {
  const hf = flag(match.homeCode);
  const af = flag(match.awayCode);
  const score = `${match.homeScore}–${match.awayScore}`;
  const stage = stageLabel(match.stage);

  let extra = "";
  if (match.extraTime && !match.penaltyShootout) extra = " (aet)";
  if (match.penaltyShootout) extra = ` (${match.penaltyScore} pens)`;

  const first = entry.firstMatch;
  const firstYear = first.date.slice(0, 4);
  const ff = flag(first.homeCode);
  const fa = flag(first.awayCode);

  // Find the most recent PREVIOUS match with this score (not the current match)
  const low = Math.min(match.homeScore, match.awayScore);
  const high = Math.max(match.homeScore, match.awayScore);
  const prevMatches = allMatches.filter((m) => {
    if (matchKey(m) === matchKey(match)) return false;
    const mLow = Math.min(m.homeScore, m.awayScore);
    const mHigh = Math.max(m.homeScore, m.awayScore);
    return mLow === low && mHigh === high;
  });
  const prev = prevMatches.length > 0 ? prevMatches[prevMatches.length - 1] : null;

  const times = ordinal(entry.count);

  const lines = [
    `${hf} ${match.homeTeam} ${score} ${match.awayTeam} ${af}${extra}`,
    `${stage}`,
    ``,
    `Not a scorigami. This is the ${times} time this score has happened in World Cup history.`,
    ``,
    `First: ${ff} ${first.homeTeam} ${first.homeScore}–${first.awayScore} ${first.awayTeam} ${fa} (${firstYear})`,
  ];

  // Compact variant: the Previous line is the first thing to go when long
  // team names push the tweet over the limit.
  if (!compact && prev && matchKey(prev) !== matchKey(first)) {
    const pf = flag(prev.homeCode);
    const pa = flag(prev.awayCode);
    const prevYear = prev.date.slice(0, 4);
    lines.push(`Previous: ${pf} ${prev.homeTeam} ${prev.homeScore}–${prev.awayScore} ${prev.awayTeam} ${pa} (${prevYear})`);
  }

  lines.push(``, `${SITE_URL}`, ``, matchHashtags(match));

  return lines.join("\n");
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.env.DRY_RUN === "true";

  // Load current data (should be rebuilt by process-data.ts before this runs)
  const matches: Match[] = JSON.parse(readFileSync(MATCHES_PATH, "utf-8"));
  const scorigami: ScorigamiEntry[] = JSON.parse(readFileSync(SCORIGAMI_PATH, "utf-8"));
  const summary: Summary = JSON.parse(readFileSync(SUMMARY_PATH, "utf-8"));

  // Load tweeted log
  let tweeted: TweetedLog = { tweets: [] };
  if (existsSync(TWEETED_PATH)) {
    tweeted = JSON.parse(readFileSync(TWEETED_PATH, "utf-8"));
  }
  const tweetedKeys = new Set(tweeted.tweets.map((t) => t.key));

  // Build scorigami lookup: "low-high" -> entry
  const scorigamiMap = new Map<string, ScorigamiEntry>();
  for (const entry of scorigami) {
    scorigamiMap.set(`${entry.lowScore}-${entry.highScore}`, entry);
  }

  // Find 2026 matches that haven't been tweeted yet
  const newMatches = matches.filter((m) => {
    if (!m.tournament.includes("2026")) return false;
    return !tweetedKeys.has(matchKey(m));
  });

  if (newMatches.length === 0) {
    console.log("No new 2026 matches to tweet.");
    return;
  }

  console.log(`Found ${newMatches.length} new match(es) to tweet:\n`);

  for (const match of newMatches) {
    const low = Math.min(match.homeScore, match.awayScore);
    const high = Math.max(match.homeScore, match.awayScore);
    const scoreKey = `${low}-${high}`;
    const entry = scorigamiMap.get(scoreKey);

    if (!entry) {
      console.warn(`  No scorigami entry for ${scoreKey} — skipping ${matchKey(match)}`);
      continue;
    }

    // Is this the FIRST match with this score? (i.e. is this match the firstMatch in the entry?)
    const isScorigami =
      entry.firstMatch.date === match.date &&
      entry.firstMatch.homeTeam === match.homeTeam &&
      entry.firstMatch.awayTeam === match.awayTeam;

    let tweetText = isScorigami
      ? composeScorigamiTweet(match, entry, summary)
      : composeNonScorigamiTweet(match, entry, matches, summary);

    // Long team names (e.g. Bosnia and Herzegovina) can push the full format
    // past 280 weighted characters, which Twitter rejects outright.
    if (approxTweetLength(tweetText) > TWEET_LIMIT) {
      tweetText = isScorigami
        ? composeScorigamiTweet(match, entry, summary, true)
        : composeNonScorigamiTweet(match, entry, matches, summary, true);
      console.log(`  (using compact format — full format was over ${TWEET_LIMIT} chars)`);
    }

    console.log(`${"─".repeat(60)}`);
    console.log(isScorigami ? "🚨 SCORIGAMI" : "📋 Regular");
    console.log(`${match.homeTeam} ${match.homeScore}–${match.awayScore} ${match.awayTeam}`);
    console.log(`${"─".repeat(60)}`);
    console.log(tweetText);
    console.log();

    const saveLog = () =>
      writeFileSync(TWEETED_PATH, JSON.stringify(tweeted, null, 2) + "\n");

    if (dryRun) {
      console.log("  [DRY RUN — not posting]\n");
      tweeted.tweets.push({
        key: matchKey(match),
        tweetText,
        timestamp: new Date().toISOString(),
      });
      saveLog();
      continue;
    }

    const result = await postTweet(tweetText);
    if (result.ok) {
      console.log(`  ✓ Posted! Tweet ID: ${result.id}\n`);
      tweeted.tweets.push({
        key: matchKey(match),
        tweetId: result.id,
        tweetText,
        timestamp: new Date().toISOString(),
      });
      // Save immediately so a crash later in the loop can't lose this record
      // and cause a duplicate tweet on the next run.
      saveLog();
    } else if (result.permanent) {
      // Posting this exact tweet will never succeed (duplicate content,
      // validation error). Record it as handled so the script doesn't retry
      // it every 10 minutes for the rest of the tournament.
      console.error(`  ✗ Permanent failure for ${matchKey(match)} — marking as handled (${result.detail})\n`);
      tweeted.tweets.push({
        key: matchKey(match),
        tweetText,
        timestamp: new Date().toISOString(),
        failed: true,
      });
      saveLog();
    } else {
      // Transient (rate limit, 5xx, network, bad credentials) — leave it
      // unrecorded so the next run retries.
      console.error(`  ✗ Transient failure for ${matchKey(match)} — will retry next run (${result.detail})\n`);
    }
  }

  console.log(`Done. Log at ${TWEETED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
