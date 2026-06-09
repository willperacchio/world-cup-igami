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
  tweets: { key: string; tweetId?: string; tweetText: string; timestamp: string }[];
}

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

async function postTweet(text: string): Promise<{ id: string } | null> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error("Missing Twitter API credentials — set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET");
    return null;
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
    return null;
  }

  const data = (await res.json()) as { data?: { id: string } };
  return data.data || null;
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
    // ISO 3166-1 alpha-3 codes used in the CSV (not FIFA TLA)
    HRV: "HR", BIH: "BA", SRB: "RS", MNE: "ME", SVN: "SI", SVK: "SK",
    CZE: "CZ", DEU: "DE", NLD: "NL", CHE: "CH", SWE: "SE", DNK: "DK",
    NOR: "NO", FIN: "FI", ISL: "IS", AUT: "AT", HUN: "HU", POL: "PL",
    ROU: "RO", BGR: "BG", UKR: "UA", RUS: "RU", PRT: "PT", GRC: "GR",
    TUR: "TR", SAU: "SA", ARE: "AE", IRN: "IR", IRQ: "IQ", JPN: "JP",
    KOR: "KR", PRK: "KP", CHN: "CN", ZAF: "ZA",
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

function composeScorigamiTweet(match: Match, entry: ScorigamiEntry, summary: Summary): string {
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
  ];

  return lines.join("\n");
}

function composeNonScorigamiTweet(match: Match, entry: ScorigamiEntry, allMatches: Match[], summary: Summary): string {
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

  if (prev && matchKey(prev) !== matchKey(first)) {
    const pf = flag(prev.homeCode);
    const pa = flag(prev.awayCode);
    const prevYear = prev.date.slice(0, 4);
    lines.push(`Previous: ${pf} ${prev.homeTeam} ${prev.homeScore}–${prev.awayScore} ${prev.awayTeam} ${pa} (${prevYear})`);
  }

  lines.push(``, `${SITE_URL}`);

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

    const tweetText = isScorigami
      ? composeScorigamiTweet(match, entry, summary)
      : composeNonScorigamiTweet(match, entry, matches, summary);

    console.log(`${"─".repeat(60)}`);
    console.log(isScorigami ? "🚨 SCORIGAMI" : "📋 Regular");
    console.log(`${match.homeTeam} ${match.homeScore}–${match.awayScore} ${match.awayTeam}`);
    console.log(`${"─".repeat(60)}`);
    console.log(tweetText);
    console.log();

    if (dryRun) {
      console.log("  [DRY RUN — not posting]\n");
      tweeted.tweets.push({
        key: matchKey(match),
        tweetText,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const result = await postTweet(tweetText);
    if (result) {
      console.log(`  ✓ Posted! Tweet ID: ${result.id}\n`);
      tweeted.tweets.push({
        key: matchKey(match),
        tweetId: result.id,
        tweetText,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(`  ✗ Failed to post tweet for ${matchKey(match)}\n`);
    }
  }

  // Save tweeted log
  writeFileSync(TWEETED_PATH, JSON.stringify(tweeted, null, 2) + "\n");
  console.log(`Updated ${TWEETED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
