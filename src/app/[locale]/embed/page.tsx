"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { matches, summary, getScorigamiGrid, buildGridFromMatches, tournamentYears } from "@/lib/data";
import type { ScorigamiEntry } from "@/lib/types";
import { useTimelinePlayer } from "@/hooks/useTimelinePlayer";
import ScorigamiGrid from "@/components/ScorigamiGrid";
import MatchDetail from "@/components/MatchDetail";

/**
 * Minimal embeddable view: title, timeline scrubber, and the heatmap — no
 * site header, explainer, or tabs. Meant to be iframed by third parties:
 *
 *   <iframe src="https://world-cup-igami.vercel.app/en/embed" ... />
 */
export default function Embed() {
  const [selectedCell, setSelectedCell] = useState<{
    entry: ScorigamiEntry | null;
    low: number;
    high: number;
  } | null>(null);

  const timeline = useTimelinePlayer({ frameCount: tournamentYears.length });
  const t = useTranslations();
  const fullGrid = getScorigamiGrid();
  const selectedYear = tournamentYears[timeline.index];

  // Same precomputed-frames approach as the home page so Play steps evenly.
  const framesByIndex = useMemo(
    () =>
      tournamentYears.map((year) => {
        const fm = matches.filter((m) => {
          const yr = parseInt(m.tournament.replace(" FIFA Men's World Cup", ""));
          return yr <= year;
        });
        return { grid: buildGridFromMatches(fm), filteredMatches: fm };
      }),
    [],
  );

  const { grid, filteredMatches } = useMemo(() => {
    if (timeline.isAtEnd) {
      return { grid: fullGrid, filteredMatches: matches };
    }
    return framesByIndex[timeline.index];
  }, [timeline.index, timeline.isAtEnd, fullGrid, framesByIndex]);

  return (
    <div className="min-h-screen text-stone-200 px-3 py-4 max-w-3xl mx-auto space-y-4">
      <div className="text-center space-y-1.5">
        <h1 className="font-display font-medium text-xl sm:text-2xl text-stone-100">
          {t("grid.title")}
        </h1>
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-amber-300">
          {t("grid.scorigamiHint")}
        </p>
      </div>

      {/* Timeline scrubber — compact version of the home page control */}
      <div className="flex items-center gap-2 p-2.5 rounded-sm border border-amber-400/20 bg-[#161f1c]/40">
        <button
          onClick={timeline.stepBack}
          disabled={timeline.index === 0}
          className="w-7 h-7 rounded-sm border border-amber-400/30 text-amber-300 text-xs hover:border-amber-400/60 hover:text-amber-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Step back"
        >
          ◀
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={tournamentYears.length - 1}
            value={timeline.index}
            onChange={(e) => { timeline.setIndex(parseInt(e.target.value)); setSelectedCell(null); }}
            className="w-full sb-range accent-amber-300"
          />
          <div className="flex justify-between text-[10px] text-stone-500 px-0.5 sb-numeral">
            <span>{tournamentYears[0]}</span>
            <span>{tournamentYears[tournamentYears.length - 1]}</span>
          </div>
        </div>
        <button
          onClick={timeline.stepForward}
          disabled={timeline.isAtEnd}
          className="w-7 h-7 rounded-sm border border-amber-400/30 text-amber-300 text-xs hover:border-amber-400/60 hover:text-amber-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Step forward"
        >
          ▶
        </button>
        <button
          onClick={() => { timeline.togglePlay(); setSelectedCell(null); }}
          className={`px-2.5 h-7 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
            timeline.playing
              ? "bg-amber-300 text-zinc-900 border border-amber-300"
              : "border border-amber-400/30 text-amber-300 hover:border-amber-400/60 hover:text-amber-200"
          }`}
          title={timeline.playing ? "Pause" : "Play"}
        >
          {timeline.playing ? "Pause" : "Play"}
        </button>
        <span className="text-base font-display font-medium sb-numeral min-w-[4ch] text-center text-amber-200">
          {selectedYear}
        </span>
      </div>

      <ScorigamiGrid
        grid={grid}
        maxScore={summary.maxScore}
        onCellClick={(entry, low, high) => setSelectedCell({ entry, low, high })}
      />
      {selectedCell && (
        <MatchDetail
          entry={selectedCell.entry}
          allMatches={filteredMatches}
          lowScore={selectedCell.low}
          highScore={selectedCell.high}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Attribution back to the full site — the point of offering an embed */}
      <p className="text-center font-mono text-[10px] tracking-[0.1em] uppercase text-stone-500">
        <a
          href="https://world-cup-igami.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-amber-300 transition-colors underline underline-offset-2 decoration-stone-600"
        >
          World Cupigami ↗
        </a>
      </p>
    </div>
  );
}
