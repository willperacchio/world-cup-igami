import { describe, it, expect } from "vitest";
import { getFlagSrc } from "../flags";

describe("getFlagSrc", () => {
  it("returns default flag path when no year provided", () => {
    expect(getFlagSrc("BRA")).toBe("/flags/BRA.svg");
  });

  it("returns default flag path when no override applies", () => {
    expect(getFlagSrc("BRA", 2022)).toBe("/flags/BRA.svg");
  });

  it("returns historical flag for IRN before 1980", () => {
    expect(getFlagSrc("IRN", 1978)).toBe("/flags/IRN_1978.svg");
  });

  it("returns modern flag for IRN at/after 1980", () => {
    expect(getFlagSrc("IRN", 1980)).toBe("/flags/IRN.svg");
    expect(getFlagSrc("IRN", 2022)).toBe("/flags/IRN.svg");
  });

  it("returns historical flag for DEU before 1945", () => {
    expect(getFlagSrc("DEU", 1934)).toBe("/flags/DEU_1934.svg");
  });

  it("returns modern flag for DEU at/after 1945", () => {
    expect(getFlagSrc("DEU", 1954)).toBe("/flags/DEU.svg");
  });

  it("handles 'after' override for COD", () => {
    expect(getFlagSrc("COD", 1997)).toBe("/flags/COD_2026.svg");
    expect(getFlagSrc("COD", 2022)).toBe("/flags/COD_2026.svg");
    expect(getFlagSrc("COD", 1990)).toBe("/flags/COD.svg");
  });

  it("returns default for unknown country codes", () => {
    expect(getFlagSrc("XYZ", 2022)).toBe("/flags/XYZ.svg");
  });
});
