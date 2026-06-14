/**
 * Build data/venues-2026.json — a lookup of 2026 World Cup match venues
 * (stadium, city, country) keyed by `date|homeISO|awayISO`.
 *
 * Why this exists: football-data.org (our live score source) returns no venue
 * data for World Cup matches, so live 2026 matches would display no location.
 * FIFA's own API has the full venue for all 104 fixtures; we pull it here and
 * process-data.ts joins it to matches by date + team code.
 *
 * Knockout fixtures whose teams aren't decided yet are skipped (no team codes
 * to key on) and fill in automatically on a later run once the bracket sets.
 *
 * Run: npx tsx scripts/build-venues.ts   (also runs best-effort in the cron)
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { mapTeamCode } from "./lib/fd-mapper";

const SEASON_2026 = "285023";
const FIFA_URL = `https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=${SEASON_2026}&count=200&language=en`;

// FIFA serves generic "<City> Stadium" names during the tournament (sponsorship
// rules). Map them to the real stadium names for nicer display.
const STADIUM_NAMES: Record<string, string> = {
  "Atlanta Stadium": "Mercedes-Benz Stadium",
  "BC Place Vancouver": "BC Place",
  "Boston Stadium": "Gillette Stadium",
  "Dallas Stadium": "AT&T Stadium",
  "Guadalajara Stadium": "Estadio Akron",
  "Houston Stadium": "NRG Stadium",
  "Kansas City Stadium": "Arrowhead Stadium",
  "Los Angeles Stadium": "SoFi Stadium",
  "Mexico City Stadium": "Estadio Azteca",
  "Miami Stadium": "Hard Rock Stadium",
  "Monterrey Stadium": "Estadio BBVA",
  "New York/New Jersey Stadium": "MetLife Stadium",
  "Philadelphia Stadium": "Lincoln Financial Field",
  "San Francisco Bay Area Stadium": "Levi's Stadium",
  "Seattle Stadium": "Lumen Field",
  "Toronto Stadium": "BMO Field",
};

const COUNTRY_NAMES: Record<string, string> = {
  USA: "United States",
  CAN: "Canada",
  MEX: "Mexico",
};

interface Venue {
  stadium: string;
  city: string;
  country: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstDesc(arr: any): string {
  return (arr && arr[0] && arr[0].Description) || "";
}

async function main() {
  const res = await fetch(FIFA_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`FIFA API request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { Results?: unknown[] };
  const fixtures = (data.Results || []) as Record<string, unknown>[];

  const venues: Record<string, Venue> = {};
  let resolved = 0;

  for (const m of fixtures) {
    const home = m.Home as { IdCountry?: string } | undefined;
    const away = m.Away as { IdCountry?: string } | undefined;
    // Skip knockout slots whose teams aren't decided yet.
    if (!home?.IdCountry || !away?.IdCountry) continue;

    const date = String(m.Date || "").slice(0, 10);
    const stadium = m.Stadium as
      | { Name?: unknown; CityName?: unknown; IdCountry?: string }
      | undefined;
    const city = firstDesc(stadium?.CityName);
    if (!date || !city) continue;

    const homeIso = mapTeamCode(home.IdCountry);
    const awayIso = mapTeamCode(away.IdCountry);
    const fifaName = firstDesc(stadium?.Name);

    venues[`${date}|${homeIso}|${awayIso}`] = {
      stadium: STADIUM_NAMES[fifaName] || fifaName,
      city,
      country: COUNTRY_NAMES[stadium?.IdCountry || ""] || stadium?.IdCountry || "",
    };
    resolved++;
  }

  // Sort keys for stable diffs across runs.
  const sorted = Object.fromEntries(Object.entries(venues).sort());
  const outPath = join(__dirname, "../data/venues-2026.json");
  writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Wrote ${resolved} venue(s) to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
