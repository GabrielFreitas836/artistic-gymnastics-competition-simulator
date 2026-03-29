import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Calculator, Trophy, CheckCircle2, Users } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { calculateScore, getEffectiveScore, getTeamTotal, getTeamApparatusTotal } from "@/lib/scoring";
import { getEventFinalRankings } from "@/lib/rankings";
import { getCountryById } from "@/lib/countries";
import { Gymnast, Apparatus } from "@/lib/types";
import { clsx } from "clsx";

const APPARATUS_ORDER = ['VT', 'UB', 'BB', 'FX'];

export default function Phase5_Scoring() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const [activeSub, setActiveSub] = useState<number>(1);
  const [activeRot, setActiveRot] = useState<number>(1);

  // ── Rank indicator state ────────────────────────────────────────────────────
  // Estado temporario para exibir o rank ao vivo logo apos uma nota ser digitada.
  // A chave segue o formato "${gymnast.id}_${app}" e fica ativa por 7 segundos.
  const [rankIndicators, setRankIndicators] = useState<Record<string, boolean>>({});

  // Guarda os timeouts ativos para que a badge possa ser reiniciada sem vazamento de memoria.
  const indicatorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    // Limpa todos os timers quando o painel de arbitragem sai da tela.
    const timers = indicatorTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  // Reativa a badge por 7 segundos sempre que uma nova nota relevante entra.
  const triggerRankIndicator = (key: string) => {
    if (indicatorTimers.current[key]) clearTimeout(indicatorTimers.current[key]);
    setRankIndicators(prev => ({ ...prev, [key]: true }));
    indicatorTimers.current[key] = setTimeout(() => {
      setRankIndicators(prev => ({ ...prev, [key]: false }));
    }, 7000);
  };

  // ── All gymnasts list (needed for live ranking) ─────────────────────────────
  // Junta equipes e grupos mistos para recalcular o ranking live com a base completa.
  const allGymnasts = useMemo((): Gymnast[] => {
    const list: Gymnast[] = [];
    Object.values(state.teams).forEach(t => list.push(...t.gymnasts));
    Object.values(state.mixedGroups).forEach(mg => list.push(...mg.gymnasts));
    return list;
  }, [state.teams, state.mixedGroups]);

  // Rankings live por aparelho usados somente para a badge de posicao atual.
  const liveRankings = useMemo(() => ({
    VT: getEventFinalRankings(allGymnasts, 'VT', state.scores),
    UB: getEventFinalRankings(allGymnasts, 'UB', state.scores),
    BB: getEventFinalRankings(allGymnasts, 'BB', state.scores),
    FX: getEventFinalRankings(allGymnasts, 'FX', state.scores),
  }), [allGymnasts, state.scores]);

  // VT* consulta o mesmo ranking de VT, porque a final de salto e uma unica disputa.
  const getGymnastRank = (gId: string, app: string): number | null => {
    const key = app === 'VT*' ? 'VT' : app;
    if (!(key in liveRankings)) return null;
    const entry = liveRankings[key as keyof typeof liveRankings].find(r => r.gymnast.id === gId);
    return entry ? entry.rank : null;
  };

  // ── Rotation helpers ────────────────────────────────────────────────────────
  // Cada rotacao avanca um aparelho a partir do aparelho inicial sorteado na fase anterior.
  const getApparatusForRotation = (startApp: string, rotationIdx: number): string => {
    if (startApp === 'BYE') return 'BYE';
    const startIdx = APPARATUS_ORDER.indexOf(startApp);
    const currIdx = (startIdx + rotationIdx - 1) % 4;
    return APPARATUS_ORDER[currIdx];
  };

  // ── Score input handler ─────────────────────────────────────────────────────
  const handleScoreUpdate = (
    gId: string,
    app: string,
    field: 'd' | 'e' | 'penalty',
    val: string,
    vIndex?: 0 | 1,
  ) => {
    // O formulario salva cada componente separadamente e recalcula o total localmente.
    const numVal = val === '' ? 0 : parseFloat(val);
    if (isNaN(numVal)) return;

    let currentScore = state.scores[gId]?.[app as Apparatus] as any;
    if (app === 'VT*' && vIndex !== undefined) {
      currentScore = state.scores[gId]?.['VT*']?.[vIndex] || { d: 0, e: 0, penalty: 0, total: 0 };
    } else if (!currentScore) {
      currentScore = { d: 0, e: 0, penalty: 0, total: 0 };
    }

    const newScoreObj = { ...currentScore, [field]: numVal };
    newScoreObj.total = calculateScore(newScoreObj.d, newScoreObj.e, newScoreObj.penalty);

    dispatch({ type: 'UPDATE_SCORE', payload: { gymnastId: gId, app, score: newScoreObj, vIndex } });

    // ── Rank indicator trigger rules ────────────────────────────────────────
    // Rule: 'VT' (single vault) → never show rank indicator.
    // Rule: 'VT*' (double vault) → show only after the 2nd vault (vIndex === 1),
    //        when the average of both vaults is used in the VT ranking.
    // Rule: all other apparatus → show immediately on any score change.
    if (app === 'VT*') {
      if (vIndex === 1) triggerRankIndicator(`${gId}_VT*`);
      // vIndex === 0: wait for 2nd vault before showing
    } else if (app !== 'VT') {
      // UB, BB, FX
      triggerRankIndicator(`${gId}_${app}`);
    }
    // app === 'VT' (single vault): no indicator ever
  };

  const handleFinish = () => {
    // A fase de resultados le diretamente o estado persistido; nao precisa de consolidacao extra aqui.
    if (state.phase < 6) dispatch({ type: 'SET_PHASE', payload: 6 });
    setLocation("/results");
  };

  // ── Build apparatus groups for current sub / rotation ───────────────────────
  // Reagrupa as entidades do subdivision atual no aparelho em que estao competindo nesta rotacao.
  const currentSubEntities = state.subdivisions[activeSub] || {};

  const apparatusGroups: Record<string, { entityId: string; isTeam: boolean }[]> = {
    VT: [], UB: [], BB: [], FX: [],
  };

  Object.entries(currentSubEntities).forEach(([entityId, startApp]) => {
    const currentApp = getApparatusForRotation(startApp, activeRot);
    if (currentApp !== 'BYE' && apparatusGroups[currentApp]) {
      const isTeam = !!state.teams[entityId];
      apparatusGroups[currentApp].push({ entityId, isTeam });
    }
  });

  // ── Render ──────────────────────────────────────────────────────────────────
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

      {/* Sub / Rotation tabs */}
      <div className="glass-panel p-2 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex bg-slate-900 rounded-xl p-1">
          {[1, 2, 3, 4, 5].map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                activeSub === sub ? "bg-slate-700 text-amber-400 shadow-sm" : "text-slate-400 hover:text-white",
              )}
            >
              Sub {sub}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1">
          {/* 4 rotations: one per apparatus */}
          {[1, 2, 3, 4].map(rot => (
            <button
              key={rot}
              onClick={() => setActiveRot(rot)}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                activeRot === rot ? "bg-amber-500/20 text-amber-400 shadow-sm" : "text-slate-400 hover:text-white",
              )}
            >
              Rot {rot}
              {activeRot === rot && <div className="w-2 h-2 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Scoring grid: 2 columns on xl, 4 apparatus panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {APPARATUS_ORDER.map(app => {
          const entitiesHere = apparatusGroups[app];

          return (
            <div key={app} className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col">
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
                  let teamTotal = 0;

                  // Apply the saved internal competition order for this entity+apparatus
                  const applyOrder = (raw: Gymnast[]): Gymnast[] => {
                    // Reaplica a ordem interna definida na fase 4 para manter a sequencia real da competicao.
                    const order = state.apparatusOrder?.[entityId]?.[app as 'VT' | 'UB' | 'BB' | 'FX'];
                    if (!order || order.length === 0) return raw;
                    return [...raw].sort((a, b) => {
                      const ai = order.indexOf(a.id);
                      const bi = order.indexOf(b.id);
                      if (ai === -1 && bi === -1) return 0;
                      if (ai === -1) return 1;
                      if (bi === -1) return -1;
                      return ai - bi;
                    });
                  };

                  if (isTeam) {
                    const team = state.teams[entityId];
                    const raw = team.gymnasts.filter(
                      g => g.apparatus.includes(app as any) || (app === 'VT' && g.apparatus.includes('VT*')),
                    );
                    gymnasts = applyOrder(raw);
                    teamTotal = getTeamApparatusTotal(team, app as any, state.scores);
                  } else {
                    const mg = state.mixedGroups[entityId];
                    const raw = mg.gymnasts.filter(
                      g => g.apparatus.includes(app as any) || (app === 'VT' && g.apparatus.includes('VT*')),
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
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">App Total (Top 3)</div>
                            <div className="text-lg font-bold text-white">{teamTotal > 0 ? teamTotal.toFixed(3) : '0.000'}</div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {gymnasts.map(g => {
                          const isDoubleVault = app === 'VT' && g.apparatus.includes('VT*');
                          const vaults = isDoubleVault ? [0, 1] : [0];

                          return vaults.map(vIdx => {
                            const scoreAppKey = isDoubleVault ? 'VT*' : app;

                            // Indicator key:
                            //  - Double vault → key includes 'VT*' (only set after 2nd vault)
                            //  - UB/BB/FX → key is "${id}_${app}"
                            //  - Single VT → never activated (no key)
                            const indicatorKey = isDoubleVault
                              ? `${g.id}_VT*`
                              : app !== 'VT' ? `${g.id}_${app}` : null;

                            // Show the badge only for the correct vault index:
                            // double-vault → show on 2nd entry row; single-vault → never
                            const showBadge =
                              indicatorKey !== null &&
                              rankIndicators[indicatorKey] === true &&
                              (!isDoubleVault || vIdx === 1);

                            const gymnRank = showBadge ? getGymnastRank(g.id, scoreAppKey) : null;

                            const scoreObj = (isDoubleVault
                              ? state.scores[g.id]?.['VT*']?.[vIdx]
                              : state.scores[g.id]?.[app as any]) || { d: 0, e: 0, penalty: 0, total: 0 };

                            const isCompleted = scoreObj.total > 0;

                            return (
                              <div key={`${g.id}_${vIdx}`} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-lg">
                                <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                                  {isCompleted
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    : <div className="w-4 h-4 shrink-0" />}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-bold text-slate-200 truncate">{g.name}</p>
                                    {isDoubleVault && (
                                      <p className="text-[10px] text-slate-500 uppercase">Vault {vIdx + 1}</p>
                                    )}
                                    {/* Rank indicator badge — appears for 7 s after a valid score entry.
                                        Special rules:
                                        - Single-VT gymnasts: never shown.
                                        - VT* gymnasts: shown only after the 2nd vault is scored. */}
                                    {showBadge && gymnRank !== null && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-amber-400 border border-amber-500/30 leading-none">
                                        Rk {gymnRank}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">D-Score</label>
                                  <input
                                    type="number" step="0.1" min="0" max="10"
                                    value={scoreObj.d || ''}
                                    onChange={e => handleScoreUpdate(g.id, scoreAppKey, 'd', e.target.value, isDoubleVault ? vIdx as any : undefined)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                  />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">E-Score</label>
                                  <input
                                    type="number" step="0.1" min="0" max="10"
                                    value={scoreObj.e || ''}
                                    onChange={e => handleScoreUpdate(g.id, scoreAppKey, 'e', e.target.value, isDoubleVault ? vIdx as any : undefined)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                  />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 uppercase mb-0.5 px-1">ND</label>
                                  <input
                                    type="number" step="0.1" min="0" max="10"
                                    value={scoreObj.penalty || ''}
                                    onChange={e => handleScoreUpdate(g.id, scoreAppKey, 'penalty', e.target.value, isDoubleVault ? vIdx as any : undefined)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                  />
                                </div>
                                <div className="col-span-12 sm:col-span-2 text-right pr-2">
                                  <label className="block text-[9px] text-amber-500 uppercase font-bold mb-0.5">Total</label>
                                  <div className="font-bold text-lg text-white">
                                    {scoreObj.total > 0 ? scoreObj.total.toFixed(3) : '-.---'}
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
