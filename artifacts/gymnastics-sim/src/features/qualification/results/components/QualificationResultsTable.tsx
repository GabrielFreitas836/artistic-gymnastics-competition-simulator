import { Search } from "lucide-react";

import { getCountryById } from "@/lib/countries";
import {
  RankedGymnast,
  RankedTeam,
  TeamApparatusRankingRow,
} from "@/lib/simulation/rankings";
import { cn } from "@/lib/utils";

import {
  getResultsRowStyle,
  renderIndividualTotal,
  renderResultsTiebreakValue,
  ResultsTab,
} from "../selectors/resultsSelectors";
import { TeamApparatusRankingTable } from "./TeamApparatusRankingTable";

interface QualificationResultsTableProps {
  activeTab: ResultsTab;
  teamRows: RankedTeam[];
  individualRows: RankedGymnast[];
  teamApparatusRows: TeamApparatusRankingRow[];
}

export function QualificationResultsTable({
  activeTab,
  teamRows,
  individualRows,
  teamApparatusRows,
}: QualificationResultsTableProps) {
  const isAA = activeTab === "AA";
  const isEF = activeTab === "VT" || activeTab === "UB" || activeTab === "BB" || activeTab === "FX";
  const isTeamApparatusTab = activeTab === "TEAM_APP";

  const renderStatusBadge = (status: string) => {
    if (status === "Q") {
      return (
        <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400">
          QUAL
        </span>
      );
    }
    if (status.startsWith("R")) {
      return (
        <span className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
          {status}
        </span>
      );
    }
    return <span className="text-xs text-slate-600">-</span>;
  };

  const tableTitle =
    activeTab === "TEAM"
      ? "TEAM QUALIFICATION"
      : activeTab === "TEAM_APP"
        ? "TEAM APPARATUS RANKING"
        : activeTab === "AA"
          ? "ALL-AROUND QUALIFICATION"
          : `${activeTab} QUALIFICATION`;

  const tableMeta = isTeamApparatusTab
    ? `Showing ${teamApparatusRows.length} teams`
    : "Showing top results";

  return (
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
        <TeamApparatusRankingTable rows={teamApparatusRows} />
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
              {activeTab === "TEAM" ? (
                teamRows.map((row) => (
                  <tr
                    key={row.team.countryId}
                    className={cn(
                      "transition-colors hover:bg-white/5",
                      getResultsRowStyle(row.status, row.resultState),
                    )}
                  >
                    <td className="px-4 py-4 text-center font-display text-lg font-bold text-slate-300">
                      {row.rank ?? ""}
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
                      {row.resultState === "DNF"
                        ? "DNF"
                        : row.total !== null
                          ? row.total.toFixed(3)
                          : "-"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {renderStatusBadge(row.status)}
                    </td>
                  </tr>
                ))
              ) : (
                individualRows.map((row) => (
                  <tr
                    key={row.gymnast.id}
                    className={cn(
                      "transition-colors hover:bg-white/5",
                      getResultsRowStyle(row.status, row.resultState),
                    )}
                  >
                    <td className="w-16 px-4 py-4 text-center">
                      {row.rank !== null && (
                        <>
                          <span
                            className={cn(
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
                    {isAA && (
                      <>
                        <td className="px-3 py-4 text-right text-sm">
                          <span className="text-slate-300">
                            {renderResultsTiebreakValue(row.tbE)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right text-sm">
                          <span className="text-slate-400">
                            {renderResultsTiebreakValue(row.tbD)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right text-sm">
                          <span className={row.tbPenalty && row.tbPenalty > 0 ? "text-red-400" : "text-slate-600"}>
                            {row.tbPenalty === null
                              ? "-"
                              : row.tbPenalty > 0
                                ? `-${row.tbPenalty.toFixed(3)}`
                                : "-"}
                          </span>
                        </td>
                      </>
                    )}
                    {isEF && (
                      <>
                        <td className="px-3 py-4 text-right text-sm">
                          <span className="text-slate-300">
                            {renderResultsTiebreakValue(row.tbE)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right text-sm">
                          <span className="text-slate-400">
                            {renderResultsTiebreakValue(row.tbD)}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4 text-center">
                      {renderStatusBadge(row.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isTeamApparatusTab && activeTab !== "TEAM" && individualRows.length === 0 && (
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
  );
}
