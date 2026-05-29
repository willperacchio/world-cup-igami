"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match, ScorigamiEntry } from "@/lib/types";
import { orientMatch } from "@/lib/match-utils";
import { getRarityChartColor } from "@/lib/rarity";
import { computeFunFacts, type HostScorigami } from "@/lib/stats";
import { Flag } from "./Flag";
import { MatchScoreline } from "./MatchScoreline";
import { TrendChart, GoalDistributionHistogram, ScoreDistribution } from "./charts";

interface Props {
  matches: Match[];
  scorigami: ScorigamiEntry[];
}

export default function FunFacts({ matches, scorigami }: Props) {
  const t = useTranslations("funFacts");
  const tStages = useTranslations("stages");

  const facts = useMemo(() => computeFunFacts(matches, scorigami), [matches, scorigami]);

  const maxCount = facts.mostCommon[0]?.count ?? 1;

  // Wrap the shared component for the compact scoreline used throughout this view.
  function matchLine(m: Match) {
    return <MatchScoreline match={m} orient="winner" showLinks linkVariant="icons" />;
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

      <div className="flex flex-col md:grid md:grid-cols-2 gap-6 min-w-0">
        {/* True scorigamis */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
          <h3 className="font-bold mb-3">{t("trueScorigamisTitle")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("trueScorigamisDesc")}</p>
          <div className="space-y-2 text-sm">
            {facts.uniqueScores
              .sort((a, b) => a.firstMatch.date.localeCompare(b.firstMatch.date))
              .map((s) => (
                <div key={`${s.lowScore}-${s.highScore}`} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0 min-w-0">
                  <span className="font-bold text-amber-600 dark:text-amber-400 w-10 shrink-0">{s.highScore}–{s.lowScore}</span>
                  <span className="flex-1 min-w-0 overflow-hidden">{matchLine(s.firstMatch)}</span>
                </div>
              ))}
          </div>
          {facts.topTeams.filter((team) => team.count > 1).length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                {t("scorigamiKingsNote", {
                  teams: facts.topTeams
                    .filter((team) => team.count > 1)
                    .map((team) => `${team.team} (${team.count})`)
                    .join(", "),
                })}
              </p>
            </div>
          )}
        </section>

        {/* Most common scorelines */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
          <h3 className="font-bold mb-3">{t("mostCommonTitle")}</h3>
          <div className="space-y-2 text-sm max-h-[333px] overflow-y-auto">
            {facts.mostCommon.map((s, i) => (
              <div key={`${s.lowScore}-${s.highScore}`} className="flex items-center gap-3 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{i + 1}.</span>
                <span className="font-bold w-10">{s.highScore}–{s.lowScore}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      backgroundColor: getRarityChartColor(s.count, maxCount),
                    }}
                  />
                  <span className="text-zinc-500 text-xs">{s.count}×</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs italic text-stone-500 mt-3 pt-1">
            {t("mostCommonNote")}
          </p>
        </section>

        {/* Score distribution visualizations */}
        <ScoreDistribution mostCommon={facts.mostCommon} totalMatches={matches.length} />

        {/* Highest-scoring matches */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
          <h3 className="font-bold mb-3">{t("highestScoringTitle")}</h3>
          <div className="space-y-2 text-sm">
            {facts.highestScoring.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0 min-w-0">
                <span className="text-zinc-400 text-xs w-4 shrink-0">{m.homeScore + m.awayScore}</span>
                <span className="flex-1 min-w-0 overflow-hidden">{matchLine(m)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Biggest blowouts */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
          <h3 className="font-bold mb-3">{t("biggestBlowoutsTitle")}</h3>
          <div className="space-y-2 text-sm">
            {facts.mostLopsided.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0 min-w-0">
                <span className="text-zinc-400 text-xs w-4 shrink-0">+{Math.abs(m.homeScore - m.awayScore)}</span>
                <span className="flex-1 min-w-0 overflow-hidden">{matchLine(m)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Scorigami leaders */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
          <h3 className="font-bold mb-3">{t("scorigamiLeadersTitle")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("scorigamiLeadersDesc")}</p>
          <div className="space-y-2 text-sm">
            {facts.scorigamiLeaders.map((team, i) => (
              <div key={team.team} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-400 text-xs w-4">{i + 1}.</span>
                <span className="flex-1 flex items-center gap-1.5">
                  <Flag code={team.code} year={2022} alt={team.team} /> {team.team}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{team.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* All-time stats */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden flex flex-col">
          <h3 className="font-bold mb-3">{t("allTimeStatsTitle")}</h3>
          {(() => {
            const totalMatches = matches.length;
            const knockoutMatches = matches.filter(
              (m) => !["group stage", "second group stage"].includes(m.stage),
            ).length;
            const goalsPerGame = (facts.totalGoals / totalMatches).toFixed(2);
            const etPct = ((facts.extraTimeCount / knockoutMatches) * 100).toFixed(1);
            const penPct = ((facts.penaltyCount / knockoutMatches) * 100).toFixed(1);

            return (
              <div className="flex-1 grid grid-cols-1 gap-3">
                <div className="flex-1 rounded-sm bg-[#161f1c]/60 border border-amber-400/20 px-5 py-4 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    {t("totalGoals")}
                  </span>
                  <span className="font-display text-3xl font-bold sb-numeral text-amber-300 mt-1">
                    {facts.totalGoals.toLocaleString()}
                  </span>
                  <p className="text-xs text-stone-500 mt-1">
                    <strong className="text-stone-300 sb-numeral">{goalsPerGame}</strong> per game across{" "}
                    <strong className="text-stone-300 sb-numeral">{totalMatches}</strong> matches
                  </p>
                </div>
                <div className="flex-1 rounded-sm bg-[#161f1c]/60 border border-amber-400/20 px-5 py-4 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    {t("extraTimeGames")}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display text-3xl font-bold sb-numeral text-stone-200">
                      {facts.extraTimeCount}
                    </span>
                    <span className="text-sm text-stone-400 sb-numeral">/ {knockoutMatches} knockout</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    <strong className="text-stone-300 sb-numeral">{etPct}%</strong> of knockout matches went to extra time
                  </p>
                </div>
                <div className="flex-1 rounded-sm bg-[#161f1c]/60 border border-amber-400/20 px-5 py-4 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    {t("penaltyShootouts")}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display text-3xl font-bold sb-numeral text-stone-200">
                      {facts.penaltyCount}
                    </span>
                    <span className="text-sm text-stone-400 sb-numeral">/ {knockoutMatches} knockout</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    <strong className="text-stone-300 sb-numeral">{penPct}%</strong> of knockout matches decided by penalties
                  </p>
                </div>
              </div>
            );
          })()}
        </section>

        {/* World Cup Finals */}
        {facts.topFinalScore && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 space-y-4 overflow-hidden flex flex-col">
            <h3 className="font-bold">{t("finalsScorigamiTitle")}</h3>

            {/* The one finals scorigami */}
            {facts.finalsScorigamis.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-stone-500">{t("finalsScorigamiDesc")}</p>
                <div className="text-sm">
                  {facts.finalsScorigamis.map((m, i) => (
                    <div key={i}>{matchLine(m)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Most common finals scorelines */}
            {(() => {
              const finalScores: Record<string, { count: number; years: string[] }> = {};
              for (const m of facts.allFinals) {
                const lo = Math.min(m.homeScore, m.awayScore);
                const hi = Math.max(m.homeScore, m.awayScore);
                const key = `${hi}–${lo}`;
                if (!finalScores[key]) finalScores[key] = { count: 0, years: [] };
                finalScores[key].count++;
                finalScores[key].years.push(m.date.slice(0, 4));
              }
              const sorted = Object.entries(finalScores)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);

              return (
                <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-500 text-center">
                    Most common finals scores
                  </p>
                  <div className="space-y-1 text-sm mx-auto">
                    {sorted.map(([score, data]) => (
                      <div key={score} className="flex items-center gap-3">
                        <span className="font-bold text-amber-300 sb-numeral w-10">{score}</span>
                        <span className="text-stone-400 sb-numeral text-xs">{data.count}×</span>
                        <span className="text-stone-500 text-xs font-mono sb-numeral">{data.years.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* Home turf scorigamis */}
        {facts.hostScorigamis.length > 0 && (
          <HomeTurfSection hostScorigamis={facts.hostScorigamis} t={t} />
        )}
      </div>

      {/* Penaltigami */}
      {facts.penaltigami.entries.length > 0 && (() => {
        const { grid: penGrid, maxPenScore, entries: penEntries } = facts.penaltigami;
        const unique = penEntries.filter((e) => e.isUnique);
        const maxGridCount = Math.max(...penGrid.map((c) => c.count), 1);

        // Build a lookup for the grid
        const gridLookup = new Map<string, number>();
        for (const cell of penGrid) {
          gridLookup.set(`${cell.winner}-${cell.loser}`, cell.count);
        }

        return (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 space-y-4 overflow-hidden">
            <div>
              <h3 className="font-bold">{t("penaltigamiTitle")}</h3>
              <p className="text-xs text-stone-500 mt-1">{t("penaltigamiDesc")}</p>
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-400/80 mt-2">
                {t("penaltigamiSummary", { unique: unique.length, total: facts.penaltyCount })}
              </p>
            </div>

            <div className="grid md:grid-cols-[1fr_2fr] gap-6 items-center">
              {/* Left: Penalty score heatmap */}
              <div>
                <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider mb-2 text-center">
                  Loser ↓ · Winner →
                </p>
                <table className="mx-auto" style={{ borderSpacing: "3px" }}>
                  <thead>
                    <tr>
                      <th className="w-8 h-8" />
                      {Array.from({ length: maxPenScore }, (_, i) => (
                        <th key={i + 1} className="w-8 h-8 text-[10px] text-amber-300/80 sb-numeral font-medium">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxPenScore }, (_, row) => {
                      return (
                        <tr key={row}>
                          <td className="w-8 h-8 text-[10px] text-amber-300/80 text-center sb-numeral font-medium">{row}</td>
                          {Array.from({ length: maxPenScore }, (_, i) => {
                            const col = i + 1;
                            // col = winner score, row = loser score; winner must be > loser
                            if (col <= row) {
                              return <td key={col} className="w-8 h-8 rounded-sm bg-[#0a100e]/40" />;
                            }
                            const count = gridLookup.get(`${col}-${row}`) ?? 0;
                            const opacity = count > 0 ? 0.2 + (count / maxGridCount) * 0.8 : 0;
                            return (
                              <td key={col} className="w-8 h-8 p-0">
                                <div
                                  className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-bold sb-numeral ${
                                    count === 0
                                      ? "bg-[#0a100e] border border-[#1d2825]"
                                      : "text-zinc-900"
                                  }`}
                                  style={count > 0 ? { backgroundColor: `rgba(251, 191, 36, ${opacity})` } : undefined}
                                  title={`${col}–${row}: ${count}×`}
                                >
                                  {count > 0 ? count : ""}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-stone-500 font-mono">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0a100e] border border-[#1d2825]" />
                  <span>Never</span>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgba(251, 191, 36, 0.3)" }} />
                  <span>Rare</span>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgba(251, 191, 36, 1)" }} />
                  <span>Common</span>
                </div>
              </div>

              {/* Right: Unique penaltigamis */}
              {unique.length > 0 && (() => {
                // Find the only penalty scoreline (grid cell) that occurred just once
                const uniquePenOnly = penGrid.filter((c) => c.count === 1);
                return (
                  <div className="min-w-0 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
                        Unique match + penalty combos
                      </p>
                      <div className="space-y-0.5 text-xs">
                        {unique.map((entry) => (
                          <div
                            key={entry.label}
                            className="flex items-center gap-1.5 py-1 border-b border-zinc-800 last:border-0 min-w-0"
                          >
                            <span className="hidden md:inline font-mono text-amber-300/70 text-[10px] shrink-0">{entry.label}</span>
                            <span className="flex-1 min-w-0 overflow-hidden">{matchLine(entry.matches[0])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {uniquePenOnly.length > 0 && (
                      <div className="rounded-sm border border-amber-400/30 bg-amber-400/5 px-3 py-2.5">
                        <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider mb-1">
                          Only unique penalty score
                        </p>
                        <p className="text-sm font-bold text-amber-300 sb-numeral">
                          {uniquePenOnly[0].winner}–{uniquePenOnly[0].loser} pens
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                          {t("penaltigamiOnlyPenScore")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        );
      })()}

      {/* Goal distribution histogram */}
      <GoalDistributionHistogram
        goalDistribution={facts.goalDistribution}
        totalMatches={matches.length}
        title={t("goalDistTitle")}
        description={t("goalDistDesc")}
        footnote={t("goalDistNote")}
      />

      {/* Stage breakdown */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
        <h3 className="font-bold mb-4">{t("stageBreakdownTitle")}</h3>
        <p className="text-xs text-zinc-500 mb-4">{t("stageBreakdownDesc")}</p>

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

        <div className="space-y-2">
          {facts.stageBreakdown.map((s) => {
            const isTop = facts.topScorigamiStage && s.stage === facts.topScorigamiStage.stage;
            return (
              <div key={s.stage} className="flex items-center gap-2 text-sm">
                <span className="w-32 text-end text-xs text-zinc-500 shrink-0">{tStages(s.stage)}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${s.rate}%`,
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
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
        <h3 className="font-bold mb-4">{t("tournamentTrendsTitle")}</h3>
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 min-w-0">
          {([
            { key: "teams" as const, label: t("trendTeams"), color: "#d6d3d1" },     // stone-300 — cream
            { key: "matches" as const, label: t("trendMatches"), color: "#fb923c" }, // orange-400 — copper
            { key: "goalsPerGame" as const, label: t("trendGoalsPerGame"), color: "#fcd34d" }, // amber-300 — gold
            { key: "scorigamis" as const, label: t("trendScorigamis"), color: "#b8431f" },     // rust — the drama line
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

      {/* Scorigami frontier */}
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

// ── Home Turf sub-section ──
// Uses a custom row instead of MatchScoreline because it underlines the host
// team's name — a single-purpose flourish that doesn't generalize.

function HomeTurfSection({
  hostScorigamis,
  t,
}: {
  hostScorigamis: HostScorigami[];
  t: ReturnType<typeof useTranslations<"funFacts">>;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 min-w-0 overflow-hidden">
      <h3 className="font-bold mb-3">{t("homeTurfTitle")}</h3>
      <p className="text-xs text-zinc-500 mb-3">{t("homeTurfDesc", { count: hostScorigamis.length })}</p>
      <div className="space-y-2 text-sm">
        {hostScorigamis.map((h, i) => {
          const m = h.match;
          const oriented = orientMatch(m);
          const lo = Math.min(m.homeScore, m.awayScore);
          const hi = Math.max(m.homeScore, m.awayScore);
          const isWinnerHost = oriented.winnerTeam === h.hostTeam;
          const isLoserHost = oriented.loserTeam === h.hostTeam;
          return (
            <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0 min-w-0">
              <span className="font-bold text-amber-600 dark:text-amber-400 w-10 shrink-0">{hi}–{lo}</span>
              <span className="flex items-center gap-2 flex-1 min-w-0">
                <span className="flex-1 text-end font-medium flex items-center justify-end gap-1.5 min-w-0">
                  <span className={`truncate ${isWinnerHost ? "underline decoration-amber-400 decoration-2 underline-offset-2" : ""}`}>{oriented.winnerTeam}</span>
                  <Flag code={oriented.winnerCode} year={oriented.year} alt={oriented.winnerTeam} />
                </span>
                <span className="font-bold w-10 sm:w-16 text-center shrink-0">{oriented.winnerScore}–{oriented.loserScore}</span>
                <span className="flex-1 font-medium flex items-center gap-1.5 min-w-0">
                  <Flag code={oriented.loserCode} year={oriented.year} alt={oriented.loserTeam} />
                  <span className={`truncate ${isLoserHost ? "underline decoration-amber-400 decoration-2 underline-offset-2" : ""}`}>{oriented.loserTeam}</span>
                </span>
                <span className="text-zinc-400 text-[10px] sm:text-xs shrink-0">({oriented.year})</span>
              </span>
              <span className="text-xs text-zinc-400 hidden sm:inline">🏟️</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
