"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScorigamiEntry } from "@/lib/types";

type Rarity = "never" | "unique" | "veryRare" | "rare" | "common" | "veryCommon";

function getRarity(count: number, maxCount: number): Rarity {
  if (count === 0) return "never";
  if (count === 1) return "unique";
  const ratio = count / maxCount;
  if (ratio < 0.02) return "veryRare";
  if (ratio < 0.15) return "rare";
  if (ratio < 0.4) return "common";
  return "veryCommon";
}

const rarityColors: Record<Rarity, string> = {
  never: "bg-zinc-100 dark:bg-zinc-800",
  unique: "bg-amber-400 dark:bg-amber-600 text-zinc-900",
  veryRare: "bg-orange-300 dark:bg-orange-700",
  rare: "bg-blue-300 dark:bg-blue-700",
  common: "bg-blue-500 dark:bg-blue-500 text-white",
  veryCommon: "bg-blue-700 dark:bg-blue-300 text-white dark:text-zinc-900",
};

interface Props {
  grid: Map<string, ScorigamiEntry>;
  maxScore: number;
  onCellClick: (entry: ScorigamiEntry | null, low: number, high: number) => void;
}

export default function ScorigamiGrid({ grid, maxScore, onCellClick }: Props) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const t = useTranslations("grid");
  const maxCount = Math.max(...Array.from(grid.values()).map((e) => e.count));
  const displayMax = Math.min(maxScore, 10);

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-zinc-500 mb-2">{t("description")}</p>
      <table style={{ borderSpacing: "2px" }}>
        <thead>
          <tr>
            <th className="w-10 h-10 text-xs text-zinc-400" />
            {Array.from({ length: displayMax + 1 }, (_, i) => (
              <th key={i} className="w-10 h-10 text-xs font-semibold text-zinc-500">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: displayMax + 1 }, (_, row) => (
            <tr key={row}>
              <td className="w-10 h-10 text-xs font-semibold text-zinc-500 text-center">{row}</td>
              {Array.from({ length: displayMax + 1 }, (_, col) => {
                if (col < row) {
                  return (
                    <td
                      key={col}
                      className="w-10 h-10 rounded bg-zinc-200/30 dark:bg-zinc-800/30"
                    />
                  );
                }

                const key = `${row}-${col}`;
                const entry = grid.get(key);
                const count = entry?.count ?? 0;
                const rarity = getRarity(count, maxCount);
                const isHovered = hoveredCell === key;

                return (
                  <td
                    key={col}
                    className={`w-10 h-10 text-center text-xs font-medium rounded cursor-pointer transition-transform ${rarityColors[rarity]} ${
                      isHovered ? "scale-125 z-10 relative ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
                    }`}
                    onMouseEnter={() => setHoveredCell(key)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => onCellClick(entry ?? null, row, col)}
                    title={
                      count > 0
                        ? t("count", { low: row, high: col, count })
                        : t("neverHappened", { low: row, high: col })
                    }
                  >
                    {count > 0 ? count : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-700 dark:bg-blue-300" /> {t("veryCommon")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> {t("common")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 dark:bg-blue-700" /> {t("rare")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 dark:bg-orange-700" /> {t("veryRare")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 dark:bg-amber-600" /> {t("unique")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" /> {t("never")}</span>
      </div>
    </div>
  );
}
