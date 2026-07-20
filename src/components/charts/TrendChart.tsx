"use client";

import { useState } from "react";
import type { TournamentStats } from "@/lib/stats";

// ── Annotation types ──

interface PointAnnotation {
  type?: "point";
  year: number;
  text: string;
  anchor?: "start" | "end" | "middle";
  dy?: number;
}

interface SpanAnnotation {
  type: "span";
  fromYear: number;
  toYear: number;
  text: string;
}

type Annotation = PointAnnotation | SpanAnnotation;

/** Per-edition chart configuration: year range, annotations, projections. */
export interface TrendEditionConfig {
  minYear: number;
  maxYear: number;
  /** X-axis year labels. */
  labelYears: number[];
  /** Shade the WWII gap (men's edition only — women's starts in 1991). */
  showWWII: boolean;
  /**
   * Known full-size point for an UPCOMING tournament, appended as a dashed
   * projection on the teams/matches charts (and excluded from the GPG /
   * scorigamis charts, which aren't meaningful until it's played). Omit once
   * the tournament is complete so its real data plots as a solid point.
   */
  projection?: { year: string; teams: number; matches: number };
  annotations: Record<string, Annotation[]>;
}

// The 2026 men's tournament is complete, so it plots as real data (solid) on
// every chart — no projection placeholder, and its new scorigami is included.
export const MENS_TREND_CONFIG: TrendEditionConfig = {
  minYear: 1930,
  maxYear: 2026,
  labelYears: [1930, 1950, 1970, 1990, 2010, 2026],
  showWWII: true,
  annotations: {
    teams: [
      { year: 1982, text: "→ 24 teams", anchor: "start", dy: -6 },
      { year: 1998, text: "→ 32 teams", anchor: "start", dy: -6 },
      { year: 2026, text: "→ 48 teams", anchor: "end", dy: -6 },
    ],
    matches: [
      { year: 1982, text: "52 games", anchor: "start", dy: -6 },
      { year: 1998, text: "64 games", anchor: "start", dy: -6 },
      { year: 2026, text: "104 games", anchor: "end", dy: -6 },
    ],
    goalsPerGame: [
      { year: 1954, text: "5.38 GPG", anchor: "start", dy: -6 },
      { year: 2026, text: "2.96 GPG", anchor: "end", dy: -6 },
    ],
    scorigamis: [
      { year: 1930, text: "1st WC: 9 new", anchor: "start", dy: -6 },
      { year: 1954, text: "8 new scores", anchor: "start", dy: -6 },
      { year: 1982, text: "1 new", anchor: "start", dy: -6 },
      { year: 2026, text: "1 new", anchor: "end", dy: -6 },
      { type: "span", fromYear: 1986, toYear: 2018, text: "The Great Drought-igami" },
    ],
  },
};

export const WOMENS_TREND_CONFIG: TrendEditionConfig = {
  minYear: 1991,
  maxYear: 2027,
  labelYears: [1991, 2003, 2015, 2027],
  showWWII: false,
  projection: { year: "2027", teams: 32, matches: 64 },
  annotations: {
    teams: [
      { year: 1991, text: "12 teams", anchor: "start", dy: -6 },
      { year: 1999, text: "→ 16 teams", anchor: "start", dy: -6 },
      { year: 2015, text: "→ 24 teams", anchor: "start", dy: -6 },
      { year: 2023, text: "→ 32 teams", anchor: "end", dy: -6 },
    ],
    matches: [
      { year: 1991, text: "26 games", anchor: "start", dy: -6 },
      { year: 2015, text: "52 games", anchor: "start", dy: -6 },
      { year: 2023, text: "64 games", anchor: "end", dy: -6 },
    ],
    goalsPerGame: [
      { year: 1999, text: "3.84 GPG", anchor: "start", dy: -6 },
      { year: 2023, text: "2.56 GPG", anchor: "end", dy: -6 },
    ],
    scorigamis: [
      { year: 1991, text: "1st WC: 12 new", anchor: "start", dy: -6 },
      { year: 2019, text: "13–0 lands here", anchor: "end", dy: -6 },
    ],
  },
};

// ── Component ──

interface TrendChartProps {
  chartKey: "teams" | "matches" | "goalsPerGame" | "scorigamis";
  label: string;
  color: string;
  tournamentStats: TournamentStats[];
  /** Edition-specific range/annotations/projection. Defaults to men's. */
  config?: TrendEditionConfig;
}

export default function TrendChart({ chartKey, label, color, tournamentStats, config = MENS_TREND_CONFIG }: TrendChartProps) {
  const [hovered, setHovered] = useState<{ x: number; y: number; val: number; year: string } | null>(null);

  const projection = config.projection;
  const projYear = projection?.year ?? null;

  // For an upcoming tournament (projection set), drop any partial real entry
  // for it and plot the known full-tournament size as a dashed projection.
  // For a completed tournament (no projection), plot its real data as-is.
  const allWithGaps = projection
    ? [
        ...tournamentStats.filter((s) => s.year !== projYear),
        { year: projection.year, teams: projection.teams, matches: projection.matches, goalsPerGame: 0, scorigamis: 0 },
      ]
    : tournamentStats;
  const minYear = config.minYear;
  const maxYear = config.maxYear;
  const yearRange = maxYear - minYear;

  const dataPoints = allWithGaps.filter(
    (s) => s.year !== projYear || chartKey === "teams" || chartKey === "matches",
  );

  const values = dataPoints.map((s) => s[chartKey]);
  const rawMax = Math.max(...values);
  const max = rawMax * 1.15; // 15% breathing room
  const range = max || 1;

  const annotations = config.annotations[chartKey] || [];
  const hasSpan = annotations.some((a) => a.type === "span");

  // Layout
  const w = 340;
  const h = hasSpan ? 138 : 120;
  const pad = { top: 12, bottom: hasSpan ? 40 : 22, left: 8, right: 30 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const yearToX = (year: number) => pad.left + ((year - minYear) / yearRange) * plotW;
  const valToY = (val: number) => pad.top + plotH - (val / range) * plotH;

  const points = dataPoints.map((s) => {
    const yr = parseInt(s.year);
    return { x: yearToX(yr), y: valToY(s[chartKey]), val: s[chartKey], year: s.year, isProjection: s.year === projYear };
  });

  const realPoints = points.filter((p) => !p.isProjection);
  const point2026 = points.find((p) => p.isProjection);

  // Split line path at WWII gap (1938–1950) — men's edition only; the women's
  // tournament started in 1991 so its line never splits.
  const preWar = config.showWWII ? realPoints.filter((p) => parseInt(p.year) <= 1938) : [];
  const postWar = config.showWWII ? realPoints.filter((p) => parseInt(p.year) >= 1950) : realPoints;
  const toPath = (pts: typeof realPoints) =>
    pts.length > 0 ? pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") : "";

  const labelYears = config.labelYears;
  const wwiiX1 = yearToX(1940);
  const wwiiX2 = yearToX(1948);

  const gridLines = [0, 0.5, 1].map((frac) => ({
    frac,
    yPos: pad.top + plotH - frac * plotH,
    val: frac * range,
  }));

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: hasSpan ? 160 : 140 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {gridLines.map(({ frac, yPos, val }) => (
          <g key={frac}>
            <line x1={pad.left} y1={yPos} x2={w - pad.right} y2={yPos} stroke="currentColor" strokeOpacity={0.1} />
            <text x={w - pad.right + 3} y={yPos + 3} fontSize={7} fill="currentColor" opacity={0.4}>
              {chartKey === "goalsPerGame" ? val.toFixed(1) : Math.round(val)}
            </text>
          </g>
        ))}

        {/* WWII shaded region (men's edition only) */}
        {config.showWWII && (
          <>
            <rect x={wwiiX1 - 1} y={pad.top} width={wwiiX2 - wwiiX1 + 2} height={plotH} fill="currentColor" opacity={0.03} />
            <line x1={wwiiX1} y1={pad.top} x2={wwiiX1} y2={pad.top + plotH} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
            <line x1={wwiiX2} y1={pad.top} x2={wwiiX2} y2={pad.top + plotH} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
            <text x={(wwiiX1 + wwiiX2) / 2} y={pad.top + plotH / 2 + 2} textAnchor="middle" fontSize={5} fill="currentColor" opacity={0.25}>WWII</text>
          </>
        )}

        {/* Data lines — split at WWII with dashed connector */}
        {toPath(preWar) && <path d={toPath(preWar)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
        {preWar.length > 0 && postWar.length > 0 && (
          <line
            x1={preWar[preWar.length - 1].x} y1={preWar[preWar.length - 1].y}
            x2={postWar[0].x} y2={postWar[0].y}
            stroke={color} strokeWidth={1.5} strokeOpacity={0.35} strokeDasharray="4,3"
          />
        )}
        {toPath(postWar) && <path d={toPath(postWar)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}

        {/* Data points */}
        {realPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered?.year === p.year ? 4 : 2} fill={color} className="transition-all duration-100" />
        ))}

        {/* Annotations */}
        {annotations.map((ann, ai) => {
          if (ann.type === "span") {
            const x1 = yearToX(ann.fromYear);
            const x2 = yearToX(ann.toYear);
            const xMid = (x1 + x2) / 2;
            const bracketY = pad.top + plotH + 10;
            const textW = ann.text.length * 4.5 + 10;
            return (
              <g key={`span-${ai}`}>
                <line x1={x1} y1={bracketY - 4} x2={x1} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                <line x1={x1} y1={bracketY} x2={x2} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                <line x1={x2} y1={bracketY - 4} x2={x2} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                <rect x={xMid - textW / 2} y={bracketY + 1} width={textW} height={12} rx={2} fill="var(--color-zinc-900, #18181b)" fillOpacity={0.7} />
                <text x={xMid} y={bracketY + 10} textAnchor="middle" fontSize={7.5} fill={color} fontWeight="600" fontStyle="italic" opacity={0.85}>{ann.text}</text>
              </g>
            );
          }
          const pt = points.find((p) => parseInt(p.year) === ann.year);
          if (!pt) return null;
          const ax = pt.x;
          const ay = pt.y + (ann.dy ?? -6);
          const textW = ann.text.length * 5.2 + 8;
          const bgX = ann.anchor === "end" ? ax - textW : ann.anchor === "start" ? ax : ax - textW / 2;
          return (
            <g key={`ann-${ann.year}`}>
              <line x1={ax} y1={ay} x2={ax} y2={pt.y - 3} stroke={color} strokeWidth={0.8} strokeOpacity={0.6} />
              <polygon points={`${ax},${pt.y - 2} ${ax - 1.5},${pt.y - 8} ${ax + 1.5},${pt.y - 8}`} fill={color} opacity={0.6} />
              <rect x={bgX} y={ay - 14} width={textW} height={13} rx={2} fill="var(--color-zinc-900, #18181b)" fillOpacity={0.7} />
              <text
                x={ann.anchor === "end" ? ax - 3 : ann.anchor === "start" ? ax + 3 : ax}
                y={ay - 5}
                textAnchor={ann.anchor ?? "middle"}
                fontSize={8.5} fill={color} fontWeight="600" opacity={0.9}
              >{ann.text}</text>
            </g>
          );
        })}

        {/* Hover targets */}
        {realPoints.map((p, i) => (
          <circle
            key={`hit-${i}`} cx={p.x} cy={p.y} r={8} fill="transparent"
            onMouseEnter={() => setHovered(p)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {/* 2026 projected point + dashed connector from last real point */}
        {point2026 && realPoints.length > 0 && (
          <>
            <line
              x1={realPoints[realPoints.length - 1].x} y1={realPoints[realPoints.length - 1].y}
              x2={point2026.x} y2={point2026.y}
              stroke={color} strokeWidth={1.5} strokeOpacity={0.35} strokeDasharray="4,3"
            />
            <circle cx={point2026.x} cy={point2026.y} r={3} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
          </>
        )}

        {/* Hover tooltip */}
        {hovered && (() => {
          const displayVal = chartKey === "goalsPerGame" ? hovered.val.toFixed(2) : hovered.val;
          const text = `${hovered.year}: ${displayVal}`;
          const textWidth = text.length * 6.5 + 14;
          const tooltipH = 18;
          const tooltipX = Math.max(pad.left, Math.min(hovered.x - textWidth / 2, w - pad.right - textWidth));
          const tooltipY = hovered.y - 22;
          return (
            <g>
              <line x1={hovered.x} y1={hovered.y} x2={hovered.x} y2={pad.top + plotH} stroke={color} strokeOpacity={0.3} strokeDasharray="2,2" />
              <rect x={tooltipX} y={tooltipY - 2} width={textWidth} height={tooltipH} rx={4} fill="var(--color-zinc-800, #27272a)" stroke={color} strokeWidth={0.5} opacity={0.95} />
              <text x={tooltipX + textWidth / 2} y={tooltipY + tooltipH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fontWeight="bold">{text}</text>
            </g>
          );
        })()}

        {/* Year labels */}
        {labelYears.map((yr) => (
          <text key={yr} x={yearToX(yr)} y={h - 4} textAnchor="middle" fontSize={7} fill="currentColor" opacity={0.4}>{yr}</text>
        ))}
      </svg>
    </div>
  );
}
