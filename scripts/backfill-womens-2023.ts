/**
 * One-time backfill: fetch the complete 2023 FIFA Women's World Cup from
 * FIFA's API and write data/womens-2023.json in our internal Match shape.
 *
 * Why: the Fjelstul CSV covers Women's World Cups 1991–2019 but predates the
 * 2023 tournament. FIFA's API (competition 103, season 285026) has all 64
 * matches with scores, stages, venues, and penalty shootouts.
 *
 * FIFA score semantics (verified against the 2023 knockouts):
 *   - Home.Score / Away.Score is the true scoreline (regulation + extra time,
 *     shootouts NOT included) — e.g. Australia 0-0 France (7-6 pens).
 *   - HomeTeamPenaltyScore / AwayTeamPenaltyScore hold the shootout.
 *   - ResultType: 1 = regular time, 2 = penalty shootout, 3 = extra time.
 *
 * Run: npx tsx scripts/backfill-womens-2023.ts
 * The output file is committed; this script only needs re-running if FIFA
 * corrects a result.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { mapTeamCode } from "./lib/fd-mapper";

const URL =
  "https://api.fifa.com/api/v3/calendar/matches?idCompetition=103&idSeason=285026&count=200&language=en";

/** FIFA display names → the names our historical CSV already uses. */
const NAME_MAP: Record<string, string> = {
  USA: "United States",
  "China PR": "China",
  "Korea Republic": "South Korea",
  "Korea DPR": "North Korea",
  "Côte d'Ivoire": "Ivory Coast",
};

/** FIFA stage names → the stage strings the UI/i18n already knows. */
const STAGE_MAP: Record<string, string> = {
  "First Stage": "group stage",
  "Round of 16": "round of 16",
  "Quarter-final": "quarter-finals",
  "Semi-final": "semi-finals",
  "Play-off for third place": "third-place match",
  Final: "final",
};

const STADIUM_COUNTRY: Record<string, string> = {
  AUS: "Australia",
  NZL: "New Zealand",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstDesc(arr: any): string {
  return (arr && arr[0] && arr[0].Description) || "";
}

async function main() {
  const res = await fetch(URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FIFA API failed: ${res.status}`);
  const data = (await res.json()) as { Results?: Record<string, unknown>[] };
  const fixtures = data.Results || [];

  const matches = fixtures
    .map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const home = m.Home as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const away = m.Away as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stadium = m.Stadium as any;
      if (home?.Score == null || away?.Score == null) return null;

      const rawHome = firstDesc(home.TeamName);
      const rawAway = firstDesc(away.TeamName);
      const resultType = m.ResultType as number;
      const penaltyShootout = resultType === 2;
      const extraTime = resultType === 3 || penaltyShootout;

      let penaltyScore = "";
      if (penaltyShootout) {
        const hp = (m as Record<string, unknown>).HomeTeamPenaltyScore;
        const ap = (m as Record<string, unknown>).AwayTeamPenaltyScore;
        if (hp != null && ap != null) penaltyScore = `${hp}-${ap}`;
      }

      // FIFA city names include Māori co-names ("Auckland / Tāmaki Makaurau");
      // keep just the primary name for display consistency.
      const city = firstDesc(stadium?.CityName).split("/")[0].trim();

      return {
        date: String(m.Date).slice(0, 10),
        kickoff: String(m.Date),
        tournament: "2023 FIFA Women's World Cup",
        stage: STAGE_MAP[firstDesc(m.StageName)] || firstDesc(m.StageName).toLowerCase(),
        homeTeam: NAME_MAP[rawHome] || rawHome,
        awayTeam: NAME_MAP[rawAway] || rawAway,
        // Panama's IdCountry is null in FIFA's data; Abbreviation covers it.
        homeCode: mapTeamCode(home.IdCountry || home.Abbreviation || ""),
        awayCode: mapTeamCode(away.IdCountry || away.Abbreviation || ""),
        homeScore: home.Score as number,
        awayScore: away.Score as number,
        extraTime,
        penaltyShootout,
        penaltyScore,
        stadium: firstDesc(stadium?.Name),
        city,
        country: STADIUM_COUNTRY[stadium?.IdCountry] || stadium?.IdCountry || "",
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const outPath = join(__dirname, "../data/womens-2023.json");
  writeFileSync(outPath, JSON.stringify({ matches }, null, 2) + "\n");
  console.log(`Wrote ${matches.length} matches to ${outPath}`);
  const pens = matches.filter((m) => m.penaltyShootout);
  console.log(`Shootouts: ${pens.map((m) => `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${m.penaltyScore})`).join("; ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
