"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { ScorigamiEntry } from "@/lib/types";
import { getRarity, rarityCellClasses } from "@/lib/rarity";

interface BurstBall {
  id: number;
  dx: number;
  dy: number;
  dur: number;
  delay: number;
  size: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  balls: BurstBall[];
}

interface Props {
  grid: Map<string, ScorigamiEntry>;
  maxScore: number;
  onCellClick: (entry: ScorigamiEntry | null, low: number, high: number) => void;
  /** Women's edition: "unique" cells render rose instead of orange. */
  womens?: boolean;
  /** `${low}-${high}` cell to spotlight with a pulse — the most-recent scorigami. */
  highlightKey?: string | null;
}

export default function ScorigamiGrid({ grid, maxScore, onCellClick, womens = false, highlightKey = null }: Props) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const lastBurstAtRef = useRef(0);
  const t = useTranslations("grid");

  // Celebration flourish: hovering (or focusing) the most-recent scorigami
  // cell fires a burst of soccer balls from the cell. Portaled to <body> so
  // the grid's scroll container can't clip it; throttled so wiggling the
  // cursor doesn't spam; skipped entirely for reduced-motion users.
  function spawnBurst(el: HTMLElement) {
    const now = performance.now();
    if (now - lastBurstAtRef.current < 700) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lastBurstAtRef.current = now;

    const rect = el.getBoundingClientRect();
    const id = ++burstIdRef.current;
    const balls: BurstBall[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 55 + Math.random() * 75;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        // Slight downward bias so the balls feel like they drop back to earth.
        dy: Math.sin(angle) * dist + 25 + Math.random() * 30,
        dur: 0.7 + Math.random() * 0.4,
        delay: Math.random() * 0.1,
        size: 13 + Math.random() * 9,
      };
    });
    setBursts((prev) => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, balls }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1400);
  }
  const cellClasses = rarityCellClasses(womens);
  const maxCount = Math.max(...Array.from(grid.values()).map((e) => e.count));
  // Show the full score range for the dataset (men's tops out at 10; the
  // women's edition needs 13 for USA 13–0 Thailand, 2019).
  const displayMax = maxScore;

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
                // Lower-left triangle: losing score > winning score is
                // impossible, so render plain background — visually distinct
                // from "never" cells, which are possible but haven't happened.
                if (col < row) {
                  return <td key={col} className="w-10 h-10" />;
                }

                const key = `${row}-${col}`;
                const entry = grid.get(key);
                const count = entry?.count ?? 0;
                const rarity = getRarity(count, maxCount);
                const isHovered = hoveredCell === key;
                const isHighlighted = highlightKey === key && count > 0;

                const ariaLabel =
                  count > 0
                    ? t("count", { low: row, high: col, count })
                    : t("neverHappened", { low: row, high: col });

                return (
                  <td key={col} className="w-10 h-10 p-0">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={isHighlighted ? `${ariaLabel} — most recent scorigami` : ariaLabel}
                      className={`w-10 h-10 flex items-center justify-center text-xs font-medium rounded cursor-pointer transition-transform sb-numeral outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:scale-125 focus-visible:z-10 focus-visible:relative ${cellClasses[rarity]} ${
                        isHighlighted ? "sb-pulse" : ""
                      } ${
                        isHovered ? "scale-125 z-10 relative ring-2 ring-amber-300" : ""
                      }`}
                      onMouseEnter={(e) => {
                        setHoveredCell(key);
                        if (isHighlighted) spawnBurst(e.currentTarget);
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      onFocus={(e) => {
                        if (isHighlighted) spawnBurst(e.currentTarget);
                      }}
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
        <span className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${womens ? "bg-rose-500" : "bg-orange-500"}`} /> {t("unique")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0a100e] border border-[#1d2825]" /> {t("never")}</span>
      </div>
      {/* Soccer-ball bursts — portaled so no scroll container clips them. */}
      {bursts.length > 0 &&
        createPortal(
          <>
            {bursts.flatMap((burst) =>
              burst.balls.map((ball) => (
                <span
                  key={`${burst.id}-${ball.id}`}
                  aria-hidden
                  className="sb-ball"
                  style={{
                    left: burst.x,
                    top: burst.y,
                    fontSize: ball.size,
                    "--dx": `${ball.dx}px`,
                    "--dy": `${ball.dy}px`,
                    "--dur": `${ball.dur}s`,
                    "--delay": `${ball.delay}s`,
                  } as React.CSSProperties}
                >
                  ⚽
                </span>
              )),
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
