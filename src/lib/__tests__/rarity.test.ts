import { describe, it, expect } from "vitest";
import { getRarity, getRarityChartColor, RARITY_CHART_COLORS, RARITY_CELL_CLASSES } from "../rarity";

describe("getRarity", () => {
  it('returns "never" for count 0', () => {
    expect(getRarity(0, 100)).toBe("never");
  });

  it('returns "unique" for count 1 regardless of maxCount', () => {
    expect(getRarity(1, 1)).toBe("unique");
    expect(getRarity(1, 1000)).toBe("unique");
  });

  it('returns "veryRare" for ratio < 0.02', () => {
    // 1.9% of 100
    expect(getRarity(2, 200)).toBe("veryRare");
  });

  it('returns "rare" for ratio >= 0.02 and < 0.15', () => {
    expect(getRarity(10, 100)).toBe("rare");
    expect(getRarity(14, 100)).toBe("rare");
  });

  it('returns "common" for ratio >= 0.15 and < 0.4', () => {
    expect(getRarity(20, 100)).toBe("common");
    expect(getRarity(39, 100)).toBe("common");
  });

  it('returns "veryCommon" for ratio >= 0.4', () => {
    expect(getRarity(40, 100)).toBe("veryCommon");
    expect(getRarity(100, 100)).toBe("veryCommon");
  });

  it("handles boundary at 0.02 (exact threshold goes to rare)", () => {
    // ratio = 2/100 = 0.02 → not < 0.02, so "rare"
    expect(getRarity(2, 100)).toBe("rare");
  });

  it("handles boundary at 0.15 (exact threshold goes to common)", () => {
    expect(getRarity(15, 100)).toBe("common");
  });

  it("handles boundary at 0.4 (exact threshold goes to veryCommon)", () => {
    expect(getRarity(40, 100)).toBe("veryCommon");
  });
});

describe("getRarityChartColor", () => {
  it("returns a valid hex color for occurred scores", () => {
    const color = getRarityChartColor(50, 100);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns unique color for count=1", () => {
    expect(getRarityChartColor(1, 100)).toBe(RARITY_CHART_COLORS.unique);
  });

  it("returns scoreboard 'void' fallback for count=0", () => {
    expect(getRarityChartColor(0, 100)).toBe("#1d2825");
  });
});

describe("RARITY_CELL_CLASSES", () => {
  it("has a CSS class string for every rarity level", () => {
    const rarities = ["never", "unique", "veryRare", "rare", "common", "veryCommon"] as const;
    for (const r of rarities) {
      expect(RARITY_CELL_CLASSES[r]).toBeDefined();
      expect(typeof RARITY_CELL_CLASSES[r]).toBe("string");
      expect(RARITY_CELL_CLASSES[r].length).toBeGreaterThan(0);
    }
  });
});
