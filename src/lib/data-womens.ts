import matchesData from "../../data/womens/matches.json";
import scorigamiData from "../../data/womens/scorigami.json";
import summaryData from "../../data/womens/summary.json";
import type { Match, ScorigamiEntry, Summary } from "./types";
import { getEffectiveTournamentYears, WOMENS_UPCOMING_TOURNAMENTS } from "./tournament";
import { parseTournamentYear } from "./match-utils";

export const womensMatches = matchesData as Match[];
export const womensScorigami = scorigamiData as ScorigamiEntry[];
export const womensSummary = summaryData as Summary;

export const womensTournamentYears: number[] = getEffectiveTournamentYears(
  womensMatches.map((m) => parseInt(parseTournamentYear(m.tournament))),
  WOMENS_UPCOMING_TOURNAMENTS,
);
