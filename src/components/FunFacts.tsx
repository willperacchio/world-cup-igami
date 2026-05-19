"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match, ScorigamiEntry } from "@/lib/types";
import { getFlagSrc } from "@/lib/flags";

interface Props {
  matches: Match[];
  scorigami: ScorigamiEntry[];
}

interface TeamScorigamiCount {
  team: string;
  code: string;
  count: number;
}

interface GoalsPerEra {
  era: string;
  avg: number;
  matches: number;
  goals: number;
}

export default function FunFacts({ matches, scorigami }: Props) {
  const t = useTranslations("funFacts");
  const tStages = useTranslations("stages");

  const facts = useMemo(() => {
    const uniqueScores = scorigami.filter((s) => s.count === 1);
    const mostCommon = [...scorigami].sort((a, b) => b.count - a.count);

    // Highest-scoring matches
    const byTotalGoals = [...matches].sort(
      (a, b) => b.homeScore + b.awayScore - (a.homeScore + a.awayScore)
    );

    // Most lopsided
    const byMargin = [...matches].sort(
      (a, b) =>
        Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore)
    );

    // Most recent scorigami
    const scorigamiMatches = uniqueScores
      .map((s) => s.firstMatch)
      .sort((a, b) => b.date.localeCompare(a.date));
    const mostRecent = scorigamiMatches[0];

    // Teams with most scorigamis
    const teamCounts: Record<string, { code: string; count: number }> = {};
    for (const s of uniqueScores) {
      const m = s.firstMatch;
      for (const [team, code] of [[m.homeTeam, m.homeCode], [m.awayTeam, m.awayCode]]) {
        if (!teamCounts[team]) teamCounts[team] = { code, count: 0 };
        teamCounts[team].count++;
      }
    }
    const topTeams: TeamScorigamiCount[] = Object.entries(teamCounts)
      .map(([team, { code, count }]) => ({ team, code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Scorigamis by stage
    const stageOrder = ["group stage", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final"];
    const scorigamiByStage: Record<string, number> = {};
    for (const s of scorigami) {
      if (s.count === 1) {
        const stage = s.firstMatch.stage;
        scorigamiByStage[stage] = (scorigamiByStage[stage] || 0) + 1;
      }
    }

    // Goals per era
    const eras: GoalsPerEra[] = [];
    const decades = new Map<string, { goals: number; matches: number }>();
    for (const m of matches) {
      const decade = m.date.slice(0, 3) + "0s";
      const d = decades.get(decade) || { goals: 0, matches: 0 };
      d.goals += m.homeScore + m.awayScore;
      d.matches++;
      decades.set(decade, d);
    }
    for (const [era, { goals, matches: count }] of [...decades.entries()].sort()) {
      eras.push({ era, avg: Math.round((goals / count) * 100) / 100, matches: count, goals });
    }

    // Scorigamis by decade
    const scorigamiByDecade = new Map<string, number>();
    for (const s of scorigami) {
      if (s.count > 0) {
        const decade = s.firstMatch.date.slice(0, 3) + "0s";
        scorigamiByDecade.set(decade, (scorigamiByDecade.get(decade) || 0) + 1);
      }
    }

    // Surprising never-happened scores
    const existingScores = new Set(scorigami.map((s) => `${s.lowScore}-${s.highScore}`));
    const surprising: string[] = [];
    const candidates = [
      { low: 4, high: 5, reason: "neverFourFive" },
      { low: 5, high: 5, reason: "neverFiveFive" },
      { low: 4, high: 6, reason: "neverFourSix" },
      { low: 1, high: 8, reason: "neverOneEight" },
    ];
    for (const c of candidates) {
      if (!existingScores.has(`${c.low}-${c.high}`)) {
        surprising.push(c.reason);
      }
    }

    // Most common final scoreline
    const finals = matches.filter((m) => m.stage === "final");
    const finalScores: Record<string, { count: number; years: string[] }> = {};
    for (const m of finals) {
      const lo = Math.min(m.homeScore, m.awayScore);
      const hi = Math.max(m.homeScore, m.awayScore);
      const key = `${lo}-${hi}`;
      if (!finalScores[key]) finalScores[key] = { count: 0, years: [] };
      finalScores[key].count++;
      finalScores[key].years.push(m.date.slice(0, 4));
    }
    const topFinalScore = Object.entries(finalScores).sort((a, b) => b[1].count - a[1].count)[0];

    // Penalty shootout stats
    const penaltyMatches = matches.filter((m) => m.penaltyShootout);
    const extraTimeMatches = matches.filter((m) => m.extraTime);

    // Peak tournament
    const tournamentGoals = new Map<string, { goals: number; matches: number }>();
    for (const m of matches) {
      const d = tournamentGoals.get(m.tournament) || { goals: 0, matches: 0 };
      d.goals += m.homeScore + m.awayScore;
      d.matches++;
      tournamentGoals.set(m.tournament, d);
    }
    let peakTournament = { name: "", avg: 0 };
    let troughTournament = { name: "", avg: Infinity };
    for (const [name, { goals, matches: count }] of tournamentGoals) {
      const avg = goals / count;
      if (avg > peakTournament.avg) peakTournament = { name, avg };
      if (avg < troughTournament.avg) troughTournament = { name, avg };
    }

    return {
      uniqueScores,
      mostCommon: mostCommon.slice(0, 5),
      highestScoring: byTotalGoals.slice(0, 5),
      mostLopsided: byMargin.slice(0, 5),
      mostRecent,
      topTeams,
      scorigamiByStage,
      stageOrder,
      eras,
      scorigamiByDecade: [...scorigamiByDecade.entries()].sort(),
      surprising,
      topFinalScore: topFinalScore
        ? { score: topFinalScore[0], ...topFinalScore[1] }
        : null,
      penaltyCount: penaltyMatches.length,
      extraTimeCount: extraTimeMatches.length,
      peakTournament,
      troughTournament,
      totalGoals: matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0),
    };
  }, [matches, scorigami]);

  function flag(code: string, year: number) {
    return (
      <img
        src={getFlagSrc(code, year)}
        alt=""
        className="inline-block w-5 h-3.5 object-cover rounded-sm border border-zinc-200 dark:border-zinc-700 align-text-bottom"
      />
    );
  }

  function matchLine(m: Match) {
    const year = parseInt(m.date.slice(0, 4));
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {flag(m.homeCode, year)} {m.homeTeam}{" "}
        <span className="font-bold">{m.homeScore}–{m.awayScore}</span>{" "}
        {flag(m.awayCode, year)} {m.awayTeam}
        <span className="text-zinc-400 text-xs">({m.date.slice(0, 4)})</span>
      </span>
    );
  }

  return (
    <div className="space-y-8">
      {/* Most recent scorigami */}
      {facts.mostRecent && (
        <section className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">{t("mostRecentTitle")}</h3>
          <div className="text-sm space-y-1">
            <div>{matchLine(facts.mostRecent)}</div>
            <p className="text-zinc-500 text-xs mt-2">
              {tStages(facts.mostRecent.stage)} · {facts.mostRecent.city}, {facts.mostRecent.country}
            </p>
            <p className="text-zinc-500 text-xs">{t("mostRecentNote")}</p>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* True scorigamis */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("trueScorigamisTitle")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("trueScorigamisDesc")}</p>
          <div className="space-y-2 text-sm">
            {facts.uniqueScores
              .sort((a, b) => a.firstMatch.date.localeCompare(b.firstMatch.date))
              .map((s) => (
                <div key={`${s.lowScore}-${s.highScore}`} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="font-bold text-amber-600 dark:text-amber-400 w-10">{s.lowScore}–{s.highScore}</span>
                  <span className="flex-1">{matchLine(s.firstMatch)}</span>
                </div>
              ))}
          </div>
        </section>

        {/* Most common scorelines */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("mostCommonTitle")}</h3>
          <div className="space-y-2 text-sm">
            {facts.mostCommon.map((s, i) => (
              <div key={`${s.lowScore}-${s.highScore}`} className="flex items-center gap-3 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{i + 1}.</span>
                <span className="font-bold w-10">{s.lowScore}–{s.highScore}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${(s.count / facts.mostCommon[0].count) * 100}%` }} />
                  <span className="text-zinc-500 text-xs">{s.count}×</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Highest-scoring matches */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("highestScoringTitle")}</h3>
          <div className="space-y-2 text-sm">
            {facts.highestScoring.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{m.homeScore + m.awayScore}</span>
                <span className="flex-1">{matchLine(m)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Biggest blowouts */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("biggestBlowoutsTitle")}</h3>
          <div className="space-y-2 text-sm">
            {facts.mostLopsided.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">+{Math.abs(m.homeScore - m.awayScore)}</span>
                <span className="flex-1">{matchLine(m)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Scorigami kings */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("scorigamiKingsTitle")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("scorigamiKingsDesc")}</p>
          <div className="space-y-2 text-sm">
            {facts.topTeams.map((team) => (
              <div key={team.team} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="flex-1 flex items-center gap-1.5">
                  {flag(team.code, 2022)} {team.team}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{team.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Finals scoreline */}
        {facts.topFinalScore && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-bold mb-3">{t("finalsTitle")}</h3>
            <p className="text-sm">
              {t("finalsDesc", {
                score: facts.topFinalScore.score,
                count: facts.topFinalScore.count,
                years: facts.topFinalScore.years.join(", "),
              })}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-zinc-100 dark:bg-zinc-800 p-2">
                <div className="font-bold text-lg">{facts.extraTimeCount}</div>
                <div className="text-zinc-500">{t("extraTimeGames")}</div>
              </div>
              <div className="rounded bg-zinc-100 dark:bg-zinc-800 p-2">
                <div className="font-bold text-lg">{facts.penaltyCount}</div>
                <div className="text-zinc-500">{t("penaltyShootouts")}</div>
              </div>
              <div className="rounded bg-zinc-100 dark:bg-zinc-800 p-2">
                <div className="font-bold text-lg">{facts.totalGoals.toLocaleString()}</div>
                <div className="text-zinc-500">{t("totalGoals")}</div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Goals per era */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <h3 className="font-bold mb-1">{t("goalsPerEraTitle")}</h3>
        <p className="text-xs text-zinc-500 mb-3">
          {t("goalsPerEraPeak", {
            peak: facts.peakTournament.name.replace(" FIFA Men's World Cup", ""),
            peakAvg: facts.peakTournament.avg.toFixed(2),
            trough: facts.troughTournament.name.replace(" FIFA Men's World Cup", ""),
            troughAvg: facts.troughTournament.avg.toFixed(2),
          })}
        </p>
        <div className="flex items-end gap-1" style={{ height: 160 }}>
          {facts.eras.map((era) => {
            const minAvg = Math.min(...facts.eras.map((e) => e.avg));
            const maxAvg = Math.max(...facts.eras.map((e) => e.avg));
            const pct = 15 + ((era.avg - minAvg) / (maxAvg - minAvg)) * 85;
            const barHeight = Math.round((pct / 100) * 120);
            return (
              <div key={era.era} className="flex-1 flex flex-col items-center justify-end" style={{ height: 160 }}>
                <span className="text-[10px] text-zinc-500 mb-1">{era.avg}</span>
                <div
                  className="w-full rounded-t bg-zinc-900 dark:bg-zinc-100"
                  style={{ height: barHeight }}
                />
                <span className="text-[10px] text-zinc-400 mt-1">{era.era.slice(0, 4)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scorigami frontier */}
      <section className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
        <h3 className="font-bold mb-2">{t("frontierTitle")}</h3>
        <p className="text-sm text-zinc-500 mb-3">{t("frontierDesc")}</p>
        <div className="flex flex-wrap gap-2">
          {["4–5", "1–8", "5–5", "4–6", "0–10"].map((score) => (
            <span
              key={score}
              className="px-3 py-1.5 rounded-full border border-dashed border-amber-400 text-amber-600 dark:text-amber-400 text-sm font-mono font-bold"
            >
              {score}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-3">{t("frontierNote")}</p>
      </section>
    </div>
  );
}
