import { describe, it, expect } from "vitest";
import {
  UPCOMING_TOURNAMENTS,
  getEffectiveTournamentYears,
  getUpcomingTournamentStatus,
} from "../tournament";

describe("UPCOMING_TOURNAMENTS", () => {
  it("includes the 2026 men's tournament with its real kickoff date", () => {
    const t = UPCOMING_TOURNAMENTS.find((u) => u.year === 2026);
    expect(t).toBeDefined();
    expect(t?.firstMatchDate).toBe("2026-06-11");
    expect(t?.lastMatchDate).toBe("2026-07-19");
  });
});

describe("getEffectiveTournamentYears", () => {
  it("unions historical years with upcoming-tournament years and sorts ascending", () => {
    const years = getEffectiveTournamentYears([1930, 2022, 2018]);
    expect(years).toEqual([1930, 2018, 2022, 2026]);
  });

  it("does not duplicate when a historical year overlaps with an upcoming one", () => {
    const years = getEffectiveTournamentYears([2022, 2026]);
    expect(years).toEqual([2022, 2026]);
  });

  it("handles empty historical input", () => {
    const years = getEffectiveTournamentYears([]);
    expect(years).toEqual([2026]);
  });
});

describe("getUpcomingTournamentStatus", () => {
  it("returns metadata when scrubbed to an upcoming year with no matches yet", () => {
    const status = getUpcomingTournamentStatus(2026, [1930, 2022]);
    expect(status).not.toBeNull();
    expect(status?.year).toBe(2026);
  });

  it("returns null once the upcoming tournament has at least one match", () => {
    const status = getUpcomingTournamentStatus(2026, [1930, 2022, 2026]);
    expect(status).toBeNull();
  });

  it("returns null for a historical year", () => {
    expect(getUpcomingTournamentStatus(2022, [1930, 2022])).toBeNull();
  });

  it("returns null for an unknown future year not in UPCOMING_TOURNAMENTS", () => {
    expect(getUpcomingTournamentStatus(2030, [])).toBeNull();
  });
});
