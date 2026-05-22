"use client";

import { useMemo, useState } from "react";
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

interface TournamentStats {
  year: string;
  teams: number;
  matches: number;
  goalsPerGame: number;
  scorigamis: number;
}

export default function FunFacts({ matches, scorigami }: Props) {
  const t = useTranslations("funFacts");
  const tStages = useTranslations("stages");

  const facts = useMemo(() => {
    const uniqueScores = scorigami.filter((s) => s.count === 1);
    const mostCommon = [...scorigami].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      // Tiebreak: fewer total goals first (more "common" feeling scores)
      const totalA = a.highScore + a.lowScore;
      const totalB = b.highScore + b.lowScore;
      if (totalA !== totalB) return totalA - totalB;
      // Then by margin ascending
      return (a.highScore - a.lowScore) - (b.highScore - b.lowScore);
    });

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

    // Teams with most all-time scorigamis (first occurrence of any scoreline)
    const allScorigamiTeams: Record<string, { code: string; count: number }> = {};
    for (const s of scorigami) {
      const m = s.firstMatch;
      for (const [team, code] of [[m.homeTeam, m.homeCode], [m.awayTeam, m.awayCode]]) {
        if (!allScorigamiTeams[team]) allScorigamiTeams[team] = { code, count: 0 };
        allScorigamiTeams[team].count++;
      }
    }
    const scorigamiLeaders: TeamScorigamiCount[] = Object.entries(allScorigamiTeams)
      .map(([team, { code, count }]) => ({ team, code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Scorigamis by stage
    const stageOrder = ["group stage", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final"];
    const scorigamiByStage: Record<string, number> = {};
    for (const s of scorigami) {
      if (s.count === 1) {
        const stage = s.firstMatch.stage;
        scorigamiByStage[stage] = (scorigamiByStage[stage] || 0) + 1;
      }
    }

    // Tournament-level stats
    const tournamentData = new Map<string, { goals: number; matches: number; teams: Set<string> }>();
    for (const m of matches) {
      const year = m.tournament.replace(" FIFA Men's World Cup", "");
      const d = tournamentData.get(year) || { goals: 0, matches: 0, teams: new Set<string>() };
      d.goals += m.homeScore + m.awayScore;
      d.matches++;
      d.teams.add(m.homeTeam);
      d.teams.add(m.awayTeam);
      tournamentData.set(year, d);
    }
    const scorigamiByTournament = new Map<string, number>();
    for (const s of scorigami) {
      if (s.count > 0) {
        const year = s.firstMatch.tournament.replace(" FIFA Men's World Cup", "");
        scorigamiByTournament.set(year, (scorigamiByTournament.get(year) || 0) + 1);
      }
    }
    const tournamentStats: TournamentStats[] = [...tournamentData.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, { goals, matches: count, teams }]) => ({
        year,
        teams: teams.size,
        matches: count,
        goalsPerGame: Math.round((goals / count) * 100) / 100,
        scorigamis: scorigamiByTournament.get(year) || 0,
      }));

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
      const key = `${hi}-${lo}`;
      if (!finalScores[key]) finalScores[key] = { count: 0, years: [] };
      finalScores[key].count++;
      finalScores[key].years.push(m.date.slice(0, 4));
    }
    const topFinalScore = Object.entries(finalScores).sort((a, b) => b[1].count - a[1].count)[0];

    // Finals scorigamis — finals where the scoreline happened for the first time ever
    const scorigamiFirstMatches = new Set(
      scorigami.map((s) => `${s.firstMatch.date}|${s.firstMatch.homeTeam}|${s.firstMatch.awayTeam}`)
    );
    const finalsScorigamis = finals.filter((m) =>
      scorigamiFirstMatches.has(`${m.date}|${m.homeTeam}|${m.awayTeam}`)
    );

    // Host country scorigamis — scorigamis where the host nation was involved
    const hostScorigamis: { match: Match; hostTeam: string }[] = [];
    for (const s of scorigami) {
      const m = s.firstMatch;
      const hostCountry = m.country;
      if (m.homeTeam === hostCountry || m.awayTeam === hostCountry) {
        hostScorigamis.push({ match: m, hostTeam: hostCountry });
      }
    }
    hostScorigamis.sort((a, b) => a.match.date.localeCompare(b.match.date));

    // Penalty shootout stats
    const penaltyMatches = matches.filter((m) => m.penaltyShootout);
    const extraTimeMatches = matches.filter((m) => m.extraTime);

    // Goal distribution histogram data
    const goalDistribution: { totalGoals: number; count: number }[] = [];
    const goalCounts: Record<number, number> = {};
    for (const m of matches) {
      const total = m.homeScore + m.awayScore;
      const bucket = total >= 8 ? 8 : total;
      goalCounts[bucket] = (goalCounts[bucket] || 0) + 1;
    }
    for (let i = 0; i <= 8; i++) {
      goalDistribution.push({ totalGoals: i, count: goalCounts[i] || 0 });
    }

    // Stage breakdown: scorigami rate by stage
    const allStages = [
      "group stage", "second group stage", "round of 32", "round of 16",
      "quarter-finals", "semi-finals", "third-place match", "final round", "final",
    ];
    const matchesByStage: Record<string, number> = {};
    for (const m of matches) {
      matchesByStage[m.stage] = (matchesByStage[m.stage] || 0) + 1;
    }
    // All scorigamis (first occurrence) by stage
    const allScorigamiByStage: Record<string, number> = {};
    for (const s of scorigami) {
      const stage = s.firstMatch.stage;
      allScorigamiByStage[stage] = (allScorigamiByStage[stage] || 0) + 1;
    }
    const stageBreakdown = allStages
      .filter((s) => matchesByStage[s])
      .map((stage) => ({
        stage,
        totalMatches: matchesByStage[stage] || 0,
        scorigamis: allScorigamiByStage[stage] || 0,
        rate: matchesByStage[stage] ? ((allScorigamiByStage[stage] || 0) / matchesByStage[stage]) * 100 : 0,
      }));
    // Group stage vs knockout summary
    const groupStages = ["group stage", "second group stage"];
    const knockoutStages = ["round of 32", "round of 16", "quarter-finals", "semi-finals", "third-place match", "final round", "final"];
    const groupTotal = groupStages.reduce((s, st) => s + (matchesByStage[st] || 0), 0);
    const groupScorigami = groupStages.reduce((s, st) => s + (allScorigamiByStage[st] || 0), 0);
    const knockoutTotal = knockoutStages.reduce((s, st) => s + (matchesByStage[st] || 0), 0);
    const knockoutScorigami = knockoutStages.reduce((s, st) => s + (allScorigamiByStage[st] || 0), 0);
    const stageSummary = {
      group: { total: groupTotal, scorigamis: groupScorigami, rate: groupTotal ? (groupScorigami / groupTotal) * 100 : 0 },
      knockout: { total: knockoutTotal, scorigamis: knockoutScorigami, rate: knockoutTotal ? (knockoutScorigami / knockoutTotal) * 100 : 0 },
    };
    // Stage with most scorigamis
    const topScorigamiStage = stageBreakdown.reduce((best, s) => s.scorigamis > best.scorigamis ? s : best, stageBreakdown[0]);

    return {
      uniqueScores,
      mostCommon: mostCommon.filter((s) => s.count > 0),
      highestScoring: byTotalGoals.filter((m) => m.homeScore + m.awayScore >= 10),
      mostLopsided: byMargin.slice(0, 5),
      mostRecent,
      topTeams,
      scorigamiLeaders,
      scorigamiByStage,
      stageOrder,
      tournamentStats,
      surprising,
      topFinalScore: topFinalScore
        ? { score: topFinalScore[0], ...topFinalScore[1] }
        : null,
      finalsScorigamis,
      hostScorigamis,
      penaltyCount: penaltyMatches.length,
      extraTimeCount: extraTimeMatches.length,
      totalGoals: matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0),
      goalDistribution,
      stageBreakdown,
      stageSummary,
      topScorigamiStage,
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
    let wTeam = m.homeTeam, wCode = m.homeCode, wScore = m.homeScore;
    let lTeam = m.awayTeam, lCode = m.awayCode, lScore = m.awayScore;
    if (m.homeScore < m.awayScore) {
      [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore];
    } else if (m.homeScore === m.awayScore && m.penaltyShootout && m.penaltyScore) {
      const [pH, pA] = m.penaltyScore.split("–").map(Number);
      if (pA > pH) { [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore]; }
    }
    return (
      <span className="flex items-center gap-2 w-full">
        <span className="flex-1 text-right font-medium flex items-center justify-end gap-1.5">
          {wTeam}
          {flag(wCode, year)}
        </span>
        <span className="font-bold w-16 text-center shrink-0">
          {wScore}–{lScore}
        </span>
        <span className="flex-1 font-medium flex items-center gap-1.5">
          {flag(lCode, year)}
          {lTeam}
        </span>
        <span className="text-zinc-400 text-xs shrink-0">({year})</span>
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
                  <span className="font-bold text-amber-600 dark:text-amber-400 w-10">{s.highScore}–{s.lowScore}</span>
                  <span className="flex-1">{matchLine(s.firstMatch)}</span>
                </div>
              ))}
          </div>
          {facts.topTeams.filter((t) => t.count > 1).length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                {t("scorigamiKingsNote", {
                  teams: facts.topTeams
                    .filter((t) => t.count > 1)
                    .map((t) => `${t.team} (${t.count})`)
                    .join(", "),
                })}
              </p>
            </div>
          )}
        </section>

        {/* Most common scorelines */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("mostCommonTitle")}</h3>
          <div className="space-y-2 text-sm max-h-[333px] overflow-y-auto">
            {facts.mostCommon.map((s, i) => (
              <div key={`${s.lowScore}-${s.highScore}`} className="flex items-center gap-3 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{i + 1}.</span>
                <span className="font-bold w-10">{s.highScore}–{s.lowScore}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${(s.count / facts.mostCommon[0].count) * 100}%` }} />
                  <span className="text-zinc-500 text-xs">{s.count}×</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Score distribution visualizations */}
        <ScoreDistribution mostCommon={facts.mostCommon} totalMatches={matches.length} />

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

        {/* Scorigami leaders (all-time) */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold mb-3">{t("scorigamiLeadersTitle")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("scorigamiLeadersDesc")}</p>
          <div className="space-y-2 text-sm">
            {facts.scorigamiLeaders.map((team, i) => (
              <div key={team.team} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{i + 1}.</span>
                <span className="flex-1 flex items-center gap-1.5">
                  {flag(team.code, 2022)} {team.team}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{team.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Finals + All-time stats stacked */}
        <div className="flex flex-col gap-6">
          {facts.topFinalScore && (
            <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex-1">
              <h3 className="font-bold mb-2">{t("finalsTitle")}</h3>
              <p className="text-sm">
                {t("finalsDesc", {
                  score: facts.topFinalScore.score,
                  count: facts.topFinalScore.count,
                  years: facts.topFinalScore.years.join(", "),
                })}
              </p>
              {facts.finalsScorigamis.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">{t("finalsScorigamiTitle")}</p>
                  <div className="space-y-1 text-sm">
                    {facts.finalsScorigamis.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <span className="text-amber-500">⚽</span>
                        <span className="flex-1">{matchLine(m)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex-1">
            <h3 className="font-bold mb-2">{t("allTimeStatsTitle")}</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
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
        </div>

        {/* Home turf scorigamis */}
        {facts.hostScorigamis.length > 0 && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-bold mb-3">{t("homeTurfTitle")}</h3>
            <p className="text-xs text-zinc-500 mb-3">{t("homeTurfDesc", { count: facts.hostScorigamis.length })}</p>
            <div className="space-y-2 text-sm">
              {facts.hostScorigamis.map((h, i) => {
                const m = h.match;
                const lo = Math.min(m.homeScore, m.awayScore);
                const hi = Math.max(m.homeScore, m.awayScore);
                const year = parseInt(m.date.slice(0, 4));
                let wTeam = m.homeTeam, wCode = m.homeCode, wScore = m.homeScore;
                let lTeam = m.awayTeam, lCode = m.awayCode, lScore = m.awayScore;
                if (m.homeScore < m.awayScore) {
                  [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore];
                } else if (m.homeScore === m.awayScore && m.penaltyShootout && m.penaltyScore) {
                  const [pH, pA] = m.penaltyScore.split("–").map(Number);
                  if (pA > pH) { [wTeam, lTeam] = [lTeam, wTeam]; [wCode, lCode] = [lCode, wCode]; [wScore, lScore] = [lScore, wScore]; }
                }
                const isWinnerHost = wTeam === h.hostTeam;
                const isLoserHost = lTeam === h.hostTeam;
                return (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="font-bold text-amber-600 dark:text-amber-400 w-10">{hi}–{lo}</span>
                    <span className="flex items-center gap-2 w-full">
                      <span className="flex-1 text-right font-medium flex items-center justify-end gap-1.5">
                        <span className={isWinnerHost ? "underline decoration-amber-400 decoration-2 underline-offset-2" : ""}>{wTeam}</span>
                        {flag(wCode, year)}
                      </span>
                      <span className="font-bold w-16 text-center shrink-0">{wScore}–{lScore}</span>
                      <span className="flex-1 font-medium flex items-center gap-1.5">
                        {flag(lCode, year)}
                        <span className={isLoserHost ? "underline decoration-amber-400 decoration-2 underline-offset-2" : ""}>{lTeam}</span>
                      </span>
                      <span className="text-zinc-400 text-xs shrink-0">({year})</span>
                    </span>
                    <span className="text-xs text-zinc-400">🏟️</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Goal distribution histogram */}
      <GoalDistributionHistogram goalDistribution={facts.goalDistribution} totalMatches={matches.length} t={t} />

      {/* Stage breakdown */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <h3 className="font-bold mb-4">{t("stageBreakdownTitle")}</h3>
        <p className="text-xs text-zinc-500 mb-4">{t("stageBreakdownDesc")}</p>

        {/* Summary: Group vs Knockout */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">{t("stageGroupLabel")}</div>
            <div className="font-bold text-lg">{facts.stageSummary.group.rate.toFixed(1)}%</div>
            <div className="text-[10px] text-zinc-400">
              {t("stageSummaryDetail", { scorigamis: facts.stageSummary.group.scorigamis, total: facts.stageSummary.group.total })}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">{t("stageKnockoutLabel")}</div>
            <div className="font-bold text-lg">{facts.stageSummary.knockout.rate.toFixed(1)}%</div>
            <div className="text-[10px] text-zinc-400">
              {t("stageSummaryDetail", { scorigamis: facts.stageSummary.knockout.scorigamis, total: facts.stageSummary.knockout.total })}
            </div>
          </div>
        </div>

        {/* Per-stage horizontal bars */}
        <div className="space-y-2">
          {facts.stageBreakdown.map((s) => {
            const maxRate = Math.max(...facts.stageBreakdown.map((sb) => sb.rate));
            const barWidth = maxRate > 0 ? (s.rate / maxRate) * 100 : 0;
            const isTop = facts.topScorigamiStage && s.stage === facts.topScorigamiStage.stage;
            return (
              <div key={s.stage} className="flex items-center gap-2 text-sm">
                <span className="w-32 text-right text-xs text-zinc-500 shrink-0">{tStages(s.stage)}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isTop ? "#f59e0b" : "#3b82f6",
                        minWidth: s.rate > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className={`text-xs w-24 shrink-0 ${isTop ? "font-bold text-amber-600 dark:text-amber-400" : "text-zinc-500"}`}>
                    {s.rate.toFixed(1)}% ({s.scorigamis}/{s.totalMatches})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {facts.topScorigamiStage && (
          <p className="text-xs text-zinc-400 mt-3">
            {t("stageTopNote", {
              stage: tStages(facts.topScorigamiStage.stage),
              count: facts.topScorigamiStage.scorigamis,
              rate: facts.topScorigamiStage.rate.toFixed(1),
            })}
          </p>
        )}
      </section>

      {/* Tournament trends */}
      <TournamentTrends facts={facts} t={t} />

      {/* Scorigami frontier — below trends */}
      <section className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
        <h3 className="font-bold mb-2">{t("frontierTitle")}</h3>
        <p className="text-sm text-zinc-500 mb-3">{t("frontierDesc")}</p>
        <div className="flex flex-wrap gap-2">
          {["5–4", "8–1", "5–5", "6–4", "10–0"].map((score) => (
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

/* ─── Goal Distribution Histogram ─── */
function GoalDistributionHistogram({
  goalDistribution,
  totalMatches,
  t,
}: {
  goalDistribution: { totalGoals: number; count: number }[];
  totalMatches: number;
  t: ReturnType<typeof useTranslations<"funFacts">>;
}) {
  const [hovered, setHovered] = useState<{ totalGoals: number; count: number; pct: string; x: number; y: number } | null>(null);

  const maxCount = Math.max(...goalDistribution.map((d) => d.count));
  const w = 340;
  const h = 180;
  const pad = { top: 20, bottom: 28, left: 10, right: 10 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const barCount = goalDistribution.length;
  const barGap = 4;
  const barW = (plotW - barGap * (barCount - 1)) / barCount;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="font-bold mb-2">{t("goalDistTitle")}</h3>
      <p className="text-xs text-zinc-500 mb-3">{t("goalDistDesc")}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 220 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="histBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line x1={pad.left} y1={pad.top + plotH} x2={w - pad.right} y2={pad.top + plotH} stroke="currentColor" strokeOpacity={0.15} />

        {goalDistribution.map((d, i) => {
          const barH = maxCount > 0 ? (d.count / maxCount) * plotH : 0;
          const x = pad.left + i * (barW + barGap);
          const y = pad.top + plotH - barH;
          const pct = ((d.count / totalMatches) * 100).toFixed(1);
          const isHovered = hovered?.totalGoals === d.totalGoals;
          const label = d.totalGoals === 8 ? "8+" : `${d.totalGoals}`;

          return (
            <g key={d.totalGoals}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill="url(#histBarGrad)"
                opacity={hovered && !isHovered ? 0.4 : 0.85}
                stroke={isHovered ? "#93c5fd" : "none"}
                strokeWidth={isHovered ? 1.5 : 0}
                style={{ transition: "opacity 0.15s" }}
              />
              {/* Count label on top */}
              {barH > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="bold"
                  fill="currentColor"
                  opacity={isHovered ? 1 : 0.6}
                >
                  {d.count}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={x + barW / 2}
                y={pad.top + plotH + 14}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {label}
              </text>
              {/* Invisible hit target */}
              <rect
                x={x - 2}
                y={pad.top}
                width={barW + 4}
                height={plotH + 4}
                fill="transparent"
                onMouseEnter={() => setHovered({ totalGoals: d.totalGoals, count: d.count, pct, x: x + barW / 2, y })}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hovered && (() => {
          const label = hovered.totalGoals === 8 ? "8+" : `${hovered.totalGoals}`;
          const text = `${label} goals: ${hovered.count} matches (${hovered.pct}%)`;
          const tw = text.length * 5.5 + 14;
          const th = 18;
          const tx = Math.max(1, Math.min(hovered.x - tw / 2, w - pad.right - tw));
          const ty = Math.max(1, hovered.y - th - 8);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#18181b" opacity={0.95} stroke="#60a5fa" strokeWidth={0.5} />
              <text x={tx + tw / 2} y={ty + th / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="white" fontWeight="bold">{text}</text>
            </g>
          );
        })()}
      </svg>
      <p className="text-[10px] text-zinc-400 mt-1 text-center">{t("goalDistNote")}</p>
    </section>
  );
}

/* ─── Extracted chart component so it can own hover state ─── */
interface TrendChartProps {
  chartKey: "teams" | "matches" | "goalsPerGame" | "scorigamis";
  label: string;
  color: string;
  tournamentStats: TournamentStats[];
}

// Callout annotations per chart
interface PointAnnotation { type?: "point"; year: number; text: string; anchor?: "start" | "end" | "middle"; dy?: number }
interface SpanAnnotation { type: "span"; fromYear: number; toYear: number; text: string }
type Annotation = PointAnnotation | SpanAnnotation;

const ANNOTATIONS: Record<string, Annotation[]> = {
  teams: [
    { year: 1982, text: "→ 24 teams", anchor: "start", dy: -6 },
    { year: 1998, text: "→ 32 teams", anchor: "start", dy: -6 },
    { year: 2026, text: "→ 48 teams", anchor: "end", dy: -6 },
  ],
  matches: [
    { year: 1982, text: "52 games", anchor: "start", dy: -6 },
    { year: 1998, text: "64 games", anchor: "start", dy: -6 },
    { year: 2026, text: "104 games", anchor: "end", dy: -6 },
  ],
  goalsPerGame: [
    { year: 1954, text: "5.38 GPG", anchor: "start", dy: -6 },
    { year: 2022, text: "2.56 GPG", anchor: "end", dy: -6 },
  ],
  scorigamis: [
    { year: 1930, text: "1st WC: 9 new", anchor: "start", dy: -6 },
    { year: 1954, text: "8 new scores", anchor: "start", dy: -6 },
    { year: 1982, text: "Last: 1 new", anchor: "start", dy: -6 },
    { year: 2022, text: "End: 1 new", anchor: "end", dy: -6 },
    { type: "span", fromYear: 1982, toYear: 2022, text: "The Great Drought-igami" },
  ],
};

function TrendChart({ chartKey, label, color, tournamentStats }: TrendChartProps) {
  const [hovered, setHovered] = useState<{ x: number; y: number; val: number; year: string } | null>(null);

  const allWithGaps = [
    ...tournamentStats,
    { year: "2026", teams: 48, matches: 104, goalsPerGame: 0, scorigamis: 0 },
  ];
  const minYear = 1930;
  const maxYear = 2026;
  const yearRange = maxYear - minYear;

  const dataPoints = allWithGaps.filter((s) => s.year !== "2026" || chartKey === "teams" || chartKey === "matches");

  const values = dataPoints.map((s) => s[chartKey]);
  const rawMax = Math.max(...values);
  const min = 0; // Always start y-axis at 0
  const max = rawMax * 1.15; // 15% breathing room above highest value
  const range = max - min || 1;
  const annotations = ANNOTATIONS[chartKey] || [];
  const hasSpan = annotations.some((a) => a.type === "span");
  const w = 340;
  const h = hasSpan ? 138 : 120;
  const pad = { top: 12, bottom: hasSpan ? 40 : 22, left: 8, right: 30 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const yearToX = (year: number) => pad.left + ((year - minYear) / yearRange) * plotW;
  const valToY = (val: number) => pad.top + plotH - ((val - min) / range) * plotH;

  const points = dataPoints.map((s) => {
    const yr = parseInt(s.year);
    return {
      x: yearToX(yr),
      y: valToY(s[chartKey]),
      val: s[chartKey],
      year: s.year,
      is2026: s.year === "2026",
    };
  });

  const realPoints = points.filter((p) => !p.is2026);
  const point2026 = points.find((p) => p.is2026);

  // Split line path at WWII gap (between 1938 and 1950)
  const preWar = realPoints.filter((p) => parseInt(p.year) <= 1938);
  const postWar = realPoints.filter((p) => parseInt(p.year) >= 1950);
  const preWarPath = preWar.length > 0 ? preWar.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") : "";
  const postWarPath = postWar.length > 0 ? postWar.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") : "";

  const labelYears = [1930, 1950, 1970, 1990, 2010, 2026];

  // WWII bar bounds: 1940–1948
  const wwiiX1 = yearToX(1940);
  const wwiiX2 = yearToX(1948);
  const wwiiXMid = (wwiiX1 + wwiiX2) / 2;

  // Grid line values: 0, mid, max (nice rounded)
  const gridLines = [0, 0.5, 1].map((frac) => ({
    frac,
    yPos: pad.top + plotH - frac * plotH,
    val: min + frac * range,
  }));


  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: hasSpan ? 160 : 140 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {gridLines.map(({ frac, yPos, val }) => (
          <g key={frac}>
            <line x1={pad.left} y1={yPos} x2={w - pad.right} y2={yPos} stroke="currentColor" strokeOpacity={0.1} />
            <text x={w - pad.right + 3} y={yPos + 3} fontSize={7} fill="currentColor" opacity={0.4}>
              {chartKey === "goalsPerGame" ? val.toFixed(1) : Math.round(val)}
            </text>
          </g>
        ))}

        {/* WWII shaded region: 1940–1948 */}
        <rect x={wwiiX1 - 1} y={pad.top} width={wwiiX2 - wwiiX1 + 2} height={plotH} fill="currentColor" opacity={0.03} />
        <line x1={wwiiX1} y1={pad.top} x2={wwiiX1} y2={pad.top + plotH} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
        <line x1={wwiiX2} y1={pad.top} x2={wwiiX2} y2={pad.top + plotH} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
        <text x={wwiiXMid} y={pad.top + plotH / 2 + 2} textAnchor="middle" fontSize={5} fill="currentColor" opacity={0.25}>
          WWII
        </text>

        {/* Line paths — broken at WWII gap with dashed connector */}
        {preWarPath && <path d={preWarPath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
        {preWar.length > 0 && postWar.length > 0 && (
          <line x1={preWar[preWar.length - 1].x} y1={preWar[preWar.length - 1].y} x2={postWar[0].x} y2={postWar[0].y} stroke={color} strokeWidth={1.5} strokeOpacity={0.35} strokeDasharray="4,3" />
        )}
        {postWarPath && <path d={postWarPath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}

        {/* Data point circles */}
        {realPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered?.year === p.year ? 4 : 2} fill={color} className="transition-all duration-100" />
        ))}

        {/* Callout annotations */}
        {annotations.map((ann, ai) => {
          if (ann.type === "span") {
            // Span annotation: bracket with label between two years
            const x1 = yearToX(ann.fromYear);
            const x2 = yearToX(ann.toYear);
            const xMid = (x1 + x2) / 2;
            const bracketY = pad.top + plotH + 10;
            const textW = ann.text.length * 4.5 + 10;
            return (
              <g key={`span-${ai}`}>
                {/* Bracket lines */}
                <line x1={x1} y1={bracketY - 4} x2={x1} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                <line x1={x1} y1={bracketY} x2={x2} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                <line x1={x2} y1={bracketY - 4} x2={x2} y2={bracketY} stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
                {/* Label background */}
                <rect x={xMid - textW / 2} y={bracketY + 1} width={textW} height={12} rx={2} fill="var(--color-zinc-900, #18181b)" fillOpacity={0.7} />
                {/* Label text */}
                <text x={xMid} y={bracketY + 10} textAnchor="middle" fontSize={7.5} fill={color} fontWeight="600" fontStyle="italic" opacity={0.85}>
                  {ann.text}
                </text>
              </g>
            );
          }
          // Point annotation
          const pt = points.find((p) => parseInt(p.year) === ann.year);
          if (!pt) return null;
          const ax = pt.x;
          const ay = pt.y + (ann.dy ?? -6);
          const arrowLen = 6;
          return (
            <g key={`ann-${ann.year}`}>
              {/* Arrow line from label to point */}
              <line x1={ax} y1={ay} x2={ax} y2={pt.y - 3} stroke={color} strokeWidth={0.8} strokeOpacity={0.6} />
              {/* Arrowhead */}
              <polygon
                points={`${ax},${pt.y - 2} ${ax - 1.5},${pt.y - arrowLen} ${ax + 1.5},${pt.y - arrowLen}`}
                fill={color}
                opacity={0.6}
              />
              {/* Label background */}
              {(() => {
                const textW = ann.text.length * 5.2 + 8;
                const bgX = ann.anchor === "end" ? ax - textW : ann.anchor === "start" ? ax : ax - textW / 2;
                return (
                  <rect x={bgX} y={ay - 14} width={textW} height={13} rx={2} fill="var(--color-zinc-900, #18181b)" fillOpacity={0.7} />
                );
              })()}
              {/* Label text */}
              <text
                x={ann.anchor === "end" ? ax - 3 : ann.anchor === "start" ? ax + 3 : ax}
                y={ay - 5}
                textAnchor={ann.anchor ?? "middle"}
                fontSize={8.5}
                fill={color}
                fontWeight="600"
                opacity={0.9}
              >
                {ann.text}
              </text>
            </g>
          );
        })}

        {/* Invisible larger hit targets for hover */}
        {realPoints.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={p.x}
            cy={p.y}
            r={8}
            fill="transparent"
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {/* 2026 projected point */}
        {point2026 && (
          <circle cx={point2026.x} cy={point2026.y} r={3} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
        )}

        {/* Hover tooltip */}
        {hovered && (() => {
          const displayVal = chartKey === "goalsPerGame" ? hovered.val.toFixed(2) : hovered.val;
          const text = `${hovered.year}: ${displayVal}`;
          const textWidth = text.length * 6.5 + 14;
          const tooltipH = 18;
          const tooltipX = Math.max(pad.left, Math.min(hovered.x - textWidth / 2, w - pad.right - textWidth));
          const tooltipY = hovered.y - 22;
          return (
            <g>
              <line x1={hovered.x} y1={hovered.y} x2={hovered.x} y2={pad.top + plotH} stroke={color} strokeOpacity={0.3} strokeDasharray="2,2" />
              <rect x={tooltipX} y={tooltipY - 2} width={textWidth} height={tooltipH} rx={4} fill="var(--color-zinc-800, #27272a)" stroke={color} strokeWidth={0.5} opacity={0.95} />
              <text x={tooltipX + textWidth / 2} y={tooltipY + tooltipH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fontWeight="bold">
                {text}
              </text>
            </g>
          );
        })()}

        {/* Year labels */}
        {labelYears.map((yr) => (
          <text key={yr} x={yearToX(yr)} y={h - 4} textAnchor="middle" fontSize={7} fill="currentColor" opacity={0.4}>
            {yr}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ─── Rarity color mapping (matches heatmap legend) ─── */
const RARITY_COLORS = {
  veryCommon: "#93c5fd", // blue-300 (dark mode heatmap)
  common: "#3b82f6",     // blue-500
  rare: "#1d4ed8",       // blue-700 (dark mode heatmap)
  veryRare: "#ea580c",   // orange-600
  unique: "#f59e0b",     // amber-500
};

type Rarity = "veryCommon" | "common" | "rare" | "veryRare" | "unique";

function getRarity(count: number, maxCount: number): Rarity {
  if (count === 1) return "unique";
  const ratio = count / maxCount;
  if (ratio < 0.02) return "veryRare";
  if (ratio < 0.15) return "rare";
  if (ratio < 0.4) return "common";
  return "veryCommon";
}

function getRarityColor(count: number, maxCount: number): string {
  return RARITY_COLORS[getRarity(count, maxCount)];
}

/* ─── Score Distribution: Donut + Treemap with hover ─── */
function ScoreDistribution({ mostCommon, totalMatches }: { mostCommon: ScorigamiEntry[]; totalMatches: number }) {
  const [donutHover, setDonutHover] = useState<{ label: string; count: number; pct: string; cx: number; cy: number } | null>(null);
  const [treemapHover, setTreemapHover] = useState<{ label: string; count: number; pct: string; x: number; y: number } | null>(null);

  const maxCount = mostCommon[0]?.count ?? 1;

  // Donut: group all scores by rarity category
  const rarityGroups: { label: string; rarity: Rarity; count: number; scores: string[] }[] = [
    { label: "Very Common", rarity: "veryCommon", count: 0, scores: [] },
    { label: "Common", rarity: "common", count: 0, scores: [] },
    { label: "Rare", rarity: "rare", count: 0, scores: [] },
    { label: "Very Rare", rarity: "veryRare", count: 0, scores: [] },
    { label: "Unique", rarity: "unique", count: 0, scores: [] },
  ];
  for (const s of mostCommon) {
    const r = getRarity(s.count, maxCount);
    const group = rarityGroups.find((g) => g.rarity === r);
    if (group) {
      group.count += s.count;
      group.scores.push(`${s.highScore}–${s.lowScore}`);
    }
  }
  const donutItems = rarityGroups
    .filter((g) => g.count > 0)
    .map((g) => ({ label: g.label, count: g.count, color: RARITY_COLORS[g.rarity], scores: g.scores }));

  // Treemap: all scores broken out
  const treemapItems = mostCommon.map((s) => ({
    label: `${s.highScore}–${s.lowScore}`,
    count: s.count,
    color: getRarityColor(s.count, maxCount),
  }));

  // Donut geometry
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 85;
  const innerR = 50;
  let cumAngle = -Math.PI / 2;
  const arcs = donutItems.map((sl) => {
    const angle = (sl.count / totalMatches) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const midAngle = (startAngle + endAngle) / 2;
    const hoverR = (outerR + innerR) / 2;
    const hx = cx + hoverR * Math.cos(midAngle);
    const hy = cy + hoverR * Math.sin(midAngle);
    const pct = ((sl.count / totalMatches) * 100).toFixed(1);
    return { path: `M${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${largeArc} 0 ${ix2},${iy2} Z`, ...sl, pct, hx, hy };
  });

  // Treemap layout
  type TmItem = { label: string; count: number; color: string };
  type TmRect = { x: number; y: number; w: number; h: number; label: string; count: number; color: string };

  function layoutTreemap(itemsIn: TmItem[], x: number, y: number, w: number, h: number): TmRect[] {
    if (itemsIn.length === 0) return [];
    if (itemsIn.length === 1) return [{ x, y, w, h, ...itemsIn[0] }];
    const totalVal = itemsIn.reduce((s, it) => s + it.count, 0);
    const isHoriz = w >= h;
    const sideLen = isHoriz ? h : w;
    let best = 1;
    let bestWorst = Infinity;
    for (let i = 1; i <= itemsIn.length; i++) {
      const rowItems = itemsIn.slice(0, i);
      const rowVal = rowItems.reduce((s, it) => s + it.count, 0);
      const rowThickness = (rowVal / totalVal) * (isHoriz ? w : h);
      const worst = Math.max(...rowItems.map((it) => {
        const itemLen = (it.count / rowVal) * sideLen;
        return Math.max(rowThickness / itemLen, itemLen / rowThickness);
      }));
      if (worst <= bestWorst) { bestWorst = worst; best = i; }
      else break;
    }
    const rowItems = itemsIn.slice(0, best);
    const restItems = itemsIn.slice(best);
    const rowVal = rowItems.reduce((s, it) => s + it.count, 0);
    const rowThickness = (rowVal / totalVal) * (isHoriz ? w : h);
    const rects: TmRect[] = [];
    let offset = 0;
    for (const item of rowItems) {
      const itemLen = (item.count / rowVal) * sideLen;
      if (isHoriz) rects.push({ x, y: y + offset, w: rowThickness, h: itemLen, ...item });
      else rects.push({ x: x + offset, y, w: itemLen, h: rowThickness, ...item });
      offset += itemLen;
    }
    if (restItems.length > 0) {
      if (isHoriz) rects.push(...layoutTreemap(restItems, x + rowThickness, y, w - rowThickness, h));
      else rects.push(...layoutTreemap(restItems, x, y + rowThickness, w, h - rowThickness));
    }
    return rects;
  }

  const tmW = 320;
  const tmH = 200;
  const rects = layoutTreemap(treemapItems, 0, 0, tmW, tmH);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 md:col-span-2">
      <h3 className="font-bold mb-4">Score Distribution</h3>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Donut Chart</p>
          <div className="flex items-center gap-4">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 shrink-0" onMouseLeave={() => setDonutHover(null)}>
              {arcs.map((a, i) => (
                <path
                  key={i}
                  d={a.path}
                  fill={a.color}
                  stroke="var(--color-zinc-900, #18181b)"
                  strokeWidth={donutHover?.label === a.label ? 2.5 : 1.5}
                  opacity={donutHover && donutHover.label !== a.label ? 0.4 : 1}
                  onMouseEnter={() => setDonutHover({ label: a.label, count: a.count, pct: a.pct, cx: a.hx, cy: a.hy })}
                  onMouseLeave={() => setDonutHover(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
              ))}
              {/* Center text */}
              {donutHover ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="currentColor">{donutHover.label}</text>
                  <text x={cx} y={cy + 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>{donutHover.count} matches</text>
                  <text x={cx} y={cy + 18} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>({donutHover.pct}%)</text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight="bold" fill="currentColor">{totalMatches}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.5}>matches</text>
                </>
              )}
            </svg>
            <div className="flex flex-col gap-1.5 text-xs">
              {arcs.map((a, i) => (
                <div
                  key={i}
                  className="rounded px-1.5 py-1"
                  style={{ opacity: donutHover && donutHover.label !== a.label ? 0.4 : 1, transition: "opacity 0.15s", cursor: "pointer" }}
                  onMouseEnter={() => setDonutHover({ label: a.label, count: a.count, pct: a.pct, cx: a.hx, cy: a.hy })}
                  onMouseLeave={() => setDonutHover(null)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="font-bold">{a.label}</span>
                    <span className="text-zinc-400">{a.pct}%</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 ml-5 mt-0.5">{a.scores.slice(0, 5).join(", ")}{a.scores.length > 5 ? ` +${a.scores.length - 5}` : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Treemap */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Treemap</p>
          <svg viewBox={`0 0 ${tmW} ${tmH}`} className="w-full" style={{ height: 220 }} onMouseLeave={() => setTreemapHover(null)}>
            {rects.map((r, i) => (
              <g key={i}>
                <rect
                  x={r.x + 1} y={r.y + 1}
                  width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)}
                  rx={3} fill={r.color}
                  opacity={treemapHover && treemapHover.label !== r.label ? 0.35 : 0.85}
                  stroke={treemapHover?.label === r.label ? "white" : "none"}
                  strokeWidth={treemapHover?.label === r.label ? 2 : 0}
                  onMouseEnter={() => setTreemapHover({ label: r.label, count: r.count, pct: ((r.count / totalMatches) * 100).toFixed(1), x: r.x + r.w / 2, y: r.y + r.h / 2 })}
                  onMouseLeave={() => setTreemapHover(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
                {r.w > 30 && r.h > 18 && (
                  <>
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 3} textAnchor="middle" fontSize={r.w > 50 ? 12 : 9} fontWeight="bold" fill="white" pointerEvents="none">{r.label}</text>
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10} textAnchor="middle" fontSize={r.w > 50 ? 9 : 7} fill="white" opacity={0.7} pointerEvents="none">{r.count}×</text>
                  </>
                )}
              </g>
            ))}
            {/* Hover tooltip */}
            {treemapHover && (() => {
              const text = `${treemapHover.label}: ${treemapHover.count}× (${treemapHover.pct}%)`;
              const tw = text.length * 5.5 + 14;
              const th = 18;
              const tx = Math.max(1, Math.min(treemapHover.x - tw / 2, tmW - tw - 1));
              const ty = Math.max(1, treemapHover.y - th - 8);
              return (
                <g pointerEvents="none">
                  <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#18181b" opacity={0.95} stroke="white" strokeWidth={0.5} />
                  <text x={tx + tw / 2} y={ty + th / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="white" fontWeight="bold">{text}</text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </section>
  );
}

function TournamentTrends({ facts, t }: { facts: { tournamentStats: TournamentStats[] }; t: ReturnType<typeof useTranslations<"funFacts">> }) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="font-bold mb-4">{t("tournamentTrendsTitle")}</h3>
      <div className="grid md:grid-cols-2 gap-6">
        {([
          { key: "teams" as const, label: t("trendTeams"), color: "#3b82f6" },
          { key: "matches" as const, label: t("trendMatches"), color: "#10b981" },
          { key: "goalsPerGame" as const, label: t("trendGoalsPerGame"), color: "#f59e0b" },
          { key: "scorigamis" as const, label: t("trendScorigamis"), color: "#ef4444" },
        ]).map(({ key, label, color }) => (
          <TrendChart
            key={key}
            chartKey={key}
            label={label}
            color={color}
            tournamentStats={facts.tournamentStats}
          />
        ))}
      </div>
      <p className="text-[10px] text-zinc-400 mt-2 text-center">{t("wwiiNote")}</p>
    </section>
  );
}
