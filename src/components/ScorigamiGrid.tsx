"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScorigamiEntry } from "@/lib/types";
import { getRarity, RARITY_CELL_CLASSES } from "@/lib/rarity";

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
      <p className="text-sm font-semibold text-stone-200 mb-2 sb-numeral text-center">{t("description")}</p>
      <table className="mx-auto" style={{ borderSpacing: "2px" }}>
        <thead>
          <tr>
            <th className="w-10 h-10 text-xs text-stone-500" />
            {Array.from({ length: displayMax + 1 }, (_, i) => (
              <th key={i} className="w-10 h-10 text-sm font-semibold text-amber-300 sb-numeral">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: displayMax + 1 }, (_, row) => (
            <tr key={row}>
              <td className="w-10 h-10 text-sm font-semibold text-amber-300 text-center sb-numeral">{row}</td>
              {Array.from({ length: displayMax + 1 }, (_, col) => {
                if (col < row) {
                  return (
                    <td key={col} className="w-10 h-10 rounded bg-[#0a100e]/40" />
                  );
                }

                const key = `${row}-${col}`;
                const entry = grid.get(key);
                const count = entry?.count ?? 0;
                const rarity = getRarity(count, maxCount);
                const isHovered = hoveredCell === key;

                const ariaLabel =
                  count > 0
                    ? t("count", { low: row, high: col, count })
                    : t("neverHappened", { low: row, high: col });

                return (
                  <td key={col} className="w-10 h-10 p-0">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                      className={`w-10 h-10 flex items-center justify-center text-xs font-medium rounded cursor-pointer transition-transform sb-numeral outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:scale-125 focus-visible:z-10 focus-visible:relative ${RARITY_CELL_CLASSES[rarity]} ${
                        isHovered ? "scale-125 z-10 relative ring-2 ring-amber-300" : ""
                      }`}
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onCellClick(entry ?? null, row, col)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onCellClick(entry ?? null, row, col);
                      }
                    }}
                      title={ariaLabel}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-stone-400 font-mono uppercase tracking-wider justify-center">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-700" /> {t("veryCommon")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-400" /> {t("common")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-stone-300" /> {t("rare")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> {t("veryRare")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500" /> {t("unique")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0a100e] border border-[#1d2825]" /> {t("never")}</span>
      </div>
    </div>
  );
}
