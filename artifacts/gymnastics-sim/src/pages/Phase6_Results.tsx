import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Trophy, Search, ChevronLeft } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { getTeamRankings, getAllAroundRankings, getEventFinalRankings, RankedGymnast } from "@/lib/rankings";
import { getCountryById } from "@/lib/countries";
import { clsx } from "clsx";

type Tab = 'TEAM' | 'AA' | 'VT' | 'UB' | 'BB' | 'FX';

export default function Phase6_Results() {
  const [, setLocation] = useLocation();
  const { state } = useSimulation();
  const [activeTab, setActiveTab] = useState<Tab>('TEAM');

  const allGymnasts = useMemo(() => {
    const list: any[] = [];
    Object.values(state.teams).forEach(t => list.push(...t.gymnasts));
    Object.values(state.mixedGroups).forEach(mg => list.push(...mg.gymnasts));
    return list;
  }, [state.teams, state.mixedGroups]);

  const rankings = useMemo(() => ({
    'TEAM': getTeamRankings(state.teams, state.scores),
    'AA': getAllAroundRankings(allGymnasts, state.scores),
    'VT': getEventFinalRankings(allGymnasts, 'VT', state.scores),
    'UB': getEventFinalRankings(allGymnasts, 'UB', state.scores),
    'BB': getEventFinalRankings(allGymnasts, 'BB', state.scores),
    'FX': getEventFinalRankings(allGymnasts, 'FX', state.scores),
  }), [state, allGymnasts]);

  const renderStatusBadge = (status: string) => {
    if (status === 'Q') return <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">QUAL</span>;
    if (status.startsWith('R')) return <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-bold border border-slate-600">{status}</span>;
    return <span className="text-slate-600 text-xs">-</span>;
  };

  const getRowStyle = (rank: number, status: string) => {
    if (status === 'Q' && rank === 1) return "bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-l-amber-400";
    if (status === 'Q' && rank === 2) return "bg-gradient-to-r from-slate-300/20 to-transparent border-l-4 border-l-slate-300";
    if (status === 'Q' && rank === 3) return "bg-gradient-to-r from-amber-700/20 to-transparent border-l-4 border-l-amber-700";
    if (status === 'Q') return "bg-emerald-900/10 border-l-2 border-l-emerald-500/50";
    if (status.startsWith('R')) return "bg-slate-800/30 border-l-2 border-l-slate-500/50";
    return "opacity-60";
  };

  const isAA = activeTab === 'AA';
  const isEF = activeTab !== 'TEAM' && activeTab !== 'AA';

  const renderRankCell = (row: RankedGymnast) => (
    <td className="px-4 py-4 text-center w-16">
      <span className={clsx(
        "font-display font-bold text-lg",
        row.tied ? "text-amber-400" : "text-slate-300"
      )}>
        {row.rank}
      </span>
      {row.tied && (
        <div className="text-[9px] text-amber-500 font-bold uppercase tracking-widest leading-none mt-0.5">TIE</div>
      )}
    </td>
  );

  const renderTiebreakCells = (row: RankedGymnast) => {
    if (isAA) {
      return (
        <>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-300">{row.tbE.toFixed(3)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-400">{row.tbD.toFixed(3)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className={row.tbPenalty > 0 ? "text-red-400" : "text-slate-600"}>
              {row.tbPenalty > 0 ? `-${row.tbPenalty.toFixed(3)}` : '—'}
            </span>
          </td>
        </>
      );
    }
    if (isEF) {
      return (
        <>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-300">{row.tbE.toFixed(3)}</span>
          </td>
          <td className="px-3 py-4 text-right text-sm">
            <span className="text-slate-400">{row.tbD.toFixed(3)}</span>
          </td>
        </>
      );
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="relative text-center mb-10">
        <button
          onClick={() => setLocation("/scoring")}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-5 h-5" /> Scoring
        </button>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-gradient shadow-[0_0_30px_rgba(212,175,55,0.5)] mb-4">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>
        <h2 className="text-4xl font-display font-bold text-white mb-2 text-glow">QUALIFICATION RESULTS</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Final rankings applying standard FIG 2-per-country rules for individual finals.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-900/50 p-2 rounded-2xl glass-panel">
        {([
          { id: 'TEAM', label: 'Team Finals' },
          { id: 'AA', label: 'All-Around' },
          { id: 'VT', label: 'Vault' },
          { id: 'UB', label: 'Uneven Bars' },
          { id: 'BB', label: 'Balance Beam' },
          { id: 'FX', label: 'Floor' },
        ] as { id: Tab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-300",
              activeTab === tab.id
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="bg-slate-900/80 px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-display font-bold text-xl text-white tracking-widest">
            {activeTab === 'TEAM' ? 'TEAM QUALIFICATION' :
             activeTab === 'AA' ? 'ALL-AROUND QUALIFICATION' :
             `${activeTab} QUALIFICATION`}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Search className="w-4 h-4" />
            <span>Showing top results</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/40 text-xs uppercase tracking-widest text-slate-500 border-b border-white/5">
                <th className="px-4 py-4 font-bold w-16 text-center">Rk</th>
                <th className="px-4 py-4 font-bold">Name / Nation</th>
                <th className="px-4 py-4 font-bold text-right">Total</th>
                {isAA && <>
                  <th className="px-3 py-4 font-bold text-right">E Sum</th>
                  <th className="px-3 py-4 font-bold text-right">D Sum</th>
                  <th className="px-3 py-4 font-bold text-right">ND</th>
                </>}
                {isEF && <>
                  <th className="px-3 py-4 font-bold text-right">E Score</th>
                  <th className="px-3 py-4 font-bold text-right">D Score</th>
                </>}
                <th className="px-4 py-4 font-bold text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeTab === 'TEAM' ? (
                rankings['TEAM'].map((row) => (
                  <tr key={row.team.countryId} className={clsx("transition-colors hover:bg-white/5", getRowStyle(row.rank, row.status))}>
                    <td className="px-4 py-4 text-center font-display font-bold text-lg text-slate-300">{row.rank}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl drop-shadow-md">{getCountryById(row.team.countryId).flag}</span>
                        <span className="font-bold text-white text-lg tracking-wide">{getCountryById(row.team.countryId).name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-amber-400 text-xl">{row.total > 0 ? row.total.toFixed(3) : '-'}</td>
                    <td className="px-4 py-4 text-center">{renderStatusBadge(row.status)}</td>
                  </tr>
                ))
              ) : (
                rankings[activeTab].map((row: RankedGymnast) => (
                  <tr key={row.gymnast.id} className={clsx("transition-colors hover:bg-white/5", getRowStyle(row.rank, row.status))}>
                    {renderRankCell(row)}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-md">{getCountryById(row.gymnast.countryId).flag}</span>
                        <div>
                          <div className="font-bold text-white">{row.gymnast.name}</div>
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{getCountryById(row.gymnast.countryId).name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-amber-400 text-lg">{row.total > 0 ? row.total.toFixed(3) : '-'}</td>
                    {renderTiebreakCells(row)}
                    <td className="px-4 py-4 text-center">{renderStatusBadge(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {activeTab !== 'TEAM' && rankings[activeTab].length === 0 && (
            <div className="p-8 text-center text-slate-500 italic">No scores recorded for this event.</div>
          )}
        </div>

        {/* Tiebreak legend */}
        {(isAA || isEF) && (
          <div className="px-6 py-3 border-t border-white/5 bg-slate-900/30 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><span className="text-amber-400 font-bold">TIE</span> = Gymnasts share this rank (all tiebreakers equal)</span>
            {isAA && <span>Tiebreak order: Total → E Sum → Neutral Deductions → D Sum → Alphabetical</span>}
            {isEF && <span>Tiebreak order: Total → E Score → D Score → Alphabetical · Ties at 8th place expand the final</span>}
          </div>
        )}
      </div>
    </div>
  );
}
