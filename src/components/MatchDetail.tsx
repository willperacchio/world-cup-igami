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
        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{t("noScorigamiTitle")}</p>
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
          {highScore}–{lowScore}
          <span className="text-zinc-500 font-normal text-sm ml-2">
            {entry.count}×
            {entry.count === 1 && <span className="ml-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">{t("scorigamiBadge")}</span>}
          </span>
        </h3>
        <button onClick={onClose} className="text-xs text-zinc-500 underline">{t("close")}</button>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto text-sm">
        {relevantMatches.map((m, i) => {
          const year = parseInt(m.date.slice(0, 4));
          let wTeam = m.homeTeam, wCode = m.homeCode, wScore = m.homeScore;
          let lTeam = m.awayTeam, lCode = m.awayCode, lScore = m.awayScore;
          let penDisp = m.penaltyScore;
          if (m.homeScore < m.awayScore) {
            [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore];
          } else if (m.homeScore === m.awayScore && m.penaltyShootout && m.penaltyScore) {
            const parts = m.penaltyScore.split("–");
            const [pH, pA] = parts.map(Number);
            if (pA > pH) { [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore]; penDisp = `${pA}–${pH}`; }
          }
          return (
          <div key={i} className={`flex items-center gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${i === 0 ? "bg-amber-50 dark:bg-amber-900/20 rounded px-2 -mx-2" : ""}`}>
            <span className="text-xs w-5 text-center">{i === 0 ? "⚽" : ""}</span>
            <span className="text-zinc-400 text-xs w-24">{m.date}</span>
            <span className="flex-1 text-right font-medium flex items-center justify-end gap-1.5">
              {wTeam}
              <img src={getFlagSrc(wCode, year)} alt={wTeam} className="w-5 h-3.5 object-cover rounded-sm border border-zinc-200 dark:border-zinc-700" />
            </span>
            <span className="font-bold w-20 text-center">
              {wScore}–{lScore}
              {m.extraTime && !m.penaltyShootout && <span className="text-[10px] text-zinc-400 block">aet</span>}
              {m.penaltyShootout && <span className="text-[10px] text-zinc-400 block">{penDisp} pen</span>}
            </span>
            <span className="flex-1 font-medium flex items-center gap-1.5">
              <img src={getFlagSrc(lCode, year)} alt={lTeam} className="w-5 h-3.5 object-cover rounded-sm border border-zinc-200 dark:border-zinc-700" />
              {lTeam}
            </span>
            <span className="text-zinc-400 text-xs w-32 text-right">
              <span className="block">{tStages(m.stage)}</span>
              <span className="text-zinc-500">{m.city}, {m.country}</span>
            </span>
          </div>
          );
        })}
      </div>
    </div>
  );
}
