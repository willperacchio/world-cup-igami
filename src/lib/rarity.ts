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
 * - veryRare: < 2% of the max count
 * - rare: < 15% of the max count
 * - common: < 40% of the max count
 * - veryCommon: >= 40% of the max count
 */
export function getRarity(count: number, maxCount: number): Rarity {
  if (count === 0) return "never";
  if (count === 1) return "unique";
  const ratio = count / maxCount;
  if (ratio < 0.02) return "veryRare";
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

/** Get the chart hex color for a given count. */
export function getRarityChartColor(count: number, maxCount: number): string {
  const rarity = getRarity(count, maxCount);
  if (rarity === "never") return "#1d2825"; // scoreboard "void" fallback
  return RARITY_CHART_COLORS[rarity];
}
