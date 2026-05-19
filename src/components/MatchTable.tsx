"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match } from "@/lib/types";
import { getFlagSrc } from "@/lib/flags";

interface Props {
  matches: Match[];
}

const PAGE_SIZE = 100;

export default function MatchTable({ matches }: Props) {
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortField, setSortField] = useState<"date" | "score">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);
  const t = useTranslations("table");
  const tStages = useTranslations("stages");

  const tournaments = useMemo(() => {
    const fromData = [...new Set(matches.map((m) => m.tournament))];
    const upcoming = "2026 FIFA Men's World Cup";
    if (!fromData.includes(upcoming)) fromData.push(upcoming);
    return fromData.sort().reverse();
  }, [matches]);

  const stages = useMemo(() => {
    const order = ["group stage", "round of 32", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final"];
    return order;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = matches.filter((m) => {
      if (tournamentFilter !== "all" && m.tournament !== tournamentFilter) return false;
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
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
    result.sort((a, b) => {
      if (sortField === "date") {
        const cmp = a.date.localeCompare(b.date);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const totalA = a.homeScore + a.awayScore;
      const totalB = b.homeScore + b.awayScore;
      return sortDir === "asc" ? totalA - totalB : totalB - totalA;
    });
    return result;
  }, [matches, search, tournamentFilter, stageFilter, sortField, sortDir]);

  function toggleSort(field: "date" | "score") {
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
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-xs text-zinc-500 uppercase">
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("date")}>{t("date")}{sortField === "date" ? arrow : ""}</th>
            <th className="py-2 px-2">{t("home")}</th>
            <th className="py-2 px-2 text-center cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("score")}>{t("score")}{sortField === "score" ? arrow : ""}</th>
            <th className="py-2 px-2">{t("away")}</th>
            <th className="py-2 px-2">{t("stage")}</th>
            <th className="py-2 px-2">{t("venue")}</th>
            <th className="py-2 px-2">{t("year")}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, displayCount).map((m, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.date}</td>
              <td className="py-2 px-2 font-medium">
                <img src={getFlagSrc(m.homeCode, parseInt(m.date.slice(0, 4)))} alt={m.homeTeam} className="inline-block w-5 h-3.5 object-cover mr-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700" />
                {m.homeTeam}
              </td>
              <td className="py-2 px-2 text-center font-bold">
                {m.homeScore}–{m.awayScore}
                {m.extraTime && !m.penaltyShootout && <span className="text-xs text-zinc-400 ml-1">(aet)</span>}
                {m.penaltyShootout && <span className="text-xs text-zinc-400 ml-1">({m.penaltyScore} pen)</span>}
              </td>
              <td className="py-2 px-2 font-medium">
                <img src={getFlagSrc(m.awayCode, parseInt(m.date.slice(0, 4)))} alt={m.awayTeam} className="inline-block w-5 h-3.5 object-cover mr-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700" />
                {m.awayTeam}
              </td>
              <td className="py-2 px-2 text-zinc-500 text-xs">{tStages(m.stage)}</td>
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.city}, {m.country}</td>
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.tournament.replace(" FIFA Men's World Cup", "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
