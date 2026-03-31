import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Search, Trophy } from "lucide-react";
import { clsx } from "clsx";
import TeamApparatusRanking from "@/components/TeamApparatusRanking";
import { useSimulation } from "@/context/SimulationContext";
import { getCountryById } from "@/lib/countries";
import {
  getAllAroundRankings,
  getApparatusRanking,
  getEventFinalRankings,
  getTeamRankings,
  RankedGymnast,
} from "@/lib/rankings";
import { getQualificationCompletionStatus, getTeamFinalQualificationPool } from "@/lib/teamFinal";
import { Gymnast } from "@/lib/types";

type Tab = 'TEAM' | 'TEAM_APP' | 'AA' | 'VT' | 'UB' | 'BB' | 'FX';

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'TEAM', label: 'Team Qualification' },
  { id: 'TEAM_APP', label: 'Team Apparatus' },
  { id: 'AA', label: 'All-Around' },
  { id: 'VT', label: 'Vault' },
  { id: 'UB', label: 'Uneven Bars' },
  { id: 'BB', label: 'Balance Beam' },
  { id: 'FX', label: 'Floor' },
];

export default function Phase6_Results() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [activeTab, setActiveTab] = useState<Tab>('TEAM');

  const allGymnasts = useMemo(() => {
    const list: Gymnast[] = [];
    Object.values(state.teams).forEach((team) => list.push(...team.gymnasts));
    Object.values(state.mixedGroups).forEach((mixedGroup) =>
      list.push(...mixedGroup.gymnasts),
    );
    return list;
  }, [state.mixedGroups, state.teams]);

  const rankings = useMemo(
    () => ({
      TEAM: getTeamRankings(state.teams, state.scores, state.dns),
      AA: getAllAroundRankings(allGymnasts, state.scores, state.dns),
      VT: getEventFinalRankings(allGymnasts, 'VT', state.scores, state.dns),
      UB: getEventFinalRankings(allGymnasts, 'UB', state.scores, state.dns),
      BB: getEventFinalRankings(allGymnasts, 'BB', state.scores, state.dns),
      FX: getEventFinalRankings(allGymnasts, 'FX', state.scores, state.dns),
    }),
    [allGymnasts, state.dns, state.scores, state.teams],
  );

  const teamApparatusRanking = useMemo(
    () => getApparatusRanking(state.teams, state.scores, state.dns),
    [state.dns, state.scores, state.teams],
  );

  const orderedTeamApparatusRanking = useMemo(() => {
    const rowsByTeamId = new Map(
      teamApparatusRanking.map((row) => [row.team.countryId, row]),
    );

    return rankings.TEAM.map((teamRow) => rowsByTeamId.get(teamRow.team.countryId)).filter(
      (row): row is (typeof teamApparatusRanking)[number] => Boolean(row),
    );
  }, [rankings.TEAM, teamApparatusRanking]);

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const teamFinalPool = useMemo(
    () => getTeamFinalQualificationPool(state),
    [state],
  );

  const handleGoToTeamFinal = () => {
    if (!qualificationCompletion.isComplete) return;
    if (state.phase < 7) dispatch({ type: 'SET_PHASE', payload: 7 });
    setLocation("/team-final");
  };

  const canOpenTeamFinal = qualificationCompletion.isComplete;
  const teamFinalMessage = !qualificationCompletion.isComplete
    ? qualificationCompletion.message
    : teamFinalPool.qualified.length < 8
      ? `Team Final needs 8 qualified teams. Currently available: ${teamFinalPool.qualified.length}.`
      : `Top 8 confirmed. Reserves available: ${teamFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`;

  const renderStatusBadge = (status: string) => {
    if (status === 'Q') {
      return (
        <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400">
          QUAL
        </span>
      );
    }
    if (status.startsWith('R')) {
      return (
        <span className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
          {status}
        </span>
      );
    }
    return <span className="text-xs text-slate-600">-</span>;
  };

  const getRowStyle = (status: string, resultState: 'OK' | 'DNS' | 'DNF' | 'EMPTY') => {
    if (resultState === 'DNF' || resultState === 'DNS') {
      return "border-l-2 border-l-rose-500/40 bg-rose-950/10";
    }
    if (status === 'Q') return "border-l-2 border-l-emerald-500/50 bg-emerald-900/10";
    if (status.startsWith('R')) return "border-l-2 border-l-slate-500/50 bg-slate-800/30";
    return resultState === 'EMPTY' ? "opacity-60" : "";
  };

  const isAA = activeTab === 'AA';
  const isEF = activeTab === 'VT' || activeTab === 'UB' || activeTab === 'BB' || activeTab === 'FX';
  const isTeamApparatusTab = activeTab === 'TEAM_APP';

  const renderRankCell = (row: RankedGymnast) => (
    <td className="w-16 px-4 py-4 text-center">
      {row.rank !== null && (
        <>
          <span
            className={clsx(
              "font-display text-lg font-bold",
              row.tied ? "text-amber-400" : "text-slate-300",
            )}
          >
            {row.rank}
          </span>
          {row.tied && (
            <div className="mt-0.5 text-[9px] font-bold uppercase leading-none tracking-widest text-amber-500">
              TIE
            </div>
          )}
        </>
      )}
    </td>
  );

  const renderTiebreakValue = (value: number | null) => (value === null ? '-' : value.toFixed(3));

  const renderTiebreakCells = (row: RankedGymnast) => {
    if (isAA) {
      return (
        <>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-300">{renderTiebreakValue(row.tbE)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-400">{renderTiebreakValue(row.tbD)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className={row.tbPenalty && row.tbPenalty > 0 ? "text-red-400" : "text-slate-600"}>
              {row.tbPenalty === null
                ? '-'
                : row.tbPenalty > 0
                  ? `-${row.tbPenalty.toFixed(3)}`
                  : '-'}
            </span>
          </td>
        </>
      );
    }

    if (isEF) {
      return (
        <>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-300">{renderTiebreakValue(row.tbE)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-400">{renderTiebreakValue(row.tbD)}</span>
          </td>
        </>
      );
    }

    return null;
  };

  const renderIndividualTotal = (row: RankedGymnast) => {
    if (row.resultState === 'DNS') return 'DNS';
    if (row.resultState === 'DNF') return 'DNF';
    if (row.resultState === 'EMPTY' || row.total === null) return '-';
    return row.total.toFixed(3);
  };

  const tableTitle =
    activeTab === 'TEAM'
      ? 'TEAM QUALIFICATION'
      : activeTab === 'TEAM_APP'
        ? 'TEAM APPARATUS RANKING'
        : activeTab === 'AA'
          ? 'ALL-AROUND QUALIFICATION'
          : `${activeTab} QUALIFICATION`;

  const tableMeta = isTeamApparatusTab
    ? `Showing ${teamApparatusRanking.length} teams`
    : 'Showing top results';

  const selectedIndividualRanking =
    activeTab === 'AA' || activeTab === 'VT' || activeTab === 'UB' || activeTab === 'BB' || activeTab === 'FX'
      ? rankings[activeTab]
      : [];

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="relative mb-10 text-center">
        <button
          onClick={() => setLocation("/scoring")}
          className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Scoring
        </button>
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient shadow-[0_0_30px_rgba(212,175,55,0.5)]">
          <Trophy className="h-8 w-8 text-slate-950" />
        </div>
        <h2 className="mb-2 text-4xl font-bold text-white text-glow font-display">
          QUALIFICATION RESULTS
        </h2>
        <p className="mx-auto max-w-2xl text-slate-400">
          Qualification rankings for teams, all-around and apparatus events.
        </p>
      </div>

      <div className="glass-panel mb-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-slate-900/50 p-2">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-300",
              activeTab === tab.id
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel mb-8 flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-bold tracking-widest text-white">
              TEAM FINAL
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {teamFinalMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoToTeamFinal}
            disabled={!canOpenTeamFinal}
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all",
              canOpenTeamFinal
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                : "cursor-not-allowed bg-slate-800 text-slate-500",
            )}
          >
            {state.teamFinal.slots.length === 8 ? "Resume Team Final" : "Start Team Final"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span>{qualificationCompletion.isComplete ? "Qualification complete" : "Qualification incomplete"}</span>
          <span>{teamFinalPool.qualified.length} qualified teams</span>
          <span>{teamFinalPool.reserves.length} reserve teams</span>
          {!qualificationCompletion.isComplete && qualificationCompletion.missingRoutineCount > 0 && (
            <span>{qualificationCompletion.missingRoutineCount} routines missing</span>
          )}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
          <h3 className="font-display text-xl font-bold tracking-widest text-white">
            {tableTitle}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Search className="h-4 w-4" />
            <span>{tableMeta}</span>
          </div>
        </div>

        {isTeamApparatusTab ? (
          <TeamApparatusRanking rows={orderedTeamApparatusRanking} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/40 text-xs uppercase tracking-widest text-slate-500">
                  <th className="w-16 px-4 py-4 text-center font-bold">Rk</th>
                  <th className="px-4 py-4 font-bold">Name / Nation</th>
                  <th className="px-4 py-4 text-right font-bold">Total</th>
                  {isAA && (
                    <>
                      <th className="px-3 py-4 text-right font-bold">E Sum</th>
                      <th className="px-3 py-4 text-right font-bold">D Sum</th>
                      <th className="px-3 py-4 text-right font-bold">ND</th>
                    </>
                  )}
                  {isEF && (
                    <>
                      <th className="px-3 py-4 text-right font-bold">E Score</th>
                      <th className="px-3 py-4 text-right font-bold">D Score</th>
                    </>
                  )}
                  <th className="w-24 px-4 py-4 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeTab === 'TEAM' ? (
                  rankings.TEAM.map((row) => (
                    <tr
                      key={row.team.countryId}
                      className={clsx(
                        "transition-colors hover:bg-white/5",
                        getRowStyle(row.status, row.resultState),
                      )}
                    >
                      <td className="px-4 py-4 text-center font-display text-lg font-bold text-slate-300">
                        {row.rank ?? ''}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl drop-shadow-md">
                            {getCountryById(row.team.countryId).flag}
                          </span>
                          <span className="text-lg font-bold tracking-wide text-white">
                            {getCountryById(row.team.countryId).name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-xl font-bold text-amber-400">
                        {row.resultState === 'DNF'
                          ? 'DNF'
                          : row.total !== null
                            ? row.total.toFixed(3)
                            : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {renderStatusBadge(row.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  selectedIndividualRanking.map((row: RankedGymnast) => (
                    <tr
                      key={row.gymnast.id}
                      className={clsx(
                        "transition-colors hover:bg-white/5",
                        getRowStyle(row.status, row.resultState),
                      )}
                    >
                      {renderRankCell(row)}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl drop-shadow-md">
                            {getCountryById(row.gymnast.countryId).flag}
                          </span>
                          <div>
                            <div className="font-bold text-white">{row.gymnast.name}</div>
                            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                              {getCountryById(row.gymnast.countryId).name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-amber-400">
                        {renderIndividualTotal(row)}
                      </td>
                      {renderTiebreakCells(row)}
                      <td className="px-4 py-4 text-center">
                        {renderStatusBadge(row.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!isTeamApparatusTab && activeTab !== 'TEAM' && selectedIndividualRanking.length === 0 && (
              <div className="p-8 text-center italic text-slate-500">
                No scores recorded for this event.
              </div>
            )}
          </div>
        )}

        {(isAA || isEF) && (
          <div className="flex flex-wrap gap-4 border-t border-white/5 bg-slate-900/30 px-6 py-3 text-xs text-slate-500">
            <span>
              <span className="font-bold text-amber-400">TIE</span> = Gymnasts share this rank
              (all tiebreakers equal)
            </span>
            {isAA && (
              <span>
                Tiebreak order: Total -&gt; E Sum -&gt; Neutral Deductions -&gt; D Sum -&gt;
                Alphabetical
              </span>
            )}
            {isEF && (
              <span>
                Tiebreak order: Total -&gt; E Score -&gt; D Score -&gt; Alphabetical. Ties at
                8th place expand the final.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
