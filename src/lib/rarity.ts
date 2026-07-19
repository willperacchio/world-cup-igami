/**
 * Unified rarity classification system for scorigami scores.
 *
 * Used by both the heatmap grid (which needs "never") and the charts/stats
 * (which only deal with scores that have occurred at least once).
 */

export type Rarity = "never" | "unique" | "veryRare" | "rare" | "common" | "veryCommon";

/** Rarity levels that apply only to scores that have actually occurred. */
export type OccurredRarity = Exclude<Rarity, "never">;

/**
 * Classify a scoreline's rarity based on how often it's occurred relative
 * to the most common scoreline.
 *
 * Thresholds:
 * - unique: exactly 1 occurrence
 * - veryRare: < 2% of the max count, or 2–3 occurrences that are still
 *   uncommon (< 15% of max). The pure ratio test starves smaller datasets:
 *   the women's edition maxes at 64, making "2+ occurrences under 2%"
 *   impossible. The absolute rule matches the men's bucket exactly
 *   (2% of 196 = counts 2–3), so the men's grid is unchanged.
 * - rare: < 15% of the max count
 * - common: < 40% of the max count
 * - veryCommon: >= 40% of the max count
 */
export function getRarity(count: number, maxCount: number): Rarity {
  if (count === 0) return "never";
  if (count === 1) return "unique";
  const ratio = count / maxCount;
  if (ratio < 0.02 || (count <= 3 && ratio < 0.15)) return "veryRare";
  if (ratio < 0.15) return "rare";
  if (ratio < 0.4) return "common";
  return "veryCommon";
}

/**
 * Tailwind CSS classes for grid cell backgrounds.
 * Cold→hot ramp with five distinct hues:
 *   slate (cold/boring) → light slate → cream → amber → orange (hot/hero).
 */
export const RARITY_CELL_CLASSES: Record<Rarity, string> = {
  never: "bg-[#0a100e] border border-[#1d2825]",
  unique: "bg-orange-500 text-zinc-900",
  veryRare: "bg-amber-400 text-zinc-900",
  rare: "bg-stone-300 text-zinc-900",
  common: "bg-slate-400 text-zinc-900",
  veryCommon: "bg-slate-700 text-stone-300",
};

/**
 * Women's edition: the "unique" hero cell is rose instead of orange, so the
 * graphics read as the women's edition at a glance. Everything else is shared.
 */
export const RARITY_CELL_CLASSES_WOMENS: Record<Rarity, string> = {
  ...RARITY_CELL_CLASSES,
  unique: "bg-rose-500 text-zinc-900",
};

export function rarityCellClasses(womens = false): Record<Rarity, string> {
  return womens ? RARITY_CELL_CLASSES_WOMENS : RARITY_CELL_CLASSES;
}

/**
 * Static hex colors for SVG charts (can't use Tailwind dark: in SVG).
 * Mirrors the scoreboard cell palette so charts and grid feel like one system.
 */
export const RARITY_CHART_COLORS: Record<OccurredRarity, string> = {
  veryCommon: "#334155", // slate-700 (cold, "boring")
  common: "#94a3b8",     // slate-400 (cool, light)
  rare: "#d6d3d1",       // stone-300 (cream — transition)
  veryRare: "#fbbf24",   // amber-400 (gold)
  unique: "#f97316",     // orange-500 (hot — hero)
};

/** Women's edition: the "unique" hero is rose-500 instead of orange. */
export const RARITY_CHART_COLORS_WOMENS: Record<OccurredRarity, string> = {
  ...RARITY_CHART_COLORS,
  unique: "#f43f5e", // rose-500
};

export function rarityChartColors(womens = false): Record<OccurredRarity, string> {
  return womens ? RARITY_CHART_COLORS_WOMENS : RARITY_CHART_COLORS;
}

/** Get the chart hex color for a given count. */
export function getRarityChartColor(count: number, maxCount: number, womens = false): string {
  const rarity = getRarity(count, maxCount);
  if (rarity === "never") return "#1d2825"; // scoreboard "void" fallback
  return rarityChartColors(womens)[rarity];
}
