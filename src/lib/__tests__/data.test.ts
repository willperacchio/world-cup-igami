import { describe, it, expect } from "vitest";
import { buildGridFromMatches, getMatchesForScore, getScorigamiGrid, tournamentYears } from "../data";
import type { Match } from "../types";

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    date: "2022-11-20",
    tournament: "2022 FIFA Men's World Cup",
    stage: "group stage",
    homeTeam: "Qatar",
    awayTeam: "Ecuador",
    homeCode: "QAT",
    awayCode: "ECU",
    homeScore: 0,
    awayScore: 2,
    extraTime: false,
    penaltyShootout: false,
    penaltyScore: "",
    stadium: "Al Bayt Stadium",
    city: "Al Khor",
    country: "Qatar",
    ...overrides,
  };
}

describe("buildGridFromMatches", () => {
  it("groups matches by normalized score (low-high)", () => {
    const matches = [
      makeMatch({ homeScore: 2, awayScore: 0 }),
      makeMatch({ homeScore: 0, awayScore: 2, date: "2022-11-21" }),
    ];
    const grid = buildGridFromMatches(matches);
    expect(grid.size).toBe(1);
    const entry = grid.get("0-2");
    expect(entry?.count).toBe(2);
  });

  it("sets firstMatch to the earliest match", () => {
    const matches = [
      makeMatch({ homeScore: 1, awayScore: 0, date: "2022-12-01" }),
      makeMatch({ homeScore: 0, awayScore: 1, date: "2022-11-20" }),
    ];
    const grid = buildGridFromMatches(matches);
    const entry = grid.get("0-1");
    expect(entry?.firstMatch.date).toBe("2022-11-20");
  });

  it("returns empty map for empty input", () => {
    expect(buildGridFromMatches([]).size).toBe(0);
  });
});

describe("getScorigamiGrid", () => {
  it("returns a non-empty map from real data", () => {
    const grid = getScorigamiGrid();
    expect(grid.size).toBeGreaterThan(0);
  });
});

describe("getMatchesForScore", () => {
  it("returns matches for the given score", () => {
    // Uses real data — should have at least some 1-0 matches
    const results = getMatchesForScore(0, 1);
    expect(results.length).toBeGreaterThan(0);
    for (const m of results) {
      const lo = Math.min(m.homeScore, m.awayScore);
      const hi = Math.max(m.homeScore, m.awayScore);
      expect(lo).toBe(0);
      expect(hi).toBe(1);
    }
  });
});

describe("tournamentYears", () => {
  it("is sorted ascending", () => {
    for (let i = 1; i < tournamentYears.length; i++) {
      expect(tournamentYears[i]).toBeGreaterThan(tournamentYears[i - 1]);
    }
  });

  it("starts with 1930", () => {
    expect(tournamentYears[0]).toBe(1930);
  });

  it("includes 2022", () => {
    expect(tournamentYears).toContain(2022);
  });
});
