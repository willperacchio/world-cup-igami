"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { matches, scorigami, summary, getScorigamiGrid } from "@/lib/data";
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

  const t = useTranslations();
  const grid = getScorigamiGrid();
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
          <div><span className="font-bold">{summary.totalMatches}</span> {t("stats.matches")}</div>
          <div><span className="font-bold">{summary.uniqueScores}</span> {t("stats.uniqueScores")}</div>
          <div><span className="font-bold">{neverHappened}</span> {t("stats.neverHappened")}</div>
          <div>{summary.dateRange.first.slice(0, 4)}–{summary.dateRange.last.slice(0, 4)}</div>
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
                allMatches={matches}
                lowScore={selectedCell.low}
                highScore={selectedCell.high}
                onClose={() => setSelectedCell(null)}
              />
            )}
          </div>
        )}

        {view === "table" && <MatchTable matches={matches} />}

        {view === "facts" && <FunFacts matches={matches} scorigami={scorigami} />}

        <footer className="pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
          <div>
            {t("footer.dataFrom")}{" "}
            <a href="https://github.com/jfjelstul/worldcup" className="underline" target="_blank" rel="noopener noreferrer">
              {t("footer.dataSource")}
            </a>{" "}
            {t("footer.author")}
          </div>
          <a
            href="https://www.buymeacoffee.com/wap_"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "#FFDD00", color: "#000000", fontFamily: "Cookie, cursive" }}
          >
            <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="" className="h-4 w-4" />
            Buy me a coffee
          </a>
        </footer>
      </main>
    </div>
  );
}
