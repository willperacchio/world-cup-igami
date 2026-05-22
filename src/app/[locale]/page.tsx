"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { matches, scorigami, summary, getScorigamiGrid, buildGridFromMatches, tournamentYears } from "@/lib/data";
import type { ScorigamiEntry } from "@/lib/types";
import ScorigamiGrid from "@/components/ScorigamiGrid";
import MatchTable from "@/components/MatchTable";
import MatchDetail from "@/components/MatchDetail";
import FunFacts from "@/components/FunFacts";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type View = "grid" | "table" | "facts";

export default function Home() {
  const [view, setView] = useState<View>("grid");
  const [selectedCell, setSelectedCell] = useState<{
    entry: ScorigamiEntry | null;
    low: number;
    high: number;
  } | null>(null);
  const [yearIndex, setYearIndex] = useState(tournamentYears.length - 1);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const indexRef = useRef(yearIndex);

  useEffect(() => { indexRef.current = yearIndex; }, [yearIndex]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    if (!playing) return;
    if (yearIndex === tournamentYears.length - 1) {
      setYearIndex(0);
      setSelectedCell(null);
    }
    const id = setInterval(() => {
      if (indexRef.current >= tournamentYears.length - 1) {
        setPlaying(false);
        return;
      }
      setYearIndex((i) => i + 1);
      setSelectedCell(null);
    }, 1200);
    return () => clearInterval(id);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const t = useTranslations();
  const fullGrid = getScorigamiGrid();

  const selectedYear = tournamentYears[yearIndex];
  const isLatest = yearIndex === tournamentYears.length - 1;

  const { grid, filteredMatches, filteredStats } = useMemo(() => {
    if (isLatest) {
      return { grid: fullGrid, filteredMatches: matches, filteredStats: { total: summary.totalMatches, unique: summary.uniqueScores } };
    }
    const fm = matches.filter((m) => {
      const yr = parseInt(m.tournament.replace(" FIFA Men's World Cup", ""));
      return yr <= selectedYear;
    });
    const g = buildGridFromMatches(fm);
    return { grid: g, filteredMatches: fm, filteredStats: { total: fm.length, unique: g.size } };
  }, [selectedYear, isLatest, fullGrid]);

  const displayMax = Math.min(summary.maxScore, 10);
  const totalPossible = ((displayMax + 1) * (displayMax + 2)) / 2;
  const neverHappened = totalPossible - summary.uniqueScores;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-6 max-w-5xl mx-auto flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("header.title")}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t("header.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("explainer.title")}</h2>
          <p>
            {t("explainer.description")}{" "}
            <a
              href="https://www.youtube.com/watch?v=9l5C8cGMueY"
              className="underline text-blue-600 dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("explainer.watchVideo")}
            </a>
          </p>
          <p>{t("explainer.whyBuilt")}</p>
          <p className="text-xs italic">{t("explainer.mensOnly")}</p>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 pt-2">{t("explainer.pointTitle")}</h2>
          <p>{t("explainer.pointDescription")}</p>
        </section>

        <div className="flex gap-6 text-sm">
          <div><span className="font-bold">{filteredStats.total}</span> {t("stats.matches")}</div>
          <div><span className="font-bold">{filteredStats.unique}</span> {t("stats.uniqueScores")}</div>
          <div><span className="font-bold">{totalPossible - filteredStats.unique}</span> {t("stats.neverHappened")}</div>
          <div>{summary.dateRange.first.slice(0, 4)}–{isLatest ? summary.dateRange.last.slice(0, 4) : selectedYear}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              view === "grid"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {t("views.heatmap")}
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              view === "table"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {t("views.allMatches")}
          </button>
          <button
            onClick={() => setView("facts")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              view === "facts"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {t("views.funFacts")}
          </button>
        </div>

        {view === "grid" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setPlaying(false); setYearIndex(Math.max(0, yearIndex - 1)); }}
                disabled={yearIndex === 0}
                className="px-2 py-1 rounded text-sm font-medium bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30"
              >
                ◀
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={tournamentYears.length - 1}
                  value={yearIndex}
                  onChange={(e) => { setPlaying(false); setYearIndex(parseInt(e.target.value)); setSelectedCell(null); }}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 px-0.5">
                  {tournamentYears.map((yr, i) => (
                    <span key={yr} className={`${i === yearIndex ? "text-amber-500 font-bold" : ""} ${i !== 0 && i !== tournamentYears.length - 1 && i !== yearIndex ? "hidden sm:inline" : ""}`}>
                      {i === yearIndex || i === 0 || i === tournamentYears.length - 1 ? yr : "·"}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setPlaying(false); setYearIndex(Math.min(tournamentYears.length - 1, yearIndex + 1)); }}
                disabled={yearIndex === tournamentYears.length - 1}
                className="px-2 py-1 rounded text-sm font-medium bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30"
              >
                ▶
              </button>
              <button
                onClick={togglePlay}
                className={`px-2.5 py-1 rounded text-sm font-medium ${
                  playing
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? "⏸" : "▶️"}
              </button>
              <span className="text-sm font-bold min-w-[4ch] text-center">{selectedYear}</span>
            </div>
            <ScorigamiGrid
              grid={grid}
              maxScore={summary.maxScore}
              onCellClick={(entry, low, high) =>
                setSelectedCell({ entry, low, high })
              }
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
          </div>
        )}

        {view === "table" && <MatchTable matches={matches} scorigami={scorigami} />}

        {view === "facts" && <FunFacts matches={matches} scorigami={scorigami} />}

        <footer className="pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 space-y-4">
          <div>
            {t("footer.dataFrom")}{" "}
            <a href="https://github.com/jfjelstul/worldcup" className="underline" target="_blank" rel="noopener noreferrer">
              {t("footer.dataSource")}
            </a>{" "}
            {t("footer.author")}
          </div>
          <div className="flex justify-center">
            <a
              href="https://www.buymeacoffee.com/wap_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "#FFDD00", color: "#000000", fontFamily: "Lato, sans-serif" }}
            >
              <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="" className="h-4 w-4" />
              Buy me a coffee (I am a grad student - anything appreciated!)
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
