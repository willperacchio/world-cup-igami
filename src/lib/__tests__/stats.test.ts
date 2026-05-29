import { describe, it, expect } from "vitest";
import {
  computeUniqueScores,
  computeMostCommon,
  computeHighestScoring,
  computeMostLopsided,
  computeMostRecentScorigami,
  computeGoalDistribution,
  computeStageBreakdown,
  computeHostScorigamis,
  computeFunFacts,
} from "../stats";
import type { Match, ScorigamiEntry } from "../types";

// ── Test fixtures ──

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

function makeEntry(
  low: number,
  high: number,
  count: number,
  matchOverrides: Partial<Match> = {},
): ScorigamiEntry {
  return {
    lowScore: low,
    highScore: high,
    count,
    firstMatch: makeMatch({ homeScore: low, awayScore: high, ...matchOverrides }),
    lastMatch: makeMatch({ homeScore: low, awayScore: high, ...matchOverrides }),
  };
}

// ── Tests ──

describe("computeUniqueScores", () => {
  it("returns only entries with count=1", () => {
    const entries = [makeEntry(0, 1, 1), makeEntry(1, 0, 5), makeEntry(2, 3, 1)];
    const result = computeUniqueScores(entries);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.count === 1)).toBe(true);
  });

  it("returns empty for no unique scores", () => {
    const entries = [makeEntry(0, 1, 5), makeEntry(1, 2, 3)];
    expect(computeUniqueScores(entries)).toHaveLength(0);
  });
});

describe("computeMostCommon", () => {
  it("sorts by count descending", () => {
    const entries = [makeEntry(0, 1, 5), makeEntry(1, 2, 10), makeEntry(0, 2, 3)];
    const result = computeMostCommon(entries);
    expect(result[0].count).toBe(10);
    expect(result[1].count).toBe(5);
    expect(result[2].count).toBe(3);
  });

  it("breaks ties by total goals ascending", () => {
    const entries = [
      makeEntry(2, 3, 5), // total = 5
      makeEntry(0, 1, 5), // total = 1
    ];
    const result = computeMostCommon(entries);
    expect(result[0].lowScore + result[0].highScore).toBe(1);
    expect(result[1].lowScore + result[1].highScore).toBe(5);
  });

  it("breaks further ties by margin ascending", () => {
    const entries = [
      makeEntry(0, 2, 5), // margin = 2
      makeEntry(1, 1, 5), // margin = 0, same total goals = 2
    ];
    const result = computeMostCommon(entries);
    expect(result[0].highScore - result[0].lowScore).toBe(0); // draw first
    expect(result[1].highScore - result[1].lowScore).toBe(2);
  });

  it("filters out entries with count=0", () => {
    const entries = [makeEntry(0, 1, 0), makeEntry(1, 2, 3)];
    const result = computeMostCommon(entries);
    expect(result).toHaveLength(1);
  });
});

describe("computeHighestScoring", () => {
  it("returns only matches with >= minGoals total", () => {
    const matches = [
      makeMatch({ homeScore: 6, awayScore: 5 }), // 11
      makeMatch({ homeScore: 1, awayScore: 0 }), // 1
      makeMatch({ homeScore: 5, awayScore: 5 }), // 10
    ];
    const result = computeHighestScoring(matches, 10);
    expect(result).toHaveLength(2);
    expect(result[0].homeScore + result[0].awayScore).toBe(11);
  });

  it("returns empty when no matches meet threshold", () => {
    const matches = [makeMatch({ homeScore: 1, awayScore: 0 })];
    expect(computeHighestScoring(matches, 10)).toHaveLength(0);
  });
});

describe("computeMostLopsided", () => {
  it("returns matches sorted by margin descending", () => {
    const matches = [
      makeMatch({ homeScore: 3, awayScore: 0 }), // margin 3
      makeMatch({ homeScore: 7, awayScore: 1 }), // margin 6
      makeMatch({ homeScore: 2, awayScore: 1 }), // margin 1
    ];
    const result = computeMostLopsided(matches, 3);
    expect(Math.abs(result[0].homeScore - result[0].awayScore)).toBe(6);
    expect(result).toHaveLength(3);
  });

  it("respects the limit parameter", () => {
    const matches = Array.from({ length: 10 }, (_, i) =>
      makeMatch({ homeScore: i, awayScore: 0 }),
    );
    expect(computeMostLopsided(matches, 2)).toHaveLength(2);
  });
});

describe("computeMostRecentScorigami", () => {
  it("returns the most recent first match among unique scores", () => {
    const entries = [
      makeEntry(0, 1, 1, { date: "2018-06-14" }),
      makeEntry(2, 3, 1, { date: "2022-11-20" }),
      makeEntry(1, 4, 1, { date: "2014-06-12" }),
    ];
    const result = computeMostRecentScorigami(entries);
    expect(result?.date).toBe("2022-11-20");
  });

  it("returns undefined for empty input", () => {
    expect(computeMostRecentScorigami([])).toBeUndefined();
  });
});

describe("computeGoalDistribution", () => {
  it("buckets goals correctly up to maxBucket", () => {
    const matches = [
      makeMatch({ homeScore: 0, awayScore: 0 }), // 0 total
      makeMatch({ homeScore: 1, awayScore: 1 }), // 2 total
      makeMatch({ homeScore: 1, awayScore: 1 }), // 2 total
      makeMatch({ homeScore: 6, awayScore: 7 }), // 13 total → goes into 12+ bucket
    ];
    const result = computeGoalDistribution(matches, 12);
    expect(result).toHaveLength(13); // 0..12
    expect(result[0].count).toBe(1); // 0 goals
    expect(result[2].count).toBe(2); // 2 goals
    expect(result[12].count).toBe(1); // 12+ bucket
  });

  it("uses custom maxBucket", () => {
    const matches = [makeMatch({ homeScore: 5, awayScore: 5 })]; // 10 total
    const result = computeGoalDistribution(matches, 8);
    expect(result).toHaveLength(9); // 0..8
    expect(result[8].count).toBe(1); // 10 goes into 8+ bucket
  });

  it("returns zeros for empty buckets", () => {
    const matches = [makeMatch({ homeScore: 3, awayScore: 0 })]; // 3 total
    const result = computeGoalDistribution(matches, 5);
    expect(result[0].count).toBe(0);
    expect(result[1].count).toBe(0);
    expect(result[3].count).toBe(1);
  });
});

describe("computeStageBreakdown", () => {
  it("calculates scorigami rate per stage", () => {
    const matches = [
      makeMatch({ stage: "group stage" }),
      makeMatch({ stage: "group stage" }),
      makeMatch({ stage: "final" }),
    ];
    const scorigami = [
      makeEntry(0, 2, 1, { stage: "group stage" }),
      makeEntry(1, 0, 1, { stage: "final" }),
    ];
    const { breakdown } = computeStageBreakdown(matches, scorigami);
    const groupStage = breakdown.find((s) => s.stage === "group stage");
    const final = breakdown.find((s) => s.stage === "final");
    expect(groupStage?.rate).toBe(50); // 1 scorigami / 2 matches
    expect(final?.rate).toBe(100); // 1/1
  });

  it("computes group vs knockout summary", () => {
    const matches = [
      makeMatch({ stage: "group stage" }),
      makeMatch({ stage: "quarter-finals" }),
    ];
    const scorigami = [makeEntry(0, 2, 1, { stage: "group stage" })];
    const { summary } = computeStageBreakdown(matches, scorigami);
    expect(summary.group.scorigamis).toBe(1);
    expect(summary.knockout.scorigamis).toBe(0);
  });

  it("identifies the top scorigami stage", () => {
    const matches = [
      makeMatch({ stage: "group stage" }),
      makeMatch({ stage: "group stage" }),
      makeMatch({ stage: "final" }),
    ];
    const scorigami = [
      makeEntry(0, 2, 1, { stage: "final" }),
    ];
    const { topStage } = computeStageBreakdown(matches, scorigami);
    expect(topStage?.stage).toBe("final");
  });
});

describe("computeHostScorigamis", () => {
  it("finds scorigamis where host nation played", () => {
    const scorigami = [
      makeEntry(0, 2, 1, { homeTeam: "Brazil", country: "Brazil" }),
      makeEntry(1, 3, 1, { homeTeam: "Germany", awayTeam: "France", country: "France" }),
      makeEntry(2, 2, 1, { homeTeam: "Spain", awayTeam: "Italy", country: "South Africa" }),
    ];
    const result = computeHostScorigamis(scorigami);
    expect(result).toHaveLength(2);
    expect(result[0].hostTeam).toBe("Brazil");
    expect(result[1].hostTeam).toBe("France");
  });

  it("returns empty when no host team was involved", () => {
    const scorigami = [
      makeEntry(1, 2, 1, { homeTeam: "Spain", awayTeam: "Italy", country: "Brazil" }),
    ];
    expect(computeHostScorigamis(scorigami)).toHaveLength(0);
  });
});

describe("computeFunFacts (integration)", () => {
  it("returns all expected fields", () => {
    const matches = [
      makeMatch({ homeScore: 1, awayScore: 0, stage: "group stage" }),
      makeMatch({ homeScore: 2, awayScore: 1, stage: "final", date: "2022-12-18" }),
    ];
    const scorigami = [
      makeEntry(0, 1, 1, { stage: "group stage" }),
      makeEntry(1, 2, 1, { stage: "final", date: "2022-12-18" }),
    ];
    const result = computeFunFacts(matches, scorigami);

    expect(result.uniqueScores).toHaveLength(2);
    expect(result.mostCommon).toHaveLength(2);
    expect(result.totalGoals).toBe(4);
    expect(result.goalDistribution.length).toBeGreaterThan(0);
    expect(result.stageBreakdown.length).toBeGreaterThan(0);
    expect(result.stageSummary.group).toBeDefined();
    expect(result.stageSummary.knockout).toBeDefined();
  });

  it("handles empty input gracefully", () => {
    const result = computeFunFacts([], []);
    expect(result.uniqueScores).toHaveLength(0);
    expect(result.mostCommon).toHaveLength(0);
    expect(result.totalGoals).toBe(0);
    expect(result.mostRecent).toBeUndefined();
    expect(result.topFinalScore).toBeNull();
  });
});
