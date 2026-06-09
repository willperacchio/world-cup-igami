"use client";

import { useState } from "react";

interface Props {
  goalDistribution: { totalGoals: number; count: number }[];
  totalMatches: number;
  title: string;
  description: string;
  footnote: string;
}

export default function GoalDistributionHistogram({
  goalDistribution,
  totalMatches,
  title,
  description,
  footnote,
}: Props) {
  const [hovered, setHovered] = useState<{
    totalGoals: number;
    count: number;
    pct: string;
    x: number;
    y: number;
  } | null>(null);

  const maxCount = Math.max(...goalDistribution.map((d) => d.count));
  const maxBucket = goalDistribution[goalDistribution.length - 1]?.totalGoals ?? 12;

  // Layout
  const w = 340;
  const h = 180;
  const pad = { top: 20, bottom: 28, left: 10, right: 10 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const barCount = goalDistribution.length;
  const barGap = 4;
  const barW = (plotW - barGap * (barCount - 1)) / barCount;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 mb-3">{description}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 220 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="histBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#b8932f" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={pad.left} y1={pad.top + plotH}
          x2={w - pad.right} y2={pad.top + plotH}
          stroke="currentColor" strokeOpacity={0.15}
        />

        {goalDistribution.map((d, i) => {
          const barH = maxCount > 0 ? (d.count / maxCount) * plotH : 0;
          const x = pad.left + i * (barW + barGap);
          const y = pad.top + plotH - barH;
          const pct = ((d.count / totalMatches) * 100).toFixed(1);
          const isHovered = hovered?.totalGoals === d.totalGoals;
          const label = d.totalGoals === maxBucket ? `${maxBucket}+` : `${d.totalGoals}`;

          return (
            <g key={d.totalGoals}>
              <rect
                x={x} y={y} width={barW} height={barH} rx={3}
                fill="url(#histBarGrad)"
                opacity={hovered && !isHovered ? 0.4 : 0.85}
                stroke={isHovered ? "#fcd34d" : "none"}
                strokeWidth={isHovered ? 1.5 : 0}
                style={{ transition: "opacity 0.15s" }}
              />
              {barH > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="currentColor" opacity={isHovered ? 1 : 0.6}>
                  {d.count}
                </text>
              )}
              <text x={x + barW / 2} y={pad.top + plotH + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
                {label}
              </text>
              {/* Hit target */}
              <rect
                x={x - 2} y={pad.top} width={barW + 4} height={plotH + 4}
                fill="transparent"
                onMouseEnter={() => setHovered({ totalGoals: d.totalGoals, count: d.count, pct, x: x + barW / 2, y })}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && (() => {
          const label = hovered.totalGoals === maxBucket ? `${maxBucket}+` : `${hovered.totalGoals}`;
          const text = `${label} goals: ${hovered.count} matches (${hovered.pct}%)`;
          const tw = text.length * 5.5 + 14;
          const th = 18;
          const tx = Math.max(1, Math.min(hovered.x - tw / 2, w - pad.right - tw));
          const ty = Math.max(1, hovered.y - th - 8);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#0e1714" opacity={0.95} stroke="#fcd34d" strokeWidth={0.5} />
              <text x={tx + tw / 2} y={ty + th / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="white" fontWeight="bold">{text}</text>
            </g>
          );
        })()}
      </svg>
      <p className="text-xs text-zinc-400 mt-1 text-center">{footnote}</p>
    </section>
  );
}
