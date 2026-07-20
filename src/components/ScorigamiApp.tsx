"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { buildGridFromMatches } from "@/lib/data";
import {
  getUpcomingTournamentStatus,
  UPCOMING_TOURNAMENTS,
  WOMENS_UPCOMING_TOURNAMENTS,
} from "@/lib/tournament";
import { parseTournamentYear } from "@/lib/match-utils";
import type { Match, ScorigamiEntry, Summary } from "@/lib/types";
import { useTimelinePlayer } from "@/hooks/useTimelinePlayer";
import ScorigamiGrid from "@/components/ScorigamiGrid";
import MatchTable from "@/components/MatchTable";
import MatchDetail from "@/components/MatchDetail";
import FunFacts, { type Edition } from "@/components/FunFacts";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import LastUpdated from "@/components/LastUpdated";
import ScorigamiCelebration from "@/components/ScorigamiCelebration";
import Footer from "@/components/Footer";
import { useIsRecent } from "@/hooks/useIsRecent";

/** Accent for the women's edition "W" mark — rose against the scoreboard gold. */
const W_ACCENT = "#fda4af";

interface EditionSetup {
  upcoming: typeof UPCOMING_TOURNAMENTS;
  upcomingTournamentName: string;
  subtitleKey: string;
  editionNumberKey: string;
  editionLabelKey: string;
  upcomingDescriptionKey: string;
}

const EDITIONS: Record<Edition, EditionSetup> = {
  mens: {
    upcoming: UPCOMING_TOURNAMENTS,
    upcomingTournamentName: "2026 FIFA Men's World Cup",
    subtitleKey: "header.subtitle",
    editionNumberKey: "stats.editionNumber",
    editionLabelKey: "stats.editionLabel",
    upcomingDescriptionKey: "upcoming.description",
  },
  womens: {
    upcoming: WOMENS_UPCOMING_TOURNAMENTS,
    upcomingTournamentName: "2027 FIFA Women's World Cup",
    subtitleKey: "header.subtitleWomens",
    editionNumberKey: "stats.editionNumberWomens",
    editionLabelKey: "stats.editionLabelWomens",
    upcomingDescriptionKey: "upcoming.descriptionWomens",
  },
};

type View = "grid" | "table" | "facts";

interface Props {
  edition: Edition;
  matches: Match[];
  scorigami: ScorigamiEntry[];
  summary: Summary;
  tournamentYears: number[];
  /** Build-time live-data timestamp — men's edition only until 2027 goes live. */
  liveLastFetched?: string;
}

export default function ScorigamiApp({
  edition,
  matches,
  scorigami,
  summary,
  tournamentYears,
  liveLastFetched,
}: Props) {
  const setup = EDITIONS[edition];
  const [view, setView] = useState<View>("grid");
  const [selectedCell, setSelectedCell] = useState<{
    entry: ScorigamiEntry | null;
    low: number;
    high: number;
  } | null>(null);

  const timeline = useTimelinePlayer({ frameCount: tournamentYears.length });

  const t = useTranslations();
  const locale = useLocale();

  const fullGrid = useMemo(() => {
    const map = new Map<string, ScorigamiEntry>();
    for (const entry of scorigami) {
      map.set(`${entry.lowScore}-${entry.highScore}`, entry);
    }
    return map;
  }, [scorigami]);

  const historicalMatchYears = useMemo(
    () => matches.map((m) => parseInt(parseTournamentYear(m.tournament))),
    [matches],
  );

  const selectedYear = tournamentYears[timeline.index];

  // If the user has scrubbed to a tournament we know is upcoming AND it
  // hasn't kicked off yet (no matches in the dataset for it), surface a
  // contextual "awaiting kickoff" banner below the grid.
  const upcomingStatus = useMemo(
    () => getUpcomingTournamentStatus(selectedYear, historicalMatchYears, setup.upcoming),
    [selectedYear, historicalMatchYears, setup.upcoming],
  );

  const formattedKickoffDate = useMemo(() => {
    if (!upcomingStatus) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
      // Parse as UTC-noon to dodge timezone edge cases.
      new Date(`${upcomingStatus.firstMatchDate}T12:00:00Z`),
    );
  }, [upcomingStatus, locale]);

  // Precompute the cumulative state for every timeline position once, so each
  // playback step is a constant-time lookup instead of refiltering all
  // matches and rebuilding the grid. Keeps Play stepping at a steady rhythm.
  const framesByIndex = useMemo(
    () =>
      tournamentYears.map((year) => {
        const fm = matches.filter((m) => {
          const yr = parseInt(parseTournamentYear(m.tournament));
          return yr <= year;
        });
        const g = buildGridFromMatches(fm);
        return { grid: g, filteredMatches: fm, filteredStats: { total: fm.length, unique: g.size } };
      }),
    [matches, tournamentYears],
  );

  // Solo mode: show only the selected tournament's matches instead of the
  // cumulative all-time view — e.g. "just 2026". Counts (and the stats strip)
  // then describe that single tournament.
  const [soloMode, setSoloMode] = useState(false);
  const soloFramesByIndex = useMemo(
    () =>
      tournamentYears.map((year) => {
        const fm = matches.filter(
          (m) => parseInt(parseTournamentYear(m.tournament)) === year,
        );
        const g = buildGridFromMatches(fm);
        return { grid: g, filteredMatches: fm, filteredStats: { total: fm.length, unique: g.size } };
      }),
    [matches, tournamentYears],
  );

  const { grid, filteredMatches, filteredStats } = useMemo(() => {
    if (soloMode) return soloFramesByIndex[timeline.index];
    if (timeline.isAtEnd) {
      return {
        grid: fullGrid,
        filteredMatches: matches,
        filteredStats: { total: summary.totalMatches, unique: summary.uniqueScores },
      };
    }
    return framesByIndex[timeline.index];
  }, [soloMode, soloFramesByIndex, timeline.index, timeline.isAtEnd, fullGrid, framesByIndex, matches, summary]);

  // The most-recent scorigami (newest scoreline to appear) and whether it's
  // fresh enough to celebrate. Men's only, per the "not for the women's" call.
  const mostRecentScorigami = useMemo(() => {
    let best: ScorigamiEntry | null = null;
    for (const e of scorigami) {
      if (!best || e.firstMatch.date > best.firstMatch.date) best = e;
    }
    return best?.firstMatch;
  }, [scorigami]);
  const isFreshScorigami = useIsRecent(mostRecentScorigami?.date);
  const celebrate = edition === "mens" && isFreshScorigami;

  // When celebrating, pulse the most-recent scoreline's cell on the heatmap.
  // Grid cells are keyed `${losingScore}-${winningScore}` = `${low}-${high}`.
  const highlightKey =
    celebrate && mostRecentScorigami
      ? `${Math.min(mostRecentScorigami.homeScore, mostRecentScorigami.awayScore)}-${Math.max(mostRecentScorigami.homeScore, mostRecentScorigami.awayScore)}`
      : null;

  const editionHref = (target: Edition) =>
    target === "mens" ? `/mens/${locale}` : `/womens/${locale}`;

  // Women's edition accent: rose replaces the gold in the page chrome so the
  // two editions are unmistakable at a glance. Full literal class names so
  // Tailwind's compiler sees them.
  const isW = edition === "womens";
  const acc = {
    kicker: isW ? "text-rose-300/80" : "text-amber-400/80",
    strong: isW ? "text-rose-300" : "text-amber-300",
    border: isW ? "border-rose-300/30" : "border-amber-400/30",
    borderFaint: isW ? "border-rose-300/20" : "border-amber-400/20",
    borderStrong: isW ? "border-rose-300/40" : "border-amber-400/40",
    borderAccent: isW ? "border-rose-300/60" : "border-amber-400/60",
    divider: isW ? "text-rose-300/30" : "text-amber-400/30",
    tabActive: isW
      ? "bg-rose-300 text-zinc-900 border border-rose-300"
      : "bg-amber-300 text-zinc-900 border border-amber-300",
    tabIdle: isW
      ? "border border-rose-300/30 text-stone-300 hover:border-rose-300/60 hover:text-rose-200"
      : "border border-amber-400/30 text-stone-300 hover:border-amber-400/60 hover:text-amber-200",
    ctrl: isW
      ? "border-rose-300/30 text-rose-300 hover:border-rose-300/60 hover:text-rose-200"
      : "border-amber-400/30 text-amber-300 hover:border-amber-400/60 hover:text-amber-200",
    ctrlActive: isW
      ? "bg-rose-300 text-zinc-900 border border-rose-300"
      : "bg-amber-300 text-zinc-900 border border-amber-300",
    range: isW ? "accent-rose-300" : "accent-amber-300",
    year: isW ? "text-rose-200" : "text-amber-200",
    scrubActive: isW ? "text-rose-300" : "text-amber-300",
  };

  return (
    <div className="min-h-screen text-stone-200">
      {/* Tri-color stripe — gold / cream / rust, vintage tournament-poster nod */}
      <div className="h-1 w-full flex">
        <div className="flex-1" style={{ background: "#d4af37" }} />
        <div className="flex-1" style={{ background: edition === "womens" ? W_ACCENT : "#ece5d0" }} />
        <div className="flex-1" style={{ background: "#b8431f" }} />
      </div>

      <header className="px-4 sm:px-6 pt-8 sm:pt-10 pb-6 sm:pb-8 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className={`font-mono text-[10px] tracking-[0.22em] uppercase ${acc.kicker} mb-3`}>
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
              {edition === "womens" && (
                <>
                  {" "}
                  <em className="font-display italic" style={{ color: W_ACCENT }}>
                    W
                  </em>
                </>
              )}
            </h1>
            <p className="text-stone-400 text-sm sm:text-base mt-4 max-w-md leading-relaxed">
              {t(setup.subtitleKey)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LocaleSwitcher />
            {/* Edition toggle — client-side navigation, no full page reload */}
            <div className="flex rounded-sm border border-amber-400/30 font-mono text-[10px] tracking-[0.1em] uppercase overflow-hidden">
              <Link
                href={editionHref("mens")}
                prefetch
                className={`px-2.5 py-1.5 transition-colors ${
                  edition === "mens"
                    ? "bg-amber-300 text-zinc-900"
                    : "text-stone-300 hover:text-amber-200"
                }`}
              >
                {t("header.editionMens")}
              </Link>
              <Link
                href={editionHref("womens")}
                prefetch
                className={`px-2.5 py-1.5 transition-colors ${
                  edition === "womens"
                    ? "text-zinc-900"
                    : "text-stone-300 hover:text-amber-200"
                }`}
                style={edition === "womens" ? { background: W_ACCENT } : undefined}
              >
                {t("header.editionWomens")}
              </Link>
            </div>
          </div>
        </div>

        {/* Scoreboard stat strip */}
        <div className={`mt-7 flex items-center border ${acc.border} rounded-sm font-mono text-[11px] tracking-[0.06em] uppercase text-stone-400`}>
          <span className="flex-1 text-center py-2.5">
            <strong className={`${acc.strong} font-medium text-sm sb-numeral`}>{filteredStats.total}</strong>{" "}
            {t("stats.matches")}
          </span>
          <span className={acc.divider}>|</span>
          <span className="flex-1 text-center py-2.5">
            <strong className={`${acc.strong} font-medium text-sm sb-numeral`}>{filteredStats.unique}</strong>{" "}
            {t("stats.uniqueScores")}
          </span>
          <span className={acc.divider}>|</span>
          <span className="flex-1 text-center py-2.5">
            <strong className={`${acc.strong} font-medium text-sm sb-numeral`}>{t(setup.editionNumberKey)}</strong>{" "}
            {t(setup.editionLabelKey)}
          </span>
        </div>
        {edition === "mens" && liveLastFetched !== undefined && (
          <LastUpdated initialTimestamp={liveLastFetched} />
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 space-y-6">
        {/* Fun Facts renders its own celebration in place of the most-recent
            card, so only show the top banner on the other views. */}
        {celebrate && mostRecentScorigami && view !== "facts" && (
          <ScorigamiCelebration
            match={mostRecentScorigami}
            uniqueNumber={summary.uniqueScores}
            totalMatches={summary.totalMatches}
          />
        )}
        <section className={`rounded-sm border-l-2 ${acc.borderAccent} bg-[#161f1c]/60 p-5 space-y-2 text-sm text-stone-300 leading-relaxed`}>
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
          <p className="text-xs italic text-stone-500">
            {t(edition === "womens" ? "explainer.editionNoteWomens" : "explainer.editionNoteMens")}
          </p>
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
                view === tab.id ? acc.tabActive : acc.tabIdle
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === "grid" && (
          <div className="space-y-4">
            <div className="text-center space-y-1.5 pt-2">
              <h2 className="font-display font-medium text-2xl sm:text-3xl text-stone-100">
                {t(edition === "womens" ? "grid.titleWomens" : "grid.title")}
              </h2>
              <p className={`font-mono text-xs tracking-[0.12em] uppercase ${acc.strong}`}>
                {soloMode
                  ? t("grid.scorigamiHintSolo", { year: selectedYear })
                  : t("grid.scorigamiHint")}
              </p>
              {/* All-time vs single-tournament view toggle */}
              <div className="flex justify-center pt-1">
                <div className={`inline-flex rounded-sm border ${acc.border} font-mono text-[10px] tracking-[0.1em] uppercase overflow-hidden`}>
                  <button
                    onClick={() => setSoloMode(false)}
                    className={`px-2.5 py-1 transition-colors ${!soloMode ? acc.ctrlActive : "text-stone-300 hover:text-stone-100"}`}
                  >
                    {t("grid.modeCumulative")}
                  </button>
                  <button
                    onClick={() => setSoloMode(true)}
                    className={`px-2.5 py-1 transition-colors ${soloMode ? acc.ctrlActive : "text-stone-300 hover:text-stone-100"}`}
                  >
                    {t("grid.modeSolo", { year: selectedYear })}
                  </button>
                </div>
              </div>
            </div>
            {/* Timeline scrubber — scoreboard styling */}
            <div className={`flex items-center gap-3 p-3 rounded-sm border ${acc.borderFaint} bg-[#161f1c]/40`}>
              <button
                onClick={timeline.stepBack}
                disabled={timeline.index === 0}
                className={`w-7 h-7 rounded-sm border ${acc.ctrl} text-xs disabled:opacity-25 disabled:cursor-not-allowed transition-colors`}
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
                  className={`w-full sb-range ${acc.range}`}
                />
                <div className="flex justify-between text-[10px] text-stone-500 px-0.5 sb-numeral">
                  {tournamentYears.map((yr, i) => (
                    <span
                      key={yr}
                      className={`${i === timeline.index ? `${acc.scrubActive} font-medium` : ""} ${
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
                className={`w-7 h-7 rounded-sm border ${acc.ctrl} text-xs disabled:opacity-25 disabled:cursor-not-allowed transition-colors`}
                aria-label="Step forward"
              >
                ▶
              </button>
              <button
                onClick={() => { timeline.togglePlay(); setSelectedCell(null); }}
                className={`px-2.5 h-7 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
                  timeline.playing ? acc.ctrlActive : `border ${acc.ctrl}`
                }`}
                title={timeline.playing ? "Pause" : "Play"}
              >
                {timeline.playing ? "Pause" : "Play"}
              </button>
              <span className={`text-base font-display font-medium sb-numeral min-w-[4ch] text-center ${acc.year}`}>{selectedYear}</span>
            </div>

            <ScorigamiGrid
              grid={grid}
              maxScore={summary.maxScore}
              womens={isW}
              highlightKey={highlightKey}
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

            {/* Awaiting-kickoff banner — appears only when the scrubber points at an
                upcoming tournament that has no matches in the dataset yet. */}
            {upcomingStatus && (
              <aside className={`rounded-sm border ${acc.borderStrong} bg-[#161f1c]/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5`}>
                <div className={`font-mono text-[10px] tracking-[0.22em] uppercase ${acc.kicker} shrink-0`}>
                  {t("upcoming.kickerLabel")} · {formattedKickoffDate}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-display font-medium text-stone-100 text-lg leading-tight">
                    {t("upcoming.title", { year: upcomingStatus.year })}
                  </p>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    {t(setup.upcomingDescriptionKey, {
                      year: upcomingStatus.year,
                      date: formattedKickoffDate,
                    })}
                  </p>
                </div>
              </aside>
            )}
          </div>
        )}

        {view === "table" && (
          <MatchTable
            matches={matches}
            scorigami={scorigami}
            upcomingTournament={setup.upcomingTournamentName}
          />
        )}

        {view === "facts" && <FunFacts matches={matches} scorigami={scorigami} edition={edition} />}

        <Footer edition={edition} />
      </main>
    </div>
  );
}
