"use client";

import { womensMatches, womensScorigami, womensSummary, womensTournamentYears } from "@/lib/data-womens";
import ScorigamiApp from "@/components/ScorigamiApp";

export default function WomensHome() {
  return (
    <ScorigamiApp
      edition="womens"
      matches={womensMatches}
      scorigami={womensScorigami}
      summary={womensSummary}
      tournamentYears={womensTournamentYears}
    />
  );
}
