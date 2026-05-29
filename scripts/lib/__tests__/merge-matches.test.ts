import { describe, it, expect } from "vitest";
import { mergeMatches } from "../merge-matches";

interface TestMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  source: string;
}

function m(
  date: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  source = "historical",
): TestMatch {
  return { date, homeTeam, awayTeam, homeScore, awayScore, source };
}

describe("mergeMatches", () => {
  it("returns historical-only data when no live or overrides", () => {
    const historical = [m("2022-12-18", "ARG", "FRA", 3, 3)];
    const { matches, liveAdded, overridesApplied } = mergeMatches(historical);
    expect(matches).toHaveLength(1);
    expect(liveAdded).toBe(0);
    expect(overridesApplied).toBe(0);
  });

  it("adds new live matches that aren't in historical", () => {
    const historical = [m("2022-12-18", "ARG", "FRA", 3, 3)];
    const live = [m("2026-06-11", "MEX", "ARG", 1, 2, "live")];
    const { matches, liveAdded } = mergeMatches(historical, live);
    expect(matches).toHaveLength(2);
    expect(liveAdded).toBe(1);
  });

  it("doesn't double-count when live and historical share a (date, home, away) key", () => {
    const historical = [m("2026-06-11", "MEX", "ARG", 0, 0, "historical")];
    const live = [m("2026-06-11", "MEX", "ARG", 1, 2, "live")];
    const { matches, liveAdded } = mergeMatches(historical, live);
    expect(matches).toHaveLength(1);
    expect(liveAdded).toBe(0); // already existed
    // Live should have overwritten — proves precedence
    expect((matches[0] as TestMatch).source).toBe("live");
    expect((matches[0] as TestMatch).homeScore).toBe(1);
  });

  it("applies overrides last (overrides > live > historical)", () => {
    const historical = [m("2026-06-11", "MEX", "ARG", 0, 0, "historical")];
    const live = [m("2026-06-11", "MEX", "ARG", 1, 2, "live")];
    const overrides = [m("2026-06-11", "MEX", "ARG", 2, 1, "override")];
    const { matches, overridesApplied } = mergeMatches(historical, live, overrides);
    expect(matches).toHaveLength(1);
    expect(overridesApplied).toBe(1);
    expect((matches[0] as TestMatch).source).toBe("override");
    expect((matches[0] as TestMatch).homeScore).toBe(2);
    expect((matches[0] as TestMatch).awayScore).toBe(1);
  });

  it("sorts the merged list by date ascending", () => {
    const historical = [
      m("2018-06-14", "RUS", "KSA", 5, 0),
      m("2022-11-20", "QAT", "ECU", 0, 2),
    ];
    const live = [
      m("2026-06-11", "MEX", "ARG", 1, 2),
      m("2026-06-12", "USA", "GHA", 2, 0),
    ];
    const { matches } = mergeMatches(historical, live);
    expect(matches.map((x) => x.date)).toEqual([
      "2018-06-14",
      "2022-11-20",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("treats overrides as applied even if they don't change anything", () => {
    const historical = [m("2026-06-11", "MEX", "ARG", 1, 2)];
    const overrides = [m("2026-06-11", "MEX", "ARG", 1, 2)];
    const { matches, overridesApplied } = mergeMatches(historical, [], overrides);
    expect(matches).toHaveLength(1);
    expect(overridesApplied).toBe(1);
  });

  it("handles empty inputs without crashing", () => {
    const { matches, liveAdded, overridesApplied } = mergeMatches([]);
    expect(matches).toEqual([]);
    expect(liveAdded).toBe(0);
    expect(overridesApplied).toBe(0);
  });

  it("dedup key is exactly (date|homeTeam|awayTeam) — same teams reversed counts as a different match", () => {
    const historical = [m("2026-06-11", "MEX", "ARG", 1, 2)];
    const live = [m("2026-06-11", "ARG", "MEX", 2, 1)];
    const { matches, liveAdded } = mergeMatches(historical, live);
    expect(matches).toHaveLength(2);
    expect(liveAdded).toBe(1);
  });
});
