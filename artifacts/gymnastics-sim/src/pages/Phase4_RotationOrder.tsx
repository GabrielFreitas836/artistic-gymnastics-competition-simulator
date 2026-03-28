import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Plus, X, AlertCircle, Users, ChevronUp, ChevronDown, ListOrdered } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { getCountryById } from "@/lib/countries";
import { Gymnast, ApparatusKey } from "@/lib/types";
import { clsx } from "clsx";

const APPARATUS: ApparatusKey[] = ['VT', 'UB', 'BB', 'FX'];
const APP_LABEL: Record<ApparatusKey, string> = {
  VT: 'Vault', UB: 'Uneven Bars', BB: 'Balance Beam', FX: 'Floor',
};

interface Entity {
  id: string;
  name: string;
  flag: string;
  type: 'TEAM' | 'MG';
}

export default function Phase4_RotationOrder() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const [subs, setSubs] = useState<Record<number, Record<string, ApparatusKey>>>({
    1: {}, 2: {}, 3: {}, 4: {}, 5: {},
  });
  const [warning, setWarning] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<{ sub: number; app: ApparatusKey } | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // ── Entity list ────────────────────────────────────────────────────────────
  const entities = useMemo((): Entity[] => {
    const list: Entity[] = [];
    Object.values(state.teams).forEach(t => {
      const country = getCountryById(t.countryId);
      list.push({ id: t.countryId, name: country.name, flag: country.flag, type: 'TEAM' });
    });
    Object.values(state.mixedGroups).forEach(mg => {
      list.push({ id: mg.id, name: mg.name, flag: '👥', type: 'MG' });
    });
    return list;
  }, [state.teams, state.mixedGroups]);

  // ── Initialise from saved state ────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(state.mixedGroups).length === 0) {
      setLocation("/mixed-groups");
      return;
    }

    const hasData = [1, 2, 3, 4, 5].some(s => Object.keys(state.subdivisions[s] || {}).length > 0);
    if (hasData) {
      const cleaned: Record<number, Record<string, ApparatusKey>> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
      [1, 2, 3, 4, 5].forEach(s => {
        Object.entries(state.subdivisions[s] || {}).forEach(([eid, app]) => {
          if (app !== 'BYE') cleaned[s][eid] = app as ApparatusKey;
        });
      });
      setSubs(cleaned);
    } else {
      // Auto-assign: 4 entities per subdivision (5 subs × 4 = 20), one per apparatus
      // BUG NOTE: using idx % 4 (not % 5) so APPARATUS[appIdx] is always defined
      const initial: Record<number, Record<string, ApparatusKey>> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
      entities.forEach((entity, idx) => {
        const subNum = Math.floor(idx / 4) + 1; // groups of 4 → subs 1-5
        const appIdx = idx % 4;                  // 0-3 only → always a valid APPARATUS index
        initial[subNum][entity.id] = APPARATUS[appIdx];
      });
      setSubs(initial);
    }
  }, [state.mixedGroups, state.subdivisions, entities, setLocation]);

  // Select first entity by default when list is ready
  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities, selectedEntityId]);

  // ── Subdivision assignment helpers ─────────────────────────────────────────
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    [1, 2, 3, 4, 5].forEach(s => Object.keys(subs[s]).forEach(id => ids.add(id)));
    return ids;
  }, [subs]);

  const unassigned = useMemo(() => entities.filter(e => !assignedIds.has(e.id)), [entities, assignedIds]);

  const getEntitiesInSlot = (sub: number, app: ApparatusKey): Entity[] =>
    Object.entries(subs[sub])
      .filter(([, a]) => a === app)
      .map(([id]) => entities.find(e => e.id === id))
      .filter(Boolean) as Entity[];

  const assignEntity = (entityId: string, targetSub: number, targetApp: ApparatusKey) => {
    setSubs(prev => {
      const next: Record<number, Record<string, ApparatusKey>> = {
        1: { ...prev[1] }, 2: { ...prev[2] }, 3: { ...prev[3] }, 4: { ...prev[4] }, 5: { ...prev[5] },
      };
      [1, 2, 3, 4, 5].forEach(s => delete next[s][entityId]);
      next[targetSub][entityId] = targetApp;
      return next;
    });
    setAddingTo(null);
    setWarning(null);
  };

  const removeEntity = (entityId: string) => {
    setSubs(prev => {
      const next: Record<number, Record<string, ApparatusKey>> = {
        1: { ...prev[1] }, 2: { ...prev[2] }, 3: { ...prev[3] }, 4: { ...prev[4] }, 5: { ...prev[5] },
      };
      [1, 2, 3, 4, 5].forEach(s => delete next[s][entityId]);
      return next;
    });
    setAddingTo(null);
  };

  // ── Internal ordering helpers ──────────────────────────────────────────────
  const getGymnastsForApp = (entityId: string, app: ApparatusKey): Gymnast[] => {
    const team = state.teams[entityId];
    const mg = state.mixedGroups[entityId];
    const all: Gymnast[] = team ? team.gymnasts : mg ? mg.gymnasts : [];

    const filtered = all.filter(g =>
      app === 'VT'
        ? g.apparatus.includes('VT') || g.apparatus.includes('VT*')
        : g.apparatus.includes(app)
    );

    const order = state.apparatusOrder?.[entityId]?.[app];
    if (!order || order.length === 0) return filtered;

    return [...filtered].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  };

  const moveGymnastInOrder = (entityId: string, app: ApparatusKey, fromIdx: number, toIdx: number) => {
    const ordered = getGymnastsForApp(entityId, app);
    const ids = ordered.map(g => g.id);
    const [removed] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, removed);
    dispatch({
      type: 'SET_APPARATUS_ORDER',
      payload: {
        ...state.apparatusOrder,
        [entityId]: {
          ...(state.apparatusOrder?.[entityId] || {}),
          [app]: ids,
        },
      },
    });
  };

  // ── Proceed to Phase 5 ─────────────────────────────────────────────────────
  const totalAssigned = [1, 2, 3, 4, 5].reduce((sum, s) => sum + Object.keys(subs[s]).length, 0);

  const handleNext = () => {
    if (totalAssigned !== entities.length) {
      setWarning(`All ${entities.length} teams/groups must be assigned. Currently: ${totalAssigned}/${entities.length}`);
      return;
    }
    dispatch({ type: 'SET_SUBDIVISIONS', payload: subs as any });
    if (state.phase < 5) dispatch({ type: 'SET_PHASE', payload: 5 });
    setLocation("/scoring");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setLocation("/mixed-groups")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-1">ROTATION DRAW</h2>
          <p className="text-sm text-slate-400">Assign Teams & Mixed Groups to Subdivisions, then set internal competition order</p>
        </div>
        <span className={clsx(
          "font-bold px-3 py-1 rounded-full border text-sm",
          totalAssigned === entities.length
            ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
        )}>
          {totalAssigned} / {entities.length} assigned
        </span>
      </div>

      {warning && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{warning}</p>
        </div>
      )}

      {/* ── STEP 1: Subdivision / Apparatus assignment ── */}
      <div className="glass-panel rounded-2xl p-5 mb-4 border-l-4 border-l-amber-500/60">
        <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-1">Step 1</p>
        <p className="text-sm text-slate-400 font-medium">Assign each team & mixed group to a subdivision and starting apparatus</p>
      </div>

      {unassigned.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 mb-6 border-l-4 border-l-red-500/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Unassigned ({unassigned.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(e => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm font-medium">
                <span className="text-lg">{e.type === 'TEAM' ? e.flag : '👥'}</span>
                <span>{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-12">
        {[1, 2, 3, 4, 5].map(subId => {
          const subCount = Object.keys(subs[subId]).length;
          return (
            <div key={subId} className="glass-panel rounded-2xl flex flex-col border-t-4 border-t-amber-500/50 overflow-hidden">
              <div className="p-4 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-display font-bold text-amber-400">Sub {subId}</h3>
                <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-400">{subCount} units</span>
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                {APPARATUS.map(app => {
                  const slotEntities = getEntitiesInSlot(subId, app);
                  const isAddingHere = addingTo?.sub === subId && addingTo?.app === app;

                  return (
                    <div key={app} className="rounded-xl border border-white/5 bg-slate-900/60 overflow-hidden">
                      <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                        <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">{APP_LABEL[app]} ({app})</span>
                        <button
                          onClick={() => setAddingTo(isAddingHere ? null : { sub: subId, app })}
                          disabled={unassigned.length === 0}
                          className={clsx(
                            "p-1 rounded transition-colors",
                            unassigned.length === 0 ? "text-slate-700 cursor-not-allowed"
                              : isAddingHere ? "text-amber-400 bg-amber-500/20"
                              : "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10"
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-2 flex flex-col gap-1 min-h-[2.5rem]">
                        {slotEntities.map(entity => (
                          <div key={entity.id} className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-slate-800/80 border border-white/5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{entity.type === 'TEAM' ? entity.flag : '👥'}</span>
                              <span className="text-[11px] font-semibold text-slate-200 truncate">{entity.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <select
                                value={`${subId}_${app}`}
                                onChange={e => {
                                  const [newSubStr, newApp] = e.target.value.split('_');
                                  assignEntity(entity.id, Number(newSubStr), newApp as ApparatusKey);
                                }}
                                className="text-[10px] bg-slate-700 border-none text-slate-400 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                              >
                                {[1, 2, 3, 4, 5].flatMap(s =>
                                  APPARATUS.map(a => (
                                    <option key={`${s}_${a}`} value={`${s}_${a}`}>Sub {s} / {a}</option>
                                  ))
                                )}
                              </select>
                              <button
                                onClick={() => removeEntity(entity.id)}
                                className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {isAddingHere && (
                          <div className="mt-1">
                            <select
                              autoFocus
                              defaultValue=""
                              onChange={e => { if (e.target.value) assignEntity(e.target.value, subId, app); }}
                              onBlur={() => setAddingTo(null)}
                              className="w-full bg-slate-800 border border-amber-500/50 text-white text-xs rounded-lg py-2 px-2 outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">Select a team/group…</option>
                              {unassigned.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.type === 'TEAM' ? `${e.flag} ${e.name}` : e.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STEP 2: Internal competition order ── */}
      <div className="glass-panel rounded-2xl p-5 mb-4 border-l-4 border-l-violet-500/60">
        <div className="flex items-center gap-2 mb-1">
          <ListOrdered className="w-4 h-4 text-violet-400" />
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">Step 2</p>
        </div>
        <p className="text-sm text-slate-400 font-medium">
          Set the internal competition order for each team or mixed group on each apparatus.
          Use the ↑ ↓ arrows to reorder gymnasts. Changes save automatically.
        </p>
      </div>

      {/* Entity selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {entities.map(e => (
          <button
            key={e.id}
            onClick={() => setSelectedEntityId(e.id)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
              selectedEntityId === e.id
                ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-white hover:border-white/20"
            )}
          >
            <span>{e.type === 'TEAM' ? e.flag : '👥'}</span>
            <span className="truncate max-w-[8rem]">{e.name}</span>
          </button>
        ))}
      </div>

      {/* Apparatus ordering panels for selected entity */}
      {selectedEntityId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
          {APPARATUS.map(app => {
            const gymnasts = getGymnastsForApp(selectedEntityId, app);
            if (gymnasts.length === 0) {
              return (
                <div key={app} className="glass-panel rounded-2xl overflow-hidden border border-white/5 opacity-40">
                  <div className="px-4 py-3 bg-slate-900/60 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{APP_LABEL[app]}</span>
                  </div>
                  <div className="p-4 text-center text-xs text-slate-600 italic">No gymnasts</div>
                </div>
              );
            }

            return (
              <div key={app} className="glass-panel rounded-2xl overflow-hidden border border-violet-500/20">
                <div className="px-4 py-3 bg-slate-900/60 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">{APP_LABEL[app]}</span>
                  <span className="text-[10px] text-slate-500">{gymnasts.length} gymnast{gymnasts.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  {gymnasts.map((g, idx) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-white/5"
                    >
                      <span className="text-[11px] font-bold text-slate-500 w-5 text-center shrink-0">{idx + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-200 truncate">{g.name}</span>
                      {g.apparatus.includes('VT*') && app === 'VT' && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded shrink-0">2VT</span>
                      )}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveGymnastInOrder(selectedEntityId, app, idx, idx - 1)}
                          className="p-0.5 rounded text-slate-500 hover:text-violet-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === gymnasts.length - 1}
                          onClick={() => moveGymnastInOrder(selectedEntityId, app, idx, idx + 1)}
                          className="p-0.5 rounded text-slate-500 hover:text-violet-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proceed button */}
      <div className="flex justify-center">
        <button
          onClick={handleNext}
          disabled={totalAssigned !== entities.length}
          className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg uppercase tracking-wide transition-all duration-300 bg-gold-gradient text-slate-950 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Start Competition <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
