import { describe, it, expect } from "vitest";
import { mapMatch, mapStage, type FdMatch } from "../fd-mapper";

function makeFdMatch(overrides: Partial<FdMatch> = {}): FdMatch {
  return {
    id: 1,
    utcDate: "2026-06-11T20:00:00Z",
    status: "FINISHED",
    stage: "GROUP_STAGE",
    homeTeam: { id: 1, name: "Mexico", tla: "MEX" },
    awayTeam: { id: 2, name: "Argentina", tla: "ARG" },
    score: {
      winner: "AWAY_TEAM",
      duration: "REGULAR",
      fullTime: { home: 1, away: 2 },
      halfTime: { home: 0, away: 1 },
    },
    venue: "Estadio Azteca",
    ...overrides,
  };
}

describe("mapStage", () => {
  it("maps known stage codes to the existing UI strings", () => {
    expect(mapStage("GROUP_STAGE")).toBe("group stage");
    expect(mapStage("ROUND_OF_16")).toBe("round of 16");
    expect(mapStage("LAST_16")).toBe("round of 16");
    expect(mapStage("LAST_32")).toBe("round of 32");
    expect(mapStage("QUARTER_FINALS")).toBe("quarter-finals");
    expect(mapStage("SEMI_FINALS")).toBe("semi-finals");
    expect(mapStage("THIRD_PLACE")).toBe("third-place match");
    expect(mapStage("FINAL")).toBe("final");
  });

  it("falls through unknown stages as lowercase-with-dashes", () => {
    expect(mapStage("PRELIMINARY_ROUND")).toBe("preliminary-round");
    expect(mapStage("PLAYOFF")).toBe("playoff");
  });
});

describe("mapMatch", () => {
  it("maps a regulation-time finish onto the internal Match shape", () => {
    const m = mapMatch(makeFdMatch());
    expect(m).not.toBeNull();
    expect(m).toMatchObject({
      date: "2026-06-11",
      tournament: "2026 FIFA Men's World Cup",
      stage: "group stage",
      homeTeam: "Mexico",
      awayTeam: "Argentina",
      homeCode: "MEX",
      awayCode: "ARG",
      homeScore: 1,
      awayScore: 2,
      extraTime: false,
      penaltyShootout: false,
      penaltyScore: "",
      stadium: "Estadio Azteca",
    });
  });

  it("returns null when the scoreline isn't final yet", () => {
    const scheduled = makeFdMatch({
      status: "SCHEDULED",
      score: {
        winner: null,
        duration: "REGULAR",
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
    });
    expect(mapMatch(scheduled)).toBeNull();
  });

  it("flags extra-time finishes", () => {
    const aet = makeFdMatch({
      score: {
        winner: "HOME_TEAM",
        duration: "EXTRA_TIME",
        fullTime: { home: 3, away: 2 },
        halfTime: { home: 1, away: 1 },
      },
    });
    const m = mapMatch(aet)!;
    expect(m.extraTime).toBe(true);
    expect(m.penaltyShootout).toBe(false);
    expect(m.homeScore).toBe(3);
    expect(m.awayScore).toBe(2);
  });

  it("derives shootout scoreline from regularTime+extraTime, not penalty-inclusive fullTime", () => {
    // football-data sums regular + extra + penalties into fullTime for
    // shootouts: a 1-1 that goes to a 4-5 shootout reports fullTime 5-6. The
    // scoreline for scorigami must be 1-1, not 5-6. (Germany 1-1 Paraguay, 2026)
    const shootout = makeFdMatch({
      score: {
        winner: "AWAY_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 5, away: 6 },
        halfTime: { home: 0, away: 1 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 4, away: 5 },
      },
    });
    const m = mapMatch(shootout)!;
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    expect(m.extraTime).toBe(true);
    expect(m.penaltyShootout).toBe(true);
    expect(m.penaltyScore).toBe("4-5");
  });

  it("counts extra-time goals in a shootout scoreline (regularTime+extraTime)", () => {
    // 1-1 after 90, 2-2 after ET, then a 3-2 shootout → fullTime 5-4. Scoreline 2-2.
    const shootout = makeFdMatch({
      score: {
        winner: "HOME_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 5, away: 4 },
        halfTime: { home: 1, away: 0 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 1, away: 1 },
        penalties: { home: 3, away: 2 },
      },
    });
    const m = mapMatch(shootout)!;
    expect(m.homeScore).toBe(2);
    expect(m.awayScore).toBe(2);
    expect(m.penaltyScore).toBe("3-2");
  });

  it("backs out penalties from fullTime when regularTime is absent", () => {
    const shootout = makeFdMatch({
      score: {
        winner: "AWAY_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 4, away: 6 },
        halfTime: { home: 0, away: 1 },
        penalties: { home: 3, away: 5 },
      },
    });
    const m = mapMatch(shootout)!;
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    expect(m.penaltyScore).toBe("3-5");
  });

  it("falls back to shortName when tla is missing", () => {
    const m = mapMatch(
      makeFdMatch({
        homeTeam: { id: 1, name: "Mexico", shortName: "MEX" },
        awayTeam: { id: 2, name: "Argentina", shortName: "ARG" },
      }),
    )!;
    expect(m.homeCode).toBe("MEX");
    expect(m.awayCode).toBe("ARG");
  });

  it("uses empty string when both tla and shortName are missing", () => {
    const m = mapMatch(
      makeFdMatch({
        homeTeam: { id: 1, name: "Mexico" },
        awayTeam: { id: 2, name: "Argentina" },
      }),
    )!;
    expect(m.homeCode).toBe("");
    expect(m.awayCode).toBe("");
  });

  it("derives the tournament name from the year of the match date", () => {
    expect(mapMatch(makeFdMatch({ utcDate: "2026-07-19T20:00:00Z" }))!.tournament)
      .toBe("2026 FIFA Men's World Cup");
    expect(mapMatch(makeFdMatch({ utcDate: "2030-06-15T20:00:00Z" }))!.tournament)
      .toBe("2030 FIFA Men's World Cup");
  });

  it("leaves venue/city/country defaults sensible when missing", () => {
    const m = mapMatch(makeFdMatch({ venue: null }))!;
    expect(m.stadium).toBe("");
    expect(m.city).toBe("");
    expect(m.country).toBe("");
  });
});
