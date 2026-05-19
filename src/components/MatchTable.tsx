"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match } from "@/lib/types";
import { getFlagSrc } from "@/lib/flags";

interface Props {
  matches: Match[];
}

export default function MatchTable({ matches }: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "score">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const t = useTranslations("table");
  const tStages = useTranslations("stages");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = matches.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.tournament.toLowerCase().includes(q) ||
        m.stage.toLowerCase().includes(q) ||
        `${m.homeScore}-${m.awayScore}`.includes(q)
    );
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
  }, [matches, search, sortField, sortDir]);

  function toggleSort(field: "date" | "score") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const arrow = sortDir === "asc" ? " ↑" : " ↓";

  return (
    <div>
      <input
        type="text"
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-xs text-zinc-500 uppercase">
            <th className="py-2 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("date")}>{t("date")}{sortField === "date" ? arrow : ""}</th>
            <th className="py-2 px-2">{t("home")}</th>
            <th className="py-2 px-2 text-center cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => toggleSort("score")}>{t("score")}{sortField === "score" ? arrow : ""}</th>
            <th className="py-2 px-2">{t("away")}</th>
            <th className="py-2 px-2">{t("stage")}</th>
            <th className="py-2 px-2">{t("year")}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 100).map((m, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.date}</td>
              <td className="py-2 px-2 font-medium">
                <img src={getFlagSrc(m.homeCode, parseInt(m.date.slice(0, 4)))} alt={m.homeTeam} className="inline-block w-5 h-3.5 object-cover mr-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700" />
                {m.homeTeam}
              </td>
              <td className="py-2 px-2 text-center font-bold">
                {m.homeScore}–{m.awayScore}
                {m.extraTime && !m.penaltyShootout && <span className="text-xs text-zinc-400 ml-1">(aet)</span>}
                {m.penaltyShootout && <span className="text-xs text-zinc-400 ml-1">(pen)</span>}
              </td>
              <td className="py-2 px-2 font-medium">
                <img src={getFlagSrc(m.awayCode, parseInt(m.date.slice(0, 4)))} alt={m.awayTeam} className="inline-block w-5 h-3.5 object-cover mr-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700" />
                {m.awayTeam}
              </td>
              <td className="py-2 px-2 text-zinc-500 text-xs">{tStages(m.stage)}</td>
              <td className="py-2 px-2 text-zinc-400 text-xs">{m.tournament.replace(" FIFA Men's World Cup", "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 100 && (
        <p className="text-xs text-zinc-400 mt-2">{t("showingOf", { shown: 100, total: filtered.length })}</p>
      )}
    </div>
  );
}
