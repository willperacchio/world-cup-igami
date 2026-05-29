import { describe, it, expect } from "vitest";
import { getWikipediaUrl, getFifaUrl } from "../external-links";
import type { Match } from "../types";

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    date: "2022-12-18",
    tournament: "2022 FIFA Men's World Cup",
    stage: "final",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeCode: "ARG",
    awayCode: "FRA",
    homeScore: 3,
    awayScore: 3,
    extraTime: true,
    penaltyShootout: true,
    penaltyScore: "4-2",
    stadium: "Lusail",
    city: "Lusail",
    country: "Qatar",
    ...overrides,
  };
}

describe("getWikipediaUrl", () => {
  it("returns the dedicated final article URL for the World Cup final", () => {
    const url = getWikipediaUrl(makeMatch());
    // Should be a direct article link (not a search URL)
    expect(url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    expect(url).toContain("FIFA_World_Cup");
  });

  it("returns a direct Wikipedia article URL (not a search URL)", () => {
    const url = getWikipediaUrl(
      makeMatch({ stage: "group stage", homeTeam: "Brazil", awayTeam: "Serbia" }),
    );
    // Should be a /wiki/ URL, not a /w/index.php?search= URL
    expect(url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    expect(url).not.toContain("index.php?search=");
  });

  it("falls back to the tournament page for unknown matches", () => {
    const url = getWikipediaUrl(
      makeMatch({
        date: "9999-01-01",
        homeTeam: "Nonexistent A",
        awayTeam: "Nonexistent B",
        stage: "group stage",
      }),
    );
    // Should still produce a valid Wikipedia URL
    expect(url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    expect(url).toContain("FIFA_World_Cup");
  });
});

describe("getFifaUrl", () => {
  it("returns a valid URL", () => {
    const url = getFifaUrl(makeMatch());
    expect(() => new URL(url)).not.toThrow();
  });

  it("returns a FIFA domain URL", () => {
    const url = getFifaUrl(makeMatch());
    expect(url).toMatch(/fifa\.com/);
  });

  it("returns a valid URL for matches with diacritics", () => {
    const url = getFifaUrl(
      makeMatch({ homeTeam: "Côte d'Ivoire", awayTeam: "South Korea" }),
    );
    expect(() => new URL(url)).not.toThrow();
  });
});
