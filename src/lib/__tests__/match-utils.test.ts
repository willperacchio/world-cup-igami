import { describe, it, expect } from "vitest";
import { orientMatch, parseTournamentYear, getMatchYear } from "../match-utils";
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

describe("orientMatch", () => {
  it("puts the higher-scoring team as winner", () => {
    const m = makeMatch({ homeScore: 1, awayScore: 3 });
    const result = orientMatch(m);
    expect(result.winnerTeam).toBe("Ecuador");
    expect(result.winnerScore).toBe(3);
    expect(result.loserTeam).toBe("Qatar");
    expect(result.loserScore).toBe(1);
  });

  it("keeps home team first when home team wins", () => {
    const m = makeMatch({ homeScore: 3, awayScore: 1 });
    const result = orientMatch(m);
    expect(result.winnerTeam).toBe("Qatar");
    expect(result.winnerScore).toBe(3);
    expect(result.loserTeam).toBe("Ecuador");
    expect(result.loserScore).toBe(1);
  });

  it("handles draw without penalties (home team stays first)", () => {
    const m = makeMatch({ homeScore: 1, awayScore: 1 });
    const result = orientMatch(m);
    expect(result.winnerTeam).toBe("Qatar");
    expect(result.loserTeam).toBe("Ecuador");
    expect(result.penaltyDisplay).toBeNull();
  });

  it("reorients by penalty winner when away team wins shootout", () => {
    const m = makeMatch({
      homeScore: 1,
      awayScore: 1,
      extraTime: true,
      penaltyShootout: true,
      penaltyScore: "3–5",
    });
    const result = orientMatch(m);
    expect(result.winnerTeam).toBe("Ecuador");
    expect(result.loserTeam).toBe("Qatar");
    expect(result.penaltyDisplay).toBe("5–3");
  });

  it("keeps home team first when home team wins shootout", () => {
    const m = makeMatch({
      homeScore: 1,
      awayScore: 1,
      extraTime: true,
      penaltyShootout: true,
      penaltyScore: "5–3",
    });
    const result = orientMatch(m);
    expect(result.winnerTeam).toBe("Qatar");
    expect(result.loserTeam).toBe("Ecuador");
    expect(result.penaltyDisplay).toBe("5–3");
  });

  it("parses year from match date", () => {
    const m = makeMatch({ date: "1954-06-16" });
    const result = orientMatch(m);
    expect(result.year).toBe(1954);
  });

  it("preserves reference to original match", () => {
    const m = makeMatch();
    const result = orientMatch(m);
    expect(result.original).toBe(m);
  });

  it("returns null penaltyDisplay when no shootout", () => {
    const m = makeMatch({ penaltyShootout: false, penaltyScore: "" });
    const result = orientMatch(m);
    expect(result.penaltyDisplay).toBeNull();
  });
});

describe("parseTournamentYear", () => {
  it("extracts year from tournament name", () => {
    expect(parseTournamentYear("2022 FIFA Men's World Cup")).toBe("2022");
    expect(parseTournamentYear("1930 FIFA Men's World Cup")).toBe("1930");
  });
});

describe("getMatchYear", () => {
  it("returns numeric year", () => {
    const m = makeMatch({ tournament: "2022 FIFA Men's World Cup" });
    expect(getMatchYear(m)).toBe(2022);
  });
});
