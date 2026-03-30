import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Calculator, CheckCircle2, Trophy, Users } from "lucide-react";
import { clsx } from "clsx";
import { useSimulation } from "@/context/SimulationContext";
import {
  calculateScore,
  getDnsEntryKeyForApp,
  getTeamApparatusResult,
  isDnsActive,
} from "@/lib/scoring";
import { getEventFinalRankings } from "@/lib/rankings";
import { getCountryById } from "@/lib/countries";
import { Apparatus, ApparatusKey, DnsEntryKey, Gymnast, Score } from "@/lib/types";

const APPARATUS_ORDER: ApparatusKey[] = ['VT', 'UB', 'BB', 'FX'];

export default function Phase5_Scoring() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const [activeSub, setActiveSub] = useState<number>(1);
  const [activeRot, setActiveRot] = useState<number>(1);

  // Estado temporario para exibir o rank ao vivo logo apos uma nota ser digitada.
  const [rankIndicators, setRankIndicators] = useState<Record<string, boolean>>({});

  // Guarda os timeouts ativos para que a badge possa ser reiniciada sem vazamento de memoria.
  const indicatorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = indicatorTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const triggerRankIndicator = (key: string) => {
    if (indicatorTimers.current[key]) clearTimeout(indicatorTimers.current[key]);
    setRankIndicators((prev) => ({ ...prev, [key]: true }));
    indicatorTimers.current[key] = setTimeout(() => {
      setRankIndicators((prev) => ({ ...prev, [key]: false }));
    }, 7000);
  };

  const allGymnasts = useMemo((): Gymnast[] => {
    const list: Gymnast[] = [];
    Object.values(state.teams).forEach((team) => list.push(...team.gymnasts));
    Object.values(state.mixedGroups).forEach((mixedGroup) => list.push(...mixedGroup.gymnasts));
    return list;
  }, [state.mixedGroups, state.teams]);

  const liveRankings = useMemo(
    () => ({
      VT: getEventFinalRankings(allGymnasts, 'VT', state.scores, state.dns),
      UB: getEventFinalRankings(allGymnasts, 'UB', state.scores, state.dns),
      BB: getEventFinalRankings(allGymnasts, 'BB', state.scores, state.dns),
      FX: getEventFinalRankings(allGymnasts, 'FX', state.scores, state.dns),
    }),
    [allGymnasts, state.dns, state.scores],
  );

  const getGymnastRank = (gymnastId: string, apparatus: string): number | null => {
    const rankingKey = apparatus === 'VT*' ? 'VT' : apparatus;
    if (!(rankingKey in liveRankings)) return null;

    const entry = liveRankings[rankingKey as keyof typeof liveRankings].find(
      (row) => row.gymnast.id === gymnastId,
    );
    return entry?.rank ?? null;
  };

  const getApparatusForRotation = (startApp: string, rotationIdx: number): string => {
    if (startApp === 'BYE') return 'BYE';
    const startIdx = APPARATUS_ORDER.indexOf(startApp as ApparatusKey);
    const currIdx = (startIdx + rotationIdx - 1) % 4;
    return APPARATUS_ORDER[currIdx];
  };

  const handleScoreUpdate = (
    gymnastId: string,
    app: string,
    field: 'd' | 'e' | 'penalty',
    value: string,
    vIndex?: 0 | 1,
  ) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    if (Number.isNaN(numVal)) return;

    let currentScore = state.scores[gymnastId]?.[app as Apparatus] as any;
    if (app === 'VT*' && vIndex !== undefined) {
      currentScore = state.scores[gymnastId]?.['VT*']?.[vIndex] || {
        d: 0,
        e: 0,
        penalty: 0,
        total: 0,
      };
    } else if (!currentScore) {
      currentScore = { d: 0, e: 0, penalty: 0, total: 0 };
    }

    const newScoreObj = { ...currentScore, [field]: numVal };
    newScoreObj.total = calculateScore(newScoreObj.d, newScoreObj.e, newScoreObj.penalty);

    dispatch({
      type: 'UPDATE_SCORE',
      payload: { gymnastId, app, score: newScoreObj, vIndex },
    });

    if (app === 'VT*') {
      if (vIndex === 1) triggerRankIndicator(`${gymnastId}_VT*`);
    } else if (app !== 'VT') {
      triggerRankIndicator(`${gymnastId}_${app}`);
    }
  };

  const handleToggleDns = (gymnastId: string, key: DnsEntryKey) => {
    dispatch({ type: 'TOGGLE_DNS', payload: { gymnastId, key } });
  };

  const handleFinish = () => {
    if (state.phase < 6) dispatch({ type: 'SET_PHASE', payload: 6 });
    setLocation("/results");
  };

  const currentSubEntities = state.subdivisions[activeSub] || {};
  const apparatusGroups: Record<ApparatusKey, { entityId: string; isTeam: boolean }[]> = {
    VT: [],
    UB: [],
    BB: [],
    FX: [],
  };

  Object.entries(currentSubEntities).forEach(([entityId, startApp]) => {
    const currentApp = getApparatusForRotation(startApp, activeRot);
    if (currentApp !== 'BYE' && currentApp in apparatusGroups) {
      const isTeam = !!state.teams[entityId];
      apparatusGroups[currentApp as ApparatusKey].push({ entityId, isTeam });
    }
  });

  return (
    <div className="max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-amber-500" />
            JUDGES PANEL
          </h2>
          <p className="text-slate-400">Input D-score, E-score and Penalties.</p>
        </div>

        <button
          onClick={handleFinish}
          className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wide bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all"
        >
          View Results <Trophy className="w-5 h-5" />
        </button>
      </div>

      <div className="glass-panel p-2 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex bg-slate-900 rounded-xl p-1">
          {[1, 2, 3, 4, 5].map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                activeSub === sub
                  ? "bg-slate-700 text-amber-400 shadow-sm"
                  : "text-slate-400 hover:text-white",
              )}
            >
              Sub {sub}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1">
          {[1, 2, 3, 4].map((rot) => (
            <button
              key={rot}
              onClick={() => setActiveRot(rot)}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                activeRot === rot
                  ? "bg-amber-500/20 text-amber-400 shadow-sm"
                  : "text-slate-400 hover:text-white",
              )}
            >
              Rot {rot}
              {activeRot === rot && <div className="w-2 h-2 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {APPARATUS_ORDER.map((app) => {
          const entitiesHere = apparatusGroups[app];

          return (
            <div
              key={app}
              className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col"
            >
              <div className="bg-slate-900/80 p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold text-white tracking-widest">{app}</h3>
                <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800 text-slate-400">
                  {entitiesHere.length} Teams/Groups
                </span>
              </div>

              <div className="p-4 flex-1 space-y-8">
                {entitiesHere.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
                    No entities on {app} in this rotation.
                  </div>
                )}

                {entitiesHere.map(({ entityId, isTeam }) => {
                  let gymnasts: Gymnast[] = [];
                  let teamApparatusResult: ReturnType<typeof getTeamApparatusResult> | null = null;

                  const applyOrder = (raw: Gymnast[]): Gymnast[] => {
                    const order = state.apparatusOrder?.[entityId]?.[app];
                    if (!order || order.length === 0) return raw;

                    return [...raw].sort((a, b) => {
                      const aIndex = order.indexOf(a.id);
                      const bIndex = order.indexOf(b.id);
                      if (aIndex === -1 && bIndex === -1) return 0;
                      if (aIndex === -1) return 1;
                      if (bIndex === -1) return -1;
                      return aIndex - bIndex;
                    });
                  };

                  if (isTeam) {
                    const team = state.teams[entityId];
                    const raw = team.gymnasts.filter((gymnast) =>
                      gymnast.apparatus.includes(app as Apparatus)
                      || (app === 'VT' && gymnast.apparatus.includes('VT*')),
                    );
                    gymnasts = applyOrder(raw);
                    teamApparatusResult = getTeamApparatusResult(team, app, state.scores, state.dns);
                  } else {
                    const mixedGroup = state.mixedGroups[entityId];
                    const raw = mixedGroup.gymnasts.filter((gymnast) =>
                      gymnast.apparatus.includes(app as Apparatus)
                      || (app === 'VT' && gymnast.apparatus.includes('VT*')),
                    );
                    gymnasts = applyOrder(raw);
                  }

                  return (
                    <div key={entityId} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between items-end mb-4 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl drop-shadow-md">
                            {isTeam ? getCountryById(entityId).flag : <Users className="w-5 h-5 text-slate-400" />}
                          </span>
                          <h4 className="font-bold text-amber-500">
                            {isTeam ? getCountryById(entityId).name : state.mixedGroups[entityId].name}
                          </h4>
                        </div>
                        {isTeam && (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                              App Total (Top 3)
                            </div>
                            <div className="text-lg font-bold text-white">
                              {teamApparatusResult?.resultState === 'OK'
                                ? teamApparatusResult.score?.toFixed(3)
                                : teamApparatusResult?.resultState === 'DNF'
                                  ? 'DNF'
                                  : '-'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {gymnasts.map((gymnast) => {
                          const isDoubleVault = app === 'VT' && gymnast.apparatus.includes('VT*');
                          const vaults: (0 | 1)[] = isDoubleVault ? [0, 1] : [0];

                          return vaults.map((vIdx) => {
                            const scoreAppKey = isDoubleVault ? 'VT*' : app;
                            const dnsKey = getDnsEntryKeyForApp(
                              gymnast,
                              app,
                              isDoubleVault ? vIdx : undefined,
                            );
                            const dnsActive = isDnsActive(state.dns, gymnast.id, dnsKey);

                            const indicatorKey = isDoubleVault
                              ? `${gymnast.id}_VT*`
                              : app !== 'VT'
                                ? `${gymnast.id}_${app}`
                                : null;

                            const showBadge =
                              indicatorKey !== null
                              && !dnsActive
                              && rankIndicators[indicatorKey] === true
                              && (!isDoubleVault || vIdx === 1);

                            const gymnRank = showBadge
                              ? getGymnastRank(gymnast.id, scoreAppKey)
                              : null;

                            const scoreObj: Score = (
                              isDoubleVault
                                ? state.scores[gymnast.id]?.['VT*']?.[vIdx]
                                : state.scores[gymnast.id]?.[app as Apparatus]
                            ) as Score || { d: 0, e: 0, penalty: 0, total: 0 };

                            const isCompleted = !dnsActive && scoreObj.total > 0;

                            return (
                              <div
                                key={`${gymnast.id}_${vIdx}`}
                                className={clsx(
                                  "grid grid-cols-12 gap-2 items-center p-2 rounded-lg border",
                                  dnsActive
                                    ? "border-rose-500/30 bg-rose-950/20"
                                    : "border-transparent bg-slate-900/50",
                                )}
                              >
                                <div className="col-span-12 sm:col-span-4 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 shrink-0" />
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <p className="text-sm font-bold text-slate-200 truncate">
                                        {gymnast.name}
                                      </p>
                                      {isDoubleVault && (
                                        <p className="text-[10px] text-slate-500 uppercase">
                                          Vault {vIdx + 1}
                                        </p>
                                      )}
                                      {showBadge && gymnRank !== null && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-amber-400 border border-amber-500/30 leading-none">
                                          Rk {gymnRank}
                                        </span>
                                      )}
                                      {dnsActive && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 leading-none">
                                          DNS
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleDns(gymnast.id, dnsKey)}
                                    className={clsx(
                                      "shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                                      dnsActive
                                        ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                                        : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/40 hover:text-rose-200",
                                    )}
                                  >
                                    DNS
                                  </button>
                                </div>

                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">
                                    D-Score
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={scoreObj.d || ''}
                                    disabled={dnsActive}
                                    onChange={(event) =>
                                      handleScoreUpdate(
                                        gymnast.id,
                                        scoreAppKey,
                                        'd',
                                        event.target.value,
                                        isDoubleVault ? vIdx : undefined,
                                      )}
                                    className={clsx(
                                      "w-full border rounded px-2 py-1.5 text-sm outline-none",
                                      dnsActive
                                        ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
                                    )}
                                  />
                                </div>

                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">
                                    E-Score
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={scoreObj.e || ''}
                                    disabled={dnsActive}
                                    onChange={(event) =>
                                      handleScoreUpdate(
                                        gymnast.id,
                                        scoreAppKey,
                                        'e',
                                        event.target.value,
                                        isDoubleVault ? vIdx : undefined,
                                      )}
                                    className={clsx(
                                      "w-full border rounded px-2 py-1.5 text-sm outline-none",
                                      dnsActive
                                        ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
                                    )}
                                  />
                                </div>

                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">
                                    ND
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={scoreObj.penalty || ''}
                                    disabled={dnsActive}
                                    onChange={(event) =>
                                      handleScoreUpdate(
                                        gymnast.id,
                                        scoreAppKey,
                                        'penalty',
                                        event.target.value,
                                        isDoubleVault ? vIdx : undefined,
                                      )}
                                    className={clsx(
                                      "w-full border rounded px-2 py-1.5 text-sm outline-none",
                                      dnsActive
                                        ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500",
                                    )}
                                  />
                                </div>

                                <div className="col-span-12 sm:col-span-2 text-right pr-2">
                                  <label className="block text-[9px] text-amber-500 uppercase font-bold mb-0.5">
                                    Total
                                  </label>
                                  <div className="font-bold text-lg text-white">
                                    {dnsActive ? 'DNS' : scoreObj.total > 0 ? scoreObj.total.toFixed(3) : '-.---'}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
