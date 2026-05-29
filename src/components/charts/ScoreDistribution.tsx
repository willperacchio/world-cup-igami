"use client";

import { useState } from "react";
import type { ScorigamiEntry } from "@/lib/types";
import { getRarity, RARITY_CHART_COLORS, type OccurredRarity } from "@/lib/rarity";

interface Props {
  mostCommon: ScorigamiEntry[];
  totalMatches: number;
}

// ── Treemap layout (squarified, recursive) ──

interface TreemapItem {
  label: string;
  count: number;
  color: string;
}

interface TreemapRect extends TreemapItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutTreemap(items: TreemapItem[], x: number, y: number, w: number, h: number): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, ...items[0] }];

  const totalVal = items.reduce((s, it) => s + it.count, 0);
  const isHoriz = w >= h;
  const sideLen = isHoriz ? h : w;

  // Find the best row split (minimizing worst aspect ratio)
  let best = 1;
  let bestWorst = Infinity;
  for (let i = 1; i <= items.length; i++) {
    const rowItems = items.slice(0, i);
    const rowVal = rowItems.reduce((s, it) => s + it.count, 0);
    const rowThickness = (rowVal / totalVal) * (isHoriz ? w : h);
    const worst = Math.max(
      ...rowItems.map((it) => {
        const itemLen = (it.count / rowVal) * sideLen;
        return Math.max(rowThickness / itemLen, itemLen / rowThickness);
      }),
    );
    if (worst <= bestWorst) {
      bestWorst = worst;
      best = i;
    } else break;
  }

  const rowItems = items.slice(0, best);
  const restItems = items.slice(best);
  const rowVal = rowItems.reduce((s, it) => s + it.count, 0);
  const rowThickness = (rowVal / totalVal) * (isHoriz ? w : h);

  const rects: TreemapRect[] = [];
  let offset = 0;
  for (const item of rowItems) {
    const itemLen = (item.count / rowVal) * sideLen;
    if (isHoriz) rects.push({ x, y: y + offset, w: rowThickness, h: itemLen, ...item });
    else rects.push({ x: x + offset, y, w: itemLen, h: rowThickness, ...item });
    offset += itemLen;
  }

  if (restItems.length > 0) {
    if (isHoriz) rects.push(...layoutTreemap(restItems, x + rowThickness, y, w - rowThickness, h));
    else rects.push(...layoutTreemap(restItems, x, y + rowThickness, w, h - rowThickness));
  }
  return rects;
}

// ── Donut arc math ──

function buildDonutArc(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const ox1 = cx + outerR * Math.cos(startAngle);
  const oy1 = cy + outerR * Math.sin(startAngle);
  const ox2 = cx + outerR * Math.cos(endAngle);
  const oy2 = cy + outerR * Math.sin(endAngle);
  const ix1 = cx + innerR * Math.cos(endAngle);
  const iy1 = cy + innerR * Math.sin(endAngle);
  const ix2 = cx + innerR * Math.cos(startAngle);
  const iy2 = cy + innerR * Math.sin(startAngle);
  return `M${ox1},${oy1} A${outerR},${outerR} 0 ${largeArc} 1 ${ox2},${oy2} L${ix1},${iy1} A${innerR},${innerR} 0 ${largeArc} 0 ${ix2},${iy2} Z`;
}

// ── Component ──

const RARITY_LABELS: { label: string; rarity: OccurredRarity }[] = [
  { label: "Very Common", rarity: "veryCommon" },
  { label: "Common", rarity: "common" },
  { label: "Rare", rarity: "rare" },
  { label: "Very Rare", rarity: "veryRare" },
  { label: "Unique", rarity: "unique" },
];

export default function ScoreDistribution({ mostCommon, totalMatches }: Props) {
  const [donutHover, setDonutHover] = useState<{ label: string; count: number; pct: string } | null>(null);
  const [treemapHover, setTreemapHover] = useState<{ label: string; count: number; pct: string; x: number; y: number } | null>(null);

  const maxCount = mostCommon[0]?.count ?? 1;

  // Group scores by rarity for donut slices
  const rarityGroups = RARITY_LABELS.map((rl) => ({
    ...rl,
    count: 0,
    scores: [] as string[],
    color: RARITY_CHART_COLORS[rl.rarity],
  }));
  for (const s of mostCommon) {
    const r = getRarity(s.count, maxCount);
    if (r === "never") continue;
    const group = rarityGroups.find((g) => g.rarity === r);
    if (group) {
      group.count += s.count;
      group.scores.push(`${s.highScore}–${s.lowScore}`);
    }
  }
  const donutItems = rarityGroups.filter((g) => g.count > 0);

  // Treemap items
  const treemapItems: TreemapItem[] = mostCommon.map((s) => ({
    label: `${s.highScore}–${s.lowScore}`,
    count: s.count,
    color: RARITY_CHART_COLORS[getRarity(s.count, maxCount) as OccurredRarity] ?? "#71717a",
  }));

  // Donut geometry. Pre-compute each slice's start angle without mutating a
  // captured variable inside .map() — the React Compiler immutability rule
  // forbids that pattern. Cumulative sums first, then a pure map.
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 85;
  const innerR = 50;
  const hoverR = (outerR + innerR) / 2;
  const startAngles: number[] = [];
  {
    let acc = -Math.PI / 2;
    for (const sl of donutItems) {
      startAngles.push(acc);
      acc += (sl.count / totalMatches) * 2 * Math.PI;
    }
  }
  const arcs = donutItems.map((sl, i) => {
    const angle = (sl.count / totalMatches) * 2 * Math.PI;
    const startAngle = startAngles[i];
    const endAngle = startAngle + angle;
    const midAngle = (startAngle + endAngle) / 2;
    const pct = ((sl.count / totalMatches) * 100).toFixed(1);
    return {
      path: buildDonutArc(cx, cy, outerR, innerR, startAngle, endAngle),
      ...sl,
      pct,
      hx: cx + hoverR * Math.cos(midAngle),
      hy: cy + hoverR * Math.sin(midAngle),
    };
  });

  // Treemap layout
  const tmW = 320;
  const tmH = 200;
  const rects = layoutTreemap(treemapItems, 0, 0, tmW, tmH);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 md:col-span-2 min-w-0 overflow-hidden">
      <h3 className="font-bold mb-4">Score Distribution</h3>
      <div className="flex flex-col md:grid md:grid-cols-2 gap-6 min-w-0">
        {/* Donut chart */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Donut Chart</p>
          <div className="flex items-center gap-4 min-w-0">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-36 sm:w-48 h-36 sm:h-48 shrink-0" onMouseLeave={() => setDonutHover(null)}>
              {arcs.map((a, i) => (
                <path
                  key={i}
                  d={a.path}
                  fill={a.color}
                  stroke="var(--color-zinc-900, #18181b)"
                  strokeWidth={donutHover?.label === a.label ? 2.5 : 1.5}
                  opacity={donutHover && donutHover.label !== a.label ? 0.4 : 1}
                  onMouseEnter={() => setDonutHover({ label: a.label, count: a.count, pct: a.pct })}
                  onMouseLeave={() => setDonutHover(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
              ))}
              {donutHover ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="currentColor">{donutHover.label}</text>
                  <text x={cx} y={cy + 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>{donutHover.count} matches</text>
                  <text x={cx} y={cy + 18} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>({donutHover.pct}%)</text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight="bold" fill="currentColor">{totalMatches}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.5}>matches</text>
                </>
              )}
            </svg>
            <div className="flex flex-col gap-1.5 text-xs min-w-0 overflow-hidden">
              {arcs.map((a, i) => (
                <div
                  key={i}
                  className="rounded px-1.5 py-1"
                  style={{ opacity: donutHover && donutHover.label !== a.label ? 0.4 : 1, transition: "opacity 0.15s", cursor: "pointer" }}
                  onMouseEnter={() => setDonutHover({ label: a.label, count: a.count, pct: a.pct })}
                  onMouseLeave={() => setDonutHover(null)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="font-bold">{a.label}</span>
                    <span className="text-zinc-400">{a.pct}%</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 ms-5 mt-0.5">{a.scores.join(", ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Treemap */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Treemap</p>
          <svg viewBox={`0 0 ${tmW} ${tmH}`} className="w-full" style={{ height: 220 }} onMouseLeave={() => setTreemapHover(null)}>
            {rects.map((r, i) => (
              <g key={i}>
                <rect
                  x={r.x + 1} y={r.y + 1}
                  width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)}
                  rx={3} fill={r.color}
                  opacity={treemapHover && treemapHover.label !== r.label ? 0.35 : 0.85}
                  stroke={treemapHover?.label === r.label ? "white" : "none"}
                  strokeWidth={treemapHover?.label === r.label ? 2 : 0}
                  onMouseEnter={() => setTreemapHover({ label: r.label, count: r.count, pct: ((r.count / totalMatches) * 100).toFixed(1), x: r.x + r.w / 2, y: r.y + r.h / 2 })}
                  onMouseLeave={() => setTreemapHover(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
                {r.w > 30 && r.h > 18 && (
                  <>
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 3} textAnchor="middle" fontSize={r.w > 50 ? 12 : 9} fontWeight="bold" fill="white" pointerEvents="none">{r.label}</text>
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10} textAnchor="middle" fontSize={r.w > 50 ? 9 : 7} fill="white" opacity={0.7} pointerEvents="none">{r.count}×</text>
                  </>
                )}
              </g>
            ))}
            {treemapHover && (() => {
              const text = `${treemapHover.label}: ${treemapHover.count}× (${treemapHover.pct}%)`;
              const tw = text.length * 5.5 + 14;
              const th = 18;
              const tx = Math.max(1, Math.min(treemapHover.x - tw / 2, tmW - tw - 1));
              const ty = Math.max(1, treemapHover.y - th - 8);
              return (
                <g pointerEvents="none">
                  <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#18181b" opacity={0.95} stroke="white" strokeWidth={0.5} />
                  <text x={tx + tw / 2} y={ty + th / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="white" fontWeight="bold">{text}</text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </section>
  );
}
