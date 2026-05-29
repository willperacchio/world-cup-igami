/**
 * Fetch finished matches from football-data.org for the FIFA World Cup
 * and write them to data/live-matches.json in our internal Match shape.
 *
 * Run via: `npx tsx scripts/fetch-live-matches.ts`
 *
 * Reads FOOTBALL_ORG_AUTH_TOKEN from the environment. If unset, exits
 * cleanly with a warning (so the cron is a no-op until the secret is set).
 *
 * The free tier of football-data.org limits requests to 10/min and covers
 * the FIFA World Cup competition (code "WC"). Running on a 15-min cron stays
 * comfortably within the cap.
 *
 * Data source attribution: football-data.org provides live match data
 * under their Terms (https://www.football-data.org/terms). We credit them
 * in data/DATA_ATTRIBUTION.md and in the site footer.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { mapMatch, type FdMatch, type InternalMatch } from "./lib/fd-mapper";

interface FdResponse {
  matches: FdMatch[];
  resultSet?: { count: number; competitions?: string };
}

async function main() {
  const token = process.env.FOOTBALL_ORG_AUTH_TOKEN;
  if (!token) {
    console.warn(
      "FOOTBALL_ORG_AUTH_TOKEN not set — skipping live data fetch (no-op).",
    );
    return;
  }

  if (process.env.DATA_FREEZE === "true") {
    console.warn("DATA_FREEZE=true — skipping fetch (kill switch active).");
    return;
  }

  // Pull all matches for the World Cup competition; we'll filter to FINISHED
  // client-side so we keep one canonical request shape regardless of status.
  const url = "https://api.football-data.org/v4/competitions/WC/matches";
  const res = await fetch(url, {
    headers: { "X-Auth-Token": token },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new Error(
      `football-data.org request failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  const data = (await res.json()) as FdResponse;
  const finished = data.matches.filter((m) => m.status === "FINISHED");
  const mapped = finished
    .map(mapMatch)
    .filter((m): m is InternalMatch => m !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const outPath = join(__dirname, "../data/live-matches.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      { lastFetched: new Date().toISOString(), matches: mapped },
      null,
      2,
    ),
  );

  console.log(
    `Wrote ${mapped.length} finished match(es) from football-data.org to ${outPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
