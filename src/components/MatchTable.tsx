"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match, ScorigamiEntry } from "@/lib/types";
import { getWikipediaUrl, getFifaUrl } from "@/lib/external-links";
import { Flag } from "./Flag";

interface Props {
  matches: Match[];
  scorigami: ScorigamiEntry[];
}

const PAGE_SIZE = 100;

export default function MatchTable({ matches, scorigami }: Props) {
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortField, setSortField] = useState<"date" | "home" | "score" | "away" | "stage" | "venue" | "year">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);
  const [scorigamiOnly, setScorigamiOnly] = useState(false);
  const t = useTranslations("table");
  const tStages = useTranslations("stages");

  const scorigamiKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of scorigami) {
      const m = s.firstMatch;
      keys.add(`${m.date}|${m.homeTeam}|${m.awayTeam}`);
    }
    return keys;
  }, [scorigami]);

  const tournaments = useMemo(() => {
    const fromData = [...new Set(matches.map((m) => m.tournament))];
    const upcoming = "2026 FIFA Men's World Cup";
    if (!fromData.includes(upcoming)) fromData.push(upcoming);
    return fromData.sort().reverse();
  }, [matches]);

  const stages = useMemo(() => {
    const order = ["group stage", "second group stage", "round of 32", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final round", "final"];
    return order;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = matches.filter((m) => {
      if (tournamentFilter !== "all" && m.tournament !== tournamentFilter) return false;
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
      if (scorigamiOnly && !scorigamiKeys.has(`${m.date}|${m.homeTeam}|${m.awayTeam}`)) return false;
      if (q) {
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.tournament.toLowerCase().includes(q) ||
          m.stage.toLowerCase().includes(q) ||
          `${m.homeScore}-${m.awayScore}`.includes(q)
        );
      }
      return true;
    });
    const stageOrder = ["group stage", "second group stage", "round of 32", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final round", "final"];
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = a.date.localeCompare(b.date);
      } else if (sortField === "home") {
        cmp = a.homeTeam.localeCompare(b.homeTeam);
      } else if (sortField === "away") {
        cmp = a.awayTeam.localeCompare(b.awayTeam);
      } else if (sortField === "score") {
        cmp = (a.homeScore + a.awayScore) - (b.homeScore + b.awayScore);
        if (cmp === 0) cmp = Math.max(a.homeScore, a.awayScore) - Math.max(b.homeScore, b.awayScore);
        if (cmp === 0) cmp = a.date.localeCompare(b.date);
      } else if (sortField === "stage") {
        cmp = stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
      } else if (sortField === "venue") {
        cmp = `${a.city}, ${a.country}`.localeCompare(`${b.city}, ${b.country}`);
      } else if (sortField === "year") {
        cmp = a.tournament.localeCompare(b.tournament);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [matches, search, tournamentFilter, stageFilter, scorigamiOnly, scorigamiKeys, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const arrow = sortDir === "asc" ? " ↑" : " ↓";
  const displayCount = showAll ? filtered.length : Math.min(PAGE_SIZE, filtered.length);
  const hasMore = !showAll && filtered.length > PAGE_SIZE;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
          className="flex-1 min-w-[180px] px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <select
          value={tournamentFilter}
          onChange={(e) => { setTournamentFilter(e.target.value); setShowAll(false); }}
          className="px-2 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="all">{t("allTournaments")}</option>
          {tournaments.map((tourney) => (
            <option key={tourney} value={tourney}>{tourney.replace(" FIFA Men's World Cup", "")}</option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setShowAll(false); }}
          className="px-2 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="all">{t("allStages")}</option>
          {stages.map((s) => (
            <option key={s} value={s}>{tStages(s)}</option>
          ))}
        </select>
        <button
          onClick={() => { setScorigamiOnly((v) => !v); setShowAll(false); }}
          className={`px-3 py-1.5 rounded text-sm font-medium ${
            scorigamiOnly
              ? "bg-amber-500 text-black"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          ⚽ Scorigami
        </button>
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-start text-xs text-zinc-500 uppercase">
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("date")}>{t("date")}{sortField === "date" ? arrow : ""}</th>
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("home")}>{t("home")}{sortField === "home" ? arrow : ""}</th>
            <th className="py-2 px-2 text-center cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("score")} title="Sort by total goals">{t("score")}{sortField === "score" ? ` (total)${arrow}` : ""}</th>
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("away")}>{t("away")}{sortField === "away" ? arrow : ""}</th>
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("stage")}>{t("stage")}{sortField === "stage" ? arrow : ""}</th>
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("venue")}>{t("venue")}{sortField === "venue" ? arrow : ""}</th>
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("year")}>{t("year")}{sortField === "year" ? arrow : ""}</th>
            <th className="py-2 px-2 text-center">Scorigami</th>
            <th className="py-2 px-2 text-center">Links</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, displayCount).map((m, i) => {
            const year = parseInt(m.date.slice(0, 4));
            return (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.date}</td>
              <td className="py-2 px-2 font-medium">
                <Flag code={m.homeCode} year={year} alt={m.homeTeam} className="me-1.5" />
                {m.homeTeam}
              </td>
              <td className="py-2 px-2 text-center">
                <div className="font-bold">{m.homeScore}–{m.awayScore}</div>
                {m.extraTime && !m.penaltyShootout && <div className="text-[10px] text-zinc-400 leading-tight">aet</div>}
                {m.penaltyShootout && <div className="text-[10px] text-zinc-400 leading-tight">{m.penaltyScore} pen</div>}
              </td>
              <td className="py-2 px-2 font-medium">
                <Flag code={m.awayCode} year={year} alt={m.awayTeam} className="me-1.5" />
                {m.awayTeam}
              </td>
              <td className="py-2 px-2 text-zinc-500 text-xs">{tStages(m.stage)}</td>
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.city}, {m.country}</td>
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.tournament.replace(" FIFA Men's World Cup", "")}</td>
              <td className="py-2 px-2 text-center">
                {scorigamiKeys.has(`${m.date}|${m.homeTeam}|${m.awayTeam}`) && "⚽"}
              </td>
              <td className="py-2 px-2 text-center">
                <span className="flex items-center justify-center gap-2 text-[10px]">
                  <a
                    href={getWikipediaUrl(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400/70 hover:text-amber-300 underline decoration-amber-400/30 hover:decoration-amber-300 underline-offset-2 transition-colors"
                    title="Read more on Wikipedia"
                  >
                    W↗
                  </a>
                  <a
                    href={getFifaUrl(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-stone-200 underline decoration-stone-400/30 hover:decoration-stone-200 underline-offset-2 transition-colors"
                    title="View on FIFA"
                  >
                    F↗
                  </a>
                </span>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-zinc-400">
          {t("showingOf", { shown: displayCount, total: filtered.length })}
        </p>
        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-blue-500 hover:text-blue-400 underline"
          >
            {t("showAll")}
          </button>
        )}
        {showAll && filtered.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll(false)}
            className="text-xs text-blue-500 hover:text-blue-400 underline"
          >
            {t("showLess")}
          </button>
        )}
      </div>
    </div>
  );
}
