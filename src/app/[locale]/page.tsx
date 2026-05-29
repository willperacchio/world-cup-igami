"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { matches, scorigami, summary, getScorigamiGrid, buildGridFromMatches, tournamentYears } from "@/lib/data";
import { getUpcomingTournamentStatus } from "@/lib/tournament";
import type { ScorigamiEntry } from "@/lib/types";
import { useTimelinePlayer } from "@/hooks/useTimelinePlayer";
import ScorigamiGrid from "@/components/ScorigamiGrid";
import MatchTable from "@/components/MatchTable";
import MatchDetail from "@/components/MatchDetail";
import FunFacts from "@/components/FunFacts";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Footer from "@/components/Footer";

// Pre-computed once at module load: every year that has at least one historical
// match in the dataset. Used to decide whether a scrubber position points at
// an upcoming-but-not-yet-started tournament.
const HISTORICAL_MATCH_YEARS = matches.map((m) =>
  parseInt(m.tournament.replace(" FIFA Men's World Cup", "")),
);

type View = "grid" | "table" | "facts";

export default function Home() {
  const [view, setView] = useState<View>("grid");
  const [selectedCell, setSelectedCell] = useState<{
    entry: ScorigamiEntry | null;
    low: number;
    high: number;
  } | null>(null);

  const timeline = useTimelinePlayer({ frameCount: tournamentYears.length });

  const t = useTranslations();
  const locale = useLocale();
  const fullGrid = getScorigamiGrid();

  const selectedYear = tournamentYears[timeline.index];

  // If the user has scrubbed to a tournament we know is upcoming AND it
  // hasn't kicked off yet (no matches in the dataset for it), surface a
  // contextual "awaiting kickoff" banner above the grid.
  const upcomingStatus = useMemo(
    () => getUpcomingTournamentStatus(selectedYear, HISTORICAL_MATCH_YEARS),
    [selectedYear],
  );

  const formattedKickoffDate = useMemo(() => {
    if (!upcomingStatus) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
      // Parse as UTC-noon to dodge timezone edge cases.
      new Date(`${upcomingStatus.firstMatchDate}T12:00:00Z`),
    );
  }, [upcomingStatus, locale]);

  const { grid, filteredMatches, filteredStats } = useMemo(() => {
    if (timeline.isAtEnd) {
      return {
        grid: fullGrid,
        filteredMatches: matches,
        filteredStats: { total: summary.totalMatches, unique: summary.uniqueScores },
      };
    }
    const fm = matches.filter((m) => {
      const yr = parseInt(m.tournament.replace(" FIFA Men's World Cup", ""));
      return yr <= selectedYear;
    });
    const g = buildGridFromMatches(fm);
    return { grid: g, filteredMatches: fm, filteredStats: { total: fm.length, unique: g.size } };
  }, [selectedYear, timeline.isAtEnd, fullGrid]);

  const displayMax = Math.min(summary.maxScore, 10);
  const totalPossible = ((displayMax + 1) * (displayMax + 2)) / 2;

  const endYear = timeline.isAtEnd ? summary.dateRange.last.slice(0, 4) : selectedYear;

  return (
    <div className="min-h-screen text-stone-200">
      {/* Tri-color stripe — gold / cream / rust, vintage tournament-poster nod */}
      <div className="h-1 w-full flex">
        <div className="flex-1" style={{ background: "#d4af37" }} />
        <div className="flex-1" style={{ background: "#ece5d0" }} />
        <div className="flex-1" style={{ background: "#b8431f" }} />
      </div>

      <header className="px-4 sm:px-6 pt-8 sm:pt-10 pb-6 sm:pb-8 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-400/80 mb-3">
              {t("header.kicker")}
            </p>
            <h1
              className="font-display font-medium leading-[0.92] tracking-tight text-stone-100"
              style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)" }}
            >
              World{" "}
              <em
                className="font-display italic"
                style={{ color: "#d4af37", fontFeatureSettings: '"ss01"' }}
              >
                Cupigami
              </em>
            </h1>
            <p className="text-stone-400 text-sm sm:text-base mt-4 max-w-md leading-relaxed">
              {t("header.subtitle")}
            </p>
          </div>
          <LocaleSwitcher />
        </div>

        {/* Scoreboard stat strip */}
        <div className="mt-7 flex items-center border border-amber-400/30 rounded-sm font-mono text-[11px] tracking-[0.06em] uppercase text-stone-400">
          <span className="flex-1 text-center py-2.5">
            <strong className="text-amber-300 font-medium text-sm sb-numeral">{filteredStats.total}</strong>{" "}
            {t("stats.matches")}
          </span>
          <span className="text-amber-400/30">|</span>
          <span className="flex-1 text-center py-2.5">
            <strong className="text-amber-300 font-medium text-sm sb-numeral">{filteredStats.unique}</strong>{" "}
            {t("stats.uniqueScores")}
          </span>
          <span className="text-amber-400/30">|</span>
          <span className="flex-1 text-center py-2.5">
            <strong className="text-amber-300 font-medium text-sm sb-numeral">{t("stats.editionNumber")}</strong>{" "}
            {t("stats.editionLabel")}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 space-y-6">
        <section className="rounded-sm border-l-2 border-amber-400/60 bg-[#161f1c]/60 p-5 space-y-2 text-sm text-stone-300 leading-relaxed">
          <h2 className="font-display font-medium text-lg text-stone-100">{t("explainer.title")}</h2>
          <p>
            {t("explainer.description")}{" "}
            <a
              href="https://www.youtube.com/watch?v=9l5C8cGMueY"
              className="underline decoration-amber-400/60 underline-offset-2 text-amber-300 hover:text-amber-200 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("explainer.watchVideo")}
            </a>
          </p>
          <p>{t("explainer.whyBuilt")}</p>
          <p className="text-xs italic text-stone-500">{t("explainer.mensOnly")}</p>
          <h2 className="font-display font-medium text-lg text-stone-100 pt-2">{t("explainer.pointTitle")}</h2>
          <p>{t("explainer.pointDescription")}</p>
        </section>

        {/* View tabs — scoreboard buttons */}
        <div className="flex gap-2">
          {([
            { id: "grid" as const, label: t("views.heatmap") },
            { id: "table" as const, label: t("views.allMatches") },
            { id: "facts" as const, label: t("views.funFacts") },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 px-3.5 py-1.5 rounded-sm font-mono text-[11px] tracking-[0.1em] uppercase transition-colors ${
                view === tab.id
                  ? "bg-amber-300 text-zinc-900 border border-amber-300"
                  : "border border-amber-400/30 text-stone-300 hover:border-amber-400/60 hover:text-amber-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === "grid" && (
          <div className="space-y-4">
            {/* Timeline scrubber — scoreboard styling */}
            <div className="flex items-center gap-3 p-3 rounded-sm border border-amber-400/20 bg-[#161f1c]/40">
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
                  {tournamentYears.map((yr, i) => (
                    <span
                      key={yr}
                      className={`${i === timeline.index ? "text-amber-300 font-medium" : ""} ${
                        i !== 0 && i !== tournamentYears.length - 1 && i !== timeline.index ? "hidden sm:inline" : ""
                      }`}
                    >
                      {i === timeline.index || i === 0 || i === tournamentYears.length - 1 ? yr : "·"}
                    </span>
                  ))}
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
              <span className="text-base font-display font-medium sb-numeral min-w-[4ch] text-center text-amber-200">{selectedYear}</span>
            </div>

            {/* Awaiting-kickoff banner — appears only when the scrubber points at an
                upcoming tournament that has no matches in the dataset yet. */}
            {upcomingStatus && (
              <aside className="rounded-sm border border-amber-400/40 bg-[#161f1c]/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-400/80 shrink-0">
                  {t("upcoming.kickerLabel")} · {formattedKickoffDate}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-display font-medium text-stone-100 text-lg leading-tight">
                    {t("upcoming.title", { year: upcomingStatus.year })}
                  </p>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    {t("upcoming.description", {
                      year: upcomingStatus.year,
                      date: formattedKickoffDate,
                    })}
                  </p>
                </div>
              </aside>
            )}

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
          </div>
        )}

        {view === "table" && <MatchTable matches={matches} scorigami={scorigami} />}

        {view === "facts" && <FunFacts matches={matches} scorigami={scorigami} />}

        <Footer />
      </main>
    </div>
  );
}
