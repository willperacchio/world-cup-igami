"use client";

import { useTranslations } from "next-intl";
import type { Match, ScorigamiEntry } from "@/lib/types";
import { MatchScoreline } from "./MatchScoreline";

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
            {entry.count === 1 && (
              <span className="ms-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                {t("scorigamiBadge")}
              </span>
            )}
          </span>
        </h3>
        <button onClick={onClose} className="text-xs text-zinc-500 underline">{t("close")}</button>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto text-sm">
        {relevantMatches.map((m, i) => (
          <div
            key={i}
            className={`py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
              i === 0 ? "bg-amber-50 dark:bg-amber-900/20 rounded px-2 -mx-2" : ""
            }`}
          >
            <MatchScoreline
              match={m}
              orient="winner"
              showDate
              showYear={false}
              showVenue
              showLinks
              linkVariant="labels"
              prefix={i === 0 ? "⚽" : ""}
              stageLabel={tStages(m.stage)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
