"use client";

import { matches, scorigami, summary, liveLastFetched, tournamentYears } from "@/lib/data";
import ScorigamiApp from "@/components/ScorigamiApp";

export default function Home() {
  return (
    <ScorigamiApp
      edition="mens"
      matches={matches}
      scorigami={scorigami}
      summary={summary}
      tournamentYears={tournamentYears}
      liveLastFetched={liveLastFetched}
    />
  );
}
