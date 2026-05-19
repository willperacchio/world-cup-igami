"use client";

import { useTranslations } from "next-intl";
import type { Match, ScorigamiEntry } from "@/lib/types";
import { getFlagSrc } from "@/lib/flags";

interface Props {
  entry: ScorigamiEntry | null;
  allMatches: Match[];
  lowScore: number;
  highScore: number;
  onClose: () => void;
}

export default function MatchDetail({ entry, allMatches, lowScore, highScore, onClose }: Props) {
  const t = useTranslations("detail");
  const tStages = useTranslations("stages");

  if (!entry) {
    return (
      <div className="border border-dashed border-amber-400 rounded-lg p-6 text-center bg-amber-50 dark:bg-amber-900/20">
        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{t("scorigamiTitle")}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {t("scorigamiDescription", { low: lowScore, high: highScore })}
        </p>
        <button onClick={onClose} className="mt-3 text-xs text-zinc-500 underline">{t("close")}</button>
      </div>
    );
  }

  const relevantMatches = allMatches.filter((m) => {
    const lo = Math.min(m.homeScore, m.awayScore);
    const hi = Math.max(m.homeScore, m.awayScore);
    return lo === lowScore && hi === highScore;
  });

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">
          {lowScore}–{highScore}
          <span className="text-zinc-500 font-normal text-sm ml-2">
            {entry.count}×
            {entry.count === 1 && <span className="ml-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">{t("scorigamiBadge")}</span>}
          </span>
        </h3>
        <button onClick={onClose} className="text-xs text-zinc-500 underline">{t("close")}</button>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto text-sm">
        {relevantMatches.map((m, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <span className="text-zinc-400 text-xs w-24">{m.date}</span>
            <span className="flex-1 text-right font-medium flex items-center justify-end gap-1.5">
              {m.homeTeam}
              <img src={getFlagSrc(m.homeCode, parseInt(m.date.slice(0, 4)))} alt={m.homeTeam} className="w-5 h-3.5 object-cover rounded-sm border border-zinc-200 dark:border-zinc-700" />
            </span>
            <span className="font-bold w-12 text-center">{m.homeScore}–{m.awayScore}</span>
            <span className="flex-1 font-medium flex items-center gap-1.5">
              <img src={getFlagSrc(m.awayCode, parseInt(m.date.slice(0, 4)))} alt={m.awayTeam} className="w-5 h-3.5 object-cover rounded-sm border border-zinc-200 dark:border-zinc-700" />
              {m.awayTeam}
            </span>
            <span className="text-zinc-400 text-xs w-24 text-right">{tStages(m.stage)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
