import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSimulation } from "@/context/SimulationContext";
import { getCountryById } from "@/lib/countries";
import { calculateScore } from "@/lib/scoring";
import {
  areTeamFinalLineupsComplete,
  buildTeamFinalSlots,
  getQualificationCompletionStatus,
  getTeamFinalApparatusResult,
  getTeamFinalCompletionCount,
  getTeamFinalLineupGymnasts,
  getTeamFinalQualificationPool,
  getTeamFinalRankings,
  getTeamFinalStage,
  getTeamFinalStoredScore,
  isTeamFinalDnsActive,
  isTeamFinalLineupComplete,
  TEAM_FINAL_APPARATUS,
  TEAM_FINAL_ROTATIONS,
} from "@/lib/teamFinal";
import { ApparatusKey, DnsEntryKey, Score, Team, TeamFinalSlot } from "@/lib/types";

type ScoreField = "d" | "e" | "penalty";
type PersistedScore = Score & { __touched?: Partial<Record<ScoreField, boolean>> };
type TeamFinalTab = "STANDINGS" | "TEAM_APP";

const TOTAL_TEAM_FINAL_ROUTINES = 96;

const APP_LABEL: Record<ApparatusKey, string> = {
  VT: "Vault",
  UB: "Uneven Bars",
  BB: "Balance Beam",
  FX: "Floor Exercise",
};

const MEDAL_TAG_CLASS: Record<"Gold" | "Silver" | "Bronze", string> = {
  Gold: "text-amber-400",
  Silver: "text-[#c0c7d1]",
  Bronze: "text-[#c9733d]",
};

const formatScoreField = (value: number): string => value.toFixed(3);

const getScoreFieldKey = (
  gymnastId: string,
  app: ApparatusKey,
  field: ScoreField,
): string => `${gymnastId}_${app}_${field}`;

const sanitizeScoreInput = (raw: string): string => {
  if (raw === "") return "";

  const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const startsWithDot = normalized.startsWith(".");
  const [integerPartRaw = "", ...decimalParts] = normalized.split(".");
  const integerPart = startsWithDot ? "0" : integerPartRaw;
  const decimalPart = decimalParts.join("").slice(0, 3);

  if (normalized.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
};

const normalizeScoreInput = (raw: string): { numericValue: number; formattedValue: string } | null => {
  if (raw.trim() === "") return null;

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return null;

  const numericValue = Number(parsed.toFixed(3));
  return {
    numericValue,
    formattedValue: formatScoreField(numericValue),
  };
};

const getTeamName = (teamId: string): string => getCountryById(teamId).name;

const getReserveBadge = (slot: TeamFinalSlot): string | null =>
  slot.reserveSource ? `${slot.reserveSource} replaces ${getTeamName(slot.qualifiedTeamId)}` : null;

export default function Phase7_TeamFinal() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const [activeTeamId, setActiveTeamId] = useState<string>("");
  const [activeRotation, setActiveRotation] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TeamFinalTab>("STANDINGS");
  const [replacementChoice, setReplacementChoice] = useState<boolean | null>(null);
  const [selectedReplacementSeeds, setSelectedReplacementSeeds] = useState<number[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const qualificationPool = useMemo(
    () => getTeamFinalQualificationPool(state),
    [state],
  );

  const stage = useMemo(() => getTeamFinalStage(state), [state]);
  const slots = useMemo(
    () => [...state.finals.teamFinal.slots].sort((a, b) => a.seedRank - b.seedRank),
    [state.finals.teamFinal.slots],
  );

  const finalists = useMemo(
    () =>
      slots
        .map((slot) => state.teams[slot.activeTeamId])
        .filter((team): team is Team => Boolean(team)),
    [slots, state.teams],
  );

  const rankings = useMemo(() => getTeamFinalRankings(state), [state]);
  const completedRoutineCount = useMemo(
    () => getTeamFinalCompletionCount(state),
    [state],
  );

  useEffect(() => {
    if (qualificationCompletion.isComplete && state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
  }, [dispatch, qualificationCompletion.isComplete, state.phase]);

  useEffect(() => {
    if (finalists.length === 0) {
      setActiveTeamId("");
      return;
    }

    const currentExists = finalists.some((team) => team.countryId === activeTeamId);
    if (!currentExists) {
      setActiveTeamId(finalists[0].countryId);
    }
  }, [activeTeamId, finalists]);

  const persistLineup = (teamId: string, apparatus: ApparatusKey, gymnastIds: string[]) => {
    dispatch({
      type: "UPDATE_TEAM_FINAL_LINEUP",
      payload: {
        teamId,
        apparatus,
        gymnastIds,
      },
    });
  };

  const toggleLineupGymnast = (teamId: string, apparatus: ApparatusKey, gymnastId: string) => {
    const currentIds = [...(state.finals.teamFinal.lineups[teamId]?.[apparatus] || [])];
    const currentIndex = currentIds.indexOf(gymnastId);

    if (currentIndex >= 0) {
      currentIds.splice(currentIndex, 1);
      persistLineup(teamId, apparatus, currentIds);
      return;
    }

    if (currentIds.length >= 3) return;
    persistLineup(teamId, apparatus, [...currentIds, gymnastId]);
  };

  const moveLineupGymnast = (
    teamId: string,
    apparatus: ApparatusKey,
    fromIndex: number,
    toIndex: number,
  ) => {
    const currentIds = [...(state.finals.teamFinal.lineups[teamId]?.[apparatus] || [])];
    if (toIndex < 0 || toIndex >= currentIds.length) return;

    const [moved] = currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, moved);
    persistLineup(teamId, apparatus, currentIds);
  };

  const handleConfirmSlots = () => {
    setSetupError(null);

    if (qualificationPool.qualified.length < 8) {
      setSetupError("Team Final requires 8 qualified teams in the qualification ranking.");
      return;
    }

    if (replacementChoice === null) {
      setSetupError("Choose whether reserve teams will replace any qualifiers.");
      return;
    }

    const replacementLimit = Math.min(2, qualificationPool.reserves.length);
    if (replacementChoice) {
      if (replacementLimit === 0) {
        setSetupError("No reserve teams are available for replacement.");
        return;
      }
      if (selectedReplacementSeeds.length === 0) {
        setSetupError("Select at least one qualified team to be replaced.");
        return;
      }
      if (selectedReplacementSeeds.length > replacementLimit) {
        setSetupError(`You can replace up to ${replacementLimit} team${replacementLimit === 1 ? "" : "s"}.`);
        return;
      }
    }

    const slotsPayload = buildTeamFinalSlots(
      state,
      replacementChoice ? selectedReplacementSeeds : [],
    );

    if (slotsPayload.length !== 8) {
      setSetupError("Unable to build the Team Final bracket from the current qualification data.");
      return;
    }

    dispatch({ type: "SET_TEAM_FINAL_SLOTS", payload: slotsPayload });
    dispatch({ type: "SET_PHASE", payload: 7 });
  };

  const handleRestartTeamFinal = () => {
    if (!window.confirm("Restart Team Final and clear lineups plus final scores?")) {
      return;
    }

    dispatch({ type: "RESET_TEAM_FINAL" });
    setReplacementChoice(null);
    setSelectedReplacementSeeds([]);
    setSetupError(null);
    setScoreDrafts({});
    setActiveRotation(1);
    setActiveTab("STANDINGS");
  };

  const toggleReplacementSeed = (seedRank: number) => {
    const replacementLimit = Math.min(2, qualificationPool.reserves.length);

    setSelectedReplacementSeeds((current) => {
      if (current.includes(seedRank)) {
        return current.filter((value) => value !== seedRank);
      }
      if (current.length >= replacementLimit) {
        return current;
      }
      return [...current, seedRank];
    });
  };

  const handleScoreUpdate = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    value: number,
  ) => {
    const currentScore = getTeamFinalStoredScore(
      state.finals.teamFinal.scores,
      gymnastId,
      apparatus,
    ) as PersistedScore | undefined;

    const nextScore: PersistedScore = {
      ...(currentScore || { d: 0, e: 0, penalty: 0, total: 0 }),
      [field]: value,
      __touched: {
        ...(currentScore?.__touched || {}),
        [field]: true,
      },
    };
    nextScore.total = calculateScore(nextScore.d, nextScore.e, nextScore.penalty);

    dispatch({
      type: "UPDATE_TEAM_FINAL_SCORE",
      payload: {
        gymnastId,
        app: apparatus,
        score: nextScore,
      },
    });
  };

  const getScoreInputValue = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    storedScore?: PersistedScore,
  ): string => {
    const fieldKey = getScoreFieldKey(gymnastId, apparatus, field);
    if (fieldKey in scoreDrafts) {
      return scoreDrafts[fieldKey];
    }

    if (storedScore?.__touched?.[field]) {
      return formatScoreField(storedScore[field]);
    }

    return "";
  };

  const updateScoreDraft = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    rawValue: string,
  ) => {
    const fieldKey = getScoreFieldKey(gymnastId, apparatus, field);
    setScoreDrafts((current) => ({
      ...current,
      [fieldKey]: sanitizeScoreInput(rawValue),
    }));
  };

  const clearScoreDraft = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
  ) => {
    const fieldKey = getScoreFieldKey(gymnastId, apparatus, field);
    setScoreDrafts((current) => {
      if (!(fieldKey in current)) return current;
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const handleScoreBlur = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    storedScore?: PersistedScore,
  ) => {
    const fieldKey = getScoreFieldKey(gymnastId, apparatus, field);
    const draftValue = scoreDrafts[fieldKey];
    if (draftValue === undefined) return;

    if (draftValue.trim() === "") {
      if (storedScore) {
        handleScoreUpdate(gymnastId, apparatus, field, 0);
      }
      clearScoreDraft(gymnastId, apparatus, field);
      return;
    }

    const normalized = normalizeScoreInput(draftValue);
    if (!normalized) {
      clearScoreDraft(gymnastId, apparatus, field);
      return;
    }

    handleScoreUpdate(gymnastId, apparatus, field, normalized.numericValue);
    clearScoreDraft(gymnastId, apparatus, field);
  };

  const handleToggleDns = (gymnastId: string, apparatus: ApparatusKey) => {
    dispatch({
      type: "TOGGLE_TEAM_FINAL_DNS",
      payload: { gymnastId, key: apparatus as DnsEntryKey },
    });
  };

  if (!qualificationCompletion.isComplete) {
    return (
      <div className="mx-auto max-w-4xl pb-24">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => setLocation("/finals")}
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" /> Back to Finals
          </button>
        </div>

        <div className="glass-panel rounded-3xl border border-rose-500/20 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mb-3 text-3xl font-display font-bold text-white">Team Final Locked</h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            {qualificationCompletion.message}
          </p>
          {qualificationCompletion.missingRoutineCount > 0 && (
            <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-rose-300">
              {qualificationCompletion.missingRoutineCount} routines still missing
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentTeam = activeTeamId ? state.teams[activeTeamId] : null;
  const lineupsReady = areTeamFinalLineupsComplete(state);

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <Dialog open={stage === "substitution"} onOpenChange={() => undefined}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto overscroll-contain border border-amber-500/20 bg-slate-950 text-white touch-pan-y">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-widest text-white">
              TEAM FINAL SUBSTITUTIONS
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Decide whether reserve teams R1 and R2 will replace any of the top 8 qualifiers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setReplacementChoice(false);
                  setSelectedReplacementSeeds([]);
                  setSetupError(null);
                }}
                className={clsx(
                  "rounded-2xl border px-5 py-4 text-left transition-all",
                  replacementChoice === false
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-emerald-500/30",
                )}
              >
                <div className="text-sm font-bold uppercase tracking-widest">No</div>
                <div className="mt-1 text-sm text-slate-400">
                  Keep the original Top 8 qualification order.
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplacementChoice(true);
                  setSetupError(null);
                }}
                className={clsx(
                  "rounded-2xl border px-5 py-4 text-left transition-all",
                  replacementChoice === true
                    ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                    : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-amber-500/30",
                )}
              >
                <div className="text-sm font-bold uppercase tracking-widest">Yes</div>
                <div className="mt-1 text-sm text-slate-400">
                  Replace one or two qualifiers using reserves automatically as R1, then R2.
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
                <span>Qualified: {qualificationPool.qualified.length}/8</span>
                <span>Reserves: {qualificationPool.reserves.map((row) => row.status).join(", ") || "none"}</span>
                {replacementChoice && (
                  <span>
                    Selected replacements: {selectedReplacementSeeds.length}/{Math.min(2, qualificationPool.reserves.length)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {qualificationPool.qualified.map((row) => {
                  const isSelected = selectedReplacementSeeds.includes(row.rank ?? 0);
                  const replacementOrder = isSelected
                    ? selectedReplacementSeeds.indexOf(row.rank ?? 0) + 1
                    : null;

                  return (
                    <button
                      key={row.team.countryId}
                      type="button"
                      disabled={!replacementChoice}
                      onClick={() => row.rank && toggleReplacementSeed(row.rank)}
                      className={clsx(
                        "grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all",
                        replacementChoice !== true
                          ? "cursor-not-allowed border-white/5 bg-slate-900/40 text-slate-500"
                          : isSelected
                            ? "border-amber-400/50 bg-amber-500/10 text-white"
                            : "border-white/10 bg-slate-950/70 text-slate-200 hover:border-amber-500/30",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCountryById(row.team.countryId).flag}</span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-white">
                              {getCountryById(row.team.countryId).name}
                            </div>
                            {replacementOrder !== null && (
                              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                                {replacementOrder === 1 ? "R1 will replace this seed" : "R2 will replace this seed"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-300">
                        Rk {row.rank ?? "-"}
                      </div>
                      <div className="text-sm font-bold text-amber-400">
                        {row.total !== null ? row.total.toFixed(3) : "-"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {replacementChoice && qualificationPool.reserves.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                {qualificationPool.reserves.map((reserve) => (
                  <div key={reserve.team.countryId} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{getCountryById(reserve.team.countryId).flag}</span>
                      <span>{getCountryById(reserve.team.countryId).name}</span>
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
                      {reserve.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {setupError && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleConfirmSlots}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-bold uppercase tracking-wide text-slate-950 transition-all hover:bg-amber-400"
            >
              Continue to Lineups <ChevronRight className="h-4 w-4" />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => setLocation("/results")}
            className="mb-3 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" /> Qualification Results
          </button>
          <h2 className="flex items-center gap-3 text-3xl font-display font-bold text-white">
            <Trophy className="h-8 w-8 text-amber-400" />
            TEAM FINAL
          </h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Manage reserves, lock the 3-up-3-count lineups, then score the final with live standings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRestartTeamFinal}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold uppercase tracking-wide text-slate-300 transition-colors hover:border-amber-500/30 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Restart Team Final
        </button>
      </div>

      {slots.length > 0 && (
        <div className="glass-panel mb-8 rounded-3xl border border-white/10 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {slots.map((slot) => {
              const country = getCountryById(slot.activeTeamId);
              const replacementNote = getReserveBadge(slot);

              return (
                <div
                  key={`${slot.seedRank}_${slot.activeTeamId}`}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                >
                  <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                    Seed {slot.seedRank}
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-white">
                    <span className="text-xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                  {replacementNote && (
                    <div className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">
                      {replacementNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
            <span>Stage: {stage === "lineups" ? "Lineups" : stage === "scoring" ? "Scoring" : "Substitution"}</span>
            <span>Completed routines: {completedRoutineCount}/{TOTAL_TEAM_FINAL_ROUTINES}</span>
            <span>{lineupsReady ? "Lineups locked" : "Lineups pending"}</span>
          </div>
        </div>
      )}
      {stage === "lineups" && currentTeam && (
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl border border-violet-500/20 p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                  Team Lineups
                </p>
                <h3 className="mt-2 text-2xl font-display font-bold text-white">
                  Select exactly 3 gymnasts per apparatus
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  The order you define here becomes gymnast 1, 2, and 3 for the alternating final sequence.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-right">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Teams Ready
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {finalists.filter((team) => isTeamFinalLineupComplete(team, state.finals.teamFinal.lineups)).length}/8
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {finalists.map((team) => {
                const slot = slots.find((entry) => entry.activeTeamId === team.countryId);
                const country = getCountryById(team.countryId);
                const ready = isTeamFinalLineupComplete(team, state.finals.teamFinal.lineups);

                return (
                  <button
                    key={team.countryId}
                    type="button"
                    onClick={() => setActiveTeamId(team.countryId)}
                    className={clsx(
                      "rounded-2xl border px-4 py-3 text-left transition-all",
                      activeTeamId === team.countryId
                        ? "border-violet-400/50 bg-violet-500/10 text-white"
                        : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <div className="font-semibold">{country.name}</div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">
                          Seed {slot?.seedRank ?? "-"} {ready ? "• Ready" : "• Pending"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {TEAM_FINAL_APPARATUS.map((apparatus) => {
                const selectedIds = state.finals.teamFinal.lineups[currentTeam.countryId]?.[apparatus] || [];
                const eligibleGymnasts = currentTeam.gymnasts.filter((gymnast) =>
                  apparatus === "VT"
                    ? gymnast.apparatus.includes("VT") || gymnast.apparatus.includes("VT*")
                    : gymnast.apparatus.includes(apparatus),
                );
                const selectedGymnasts = getTeamFinalLineupGymnasts(
                  currentTeam,
                  apparatus,
                  state.finals.teamFinal.lineups,
                );

                return (
                  <div
                    key={apparatus}
                    className="rounded-3xl border border-white/10 bg-slate-900/50 p-5"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <h4 className="font-display text-xl font-bold text-white">
                          {APP_LABEL[apparatus]} ({apparatus})
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          {apparatus === "VT"
                            ? "Each selected gymnast performs one vault only in the final."
                            : "Choose the 3 gymnasts who will compete on this apparatus."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-right">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Selected
                        </div>
                        <div className="text-lg font-bold text-white">{selectedIds.length}/3</div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-2">
                        {eligibleGymnasts.map((gymnast) => {
                          const isSelected = selectedIds.includes(gymnast.id);

                          return (
                            <button
                              key={gymnast.id}
                              type="button"
                              onClick={() => toggleLineupGymnast(currentTeam.countryId, apparatus, gymnast.id)}
                              className={clsx(
                                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                                isSelected
                                  ? "border-amber-400/50 bg-amber-500/10 text-white"
                                  : selectedIds.length >= 3
                                    ? "border-white/5 bg-slate-950/60 text-slate-500"
                                    : "border-white/10 bg-slate-950/70 text-slate-200 hover:border-amber-500/30",
                              )}
                            >
                              <div>
                                <div className="font-semibold">{gymnast.name}</div>
                                <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                  {gymnast.apparatus.join(" / ")}
                                </div>
                              </div>
                              <div className="text-xs font-bold uppercase tracking-widest">
                                {isSelected ? "Selected" : "Select"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                          Final order 1-2-3
                        </div>
                        <div className="space-y-2">
                          {selectedGymnasts.length === 0 && (
                            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm italic text-slate-500">
                              No gymnasts selected yet.
                            </div>
                          )}

                          {selectedGymnasts.map((gymnast, index) => (
                            <div
                              key={gymnast.id}
                              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-3 py-3"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold text-white">{gymnast.name}</div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() =>
                                    moveLineupGymnast(currentTeam.countryId, apparatus, index, index - 1)
                                  }
                                  className="rounded-md border border-white/10 p-1 text-slate-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === selectedGymnasts.length - 1}
                                  onClick={() =>
                                    moveLineupGymnast(currentTeam.countryId, apparatus, index, index + 1)
                                  }
                                  className="rounded-md border border-white/10 p-1 text-slate-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {stage === "scoring" && (
        <div className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_1.4fr]">
            <div className="glass-panel rounded-3xl border border-white/10 p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Live Rankings
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Team standings update in real time from the apparatus totals.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Routines
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {completedRoutineCount}/{TOTAL_TEAM_FINAL_ROUTINES}
                  </div>
                </div>
              </div>

              <div className="mb-4 flex gap-2 rounded-2xl bg-slate-950/70 p-1">
                {[
                  { id: "STANDINGS" as const, label: "Standings" },
                  { id: "TEAM_APP" as const, label: "Team apparatus" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex-1 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                      activeTab === tab.id
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "STANDINGS" ? (
                <div className="space-y-3">
                  {rankings.map((row) => {
                    const country = getCountryById(row.team.countryId);
                    const replacementNote = getReserveBadge(row.slot);

                    return (
                      <div
                        key={`${row.slot.seedRank}_${row.team.countryId}`}
                        className={clsx(
                          "rounded-2xl border px-4 py-4 transition-colors",
                          row.tied
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-white/10 bg-slate-950/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-amber-300">
                              {row.rank}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{country.flag}</span>
                                <div>
                                  <div className="font-display text-lg font-bold text-white">
                                    {country.name}
                                  </div>
                                  {row.medal && (
                                    <div
                                      className={clsx(
                                        "mt-1 text-xs font-bold uppercase tracking-widest",
                                        MEDAL_TAG_CLASS[row.medal],
                                      )}
                                    >
                                      {row.medal}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                                <span>Seed {row.slot.seedRank}</span>
                                <span>{row.completedRoutineCount}/12 done</span>
                                {row.tied && <span>Tied</span>}
                                {replacementNote && <span>{replacementNote}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              Total
                            </div>
                            <div className="text-2xl font-bold text-amber-400">
                              {row.total.toFixed(3)}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">
                              SD {row.standardDeviation.toFixed(6)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                        <th className="px-3 py-3 font-bold">Team</th>
                        {TEAM_FINAL_APPARATUS.map((apparatus) => (
                          <th key={apparatus} className="px-3 py-3 text-right font-bold">
                            {apparatus}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rankings.map((row) => {
                        const country = getCountryById(row.team.countryId);

                        return (
                          <tr key={row.team.countryId} className="transition-colors hover:bg-white/5">
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{country.flag}</span>
                                <div>
                                  <div className="font-semibold text-white">{country.name}</div>
                                  <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                    Seed {row.slot.seedRank}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {TEAM_FINAL_APPARATUS.map((apparatus) => (
                              <td
                                key={apparatus}
                                className="px-3 py-4 text-right font-mono text-slate-200"
                              >
                                {row.apparatus[apparatus].score.toFixed(3)}
                              </td>
                            ))}
                            <td className="px-3 py-4 text-right text-lg font-bold text-amber-400">
                              {row.total.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-3xl border border-white/10 p-6">
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white">
                      Scoring Rotations
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Teams alternate routines within each apparatus pair, following the fixed Team Final draw.
                    </p>
                  </div>
                  <div className="flex rounded-2xl bg-slate-950/70 p-1">
                    {[1, 2, 3, 4].map((rotation) => (
                      <button
                        key={rotation}
                        type="button"
                        onClick={() => setActiveRotation(rotation)}
                        className={clsx(
                          "rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                          activeRotation === rotation
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-400 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        Rot {rotation}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                  {TEAM_FINAL_APPARATUS.map((apparatus) => {
                    const [seedA, seedB] = TEAM_FINAL_ROTATIONS[activeRotation][apparatus];
                    const slotA = slots.find((slot) => slot.seedRank === seedA);
                    const slotB = slots.find((slot) => slot.seedRank === seedB);

                    if (!slotA || !slotB) {
                      return null;
                    }

                    const teamA = state.teams[slotA.activeTeamId];
                    const teamB = state.teams[slotB.activeTeamId];
                    if (!teamA || !teamB) return null;

                    const lineupA = getTeamFinalLineupGymnasts(teamA, apparatus, state.finals.teamFinal.lineups);
                    const lineupB = getTeamFinalLineupGymnasts(teamB, apparatus, state.finals.teamFinal.lineups);
                    const apparatusResultA = getTeamFinalApparatusResult(
                      teamA,
                      apparatus,
                      state.finals.teamFinal.lineups,
                      state.finals.teamFinal.scores,
                      state.finals.teamFinal.dns,
                    );
                    const apparatusResultB = getTeamFinalApparatusResult(
                      teamB,
                      apparatus,
                      state.finals.teamFinal.lineups,
                      state.finals.teamFinal.scores,
                      state.finals.teamFinal.dns,
                    );

                    const rows = [
                      lineupA[0],
                      lineupB[0],
                      lineupA[1],
                      lineupB[1],
                      lineupA[2],
                      lineupB[2],
                    ].filter(Boolean);

                    return (
                      <div
                        key={`${activeRotation}_${apparatus}`}
                        className="rounded-3xl border border-white/10 bg-slate-900/50 p-6"
                      >
                        <div className="mb-5 border-b border-white/10 pb-5">
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="font-display text-xl font-bold text-white">
                              {APP_LABEL[apparatus]} ({apparatus})
                            </h4>
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              Rotation {activeRotation}
                            </div>
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {[
                              { slot: slotA, team: teamA, result: apparatusResultA },
                              { slot: slotB, team: teamB, result: apparatusResultB },
                            ].map(({ slot, team, result }) => {
                              const country = getCountryById(team.countryId);
                              const replacementNote = getReserveBadge(slot);

                              return (
                                <div
                                  key={`${apparatus}_${team.countryId}`}
                                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-3">
                                        <span className="text-2xl">{country.flag}</span>
                                        <div className="min-w-0">
                                          <div className="truncate font-semibold text-white">
                                            {country.name}
                                          </div>
                                          <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                            Seed {slot.seedRank}
                                          </div>
                                        </div>
                                      </div>
                                      {replacementNote && (
                                        <div className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">
                                          {replacementNote}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                                        App total
                                      </div>
                                      <div className="text-xl font-bold text-amber-400">
                                        {result.score.toFixed(3)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {rows.map((gymnast) => {
                            if (!gymnast) return null;

                            const team = gymnast.countryId === teamA.countryId ? teamA : teamB;
                            const slot = team.countryId === teamA.countryId ? slotA : slotB;
                            const country = getCountryById(team.countryId);
                            const dnsActive = isTeamFinalDnsActive(
                              state.finals.teamFinal.dns,
                              gymnast.id,
                              apparatus,
                            );
                            const storedScore = getTeamFinalStoredScore(
                              state.finals.teamFinal.scores,
                              gymnast.id,
                              apparatus,
                            ) as PersistedScore | undefined;
                            const scoreObj = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };
                            const isCompleted = dnsActive || Boolean(storedScore);

                            return (
                              <div
                                key={`${apparatus}_${gymnast.id}`}
                                className={clsx(
                                  "rounded-2xl border p-4 sm:p-5",
                                  dnsActive
                                    ? "border-rose-500/20 bg-rose-950/20"
                                    : "border-white/10 bg-slate-950/60",
                                )}
                              >
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2.5">
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                      ) : (
                                        <div className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="truncate text-base font-semibold text-white">
                                        {gymnast.name}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-slate-500">
                                      <span>{country.name}</span>
                                      <span>Seed {slot.seedRank}</span>
                                      {dnsActive && <span className="text-rose-300">DNS</span>}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleDns(gymnast.id, apparatus)}
                                    className={clsx(
                                      "self-start rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                                      dnsActive
                                        ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                                        : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/30 hover:text-rose-200",
                                    )}
                                  >
                                    DNS
                                  </button>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(8.5rem,0.95fr)]">
                                  {(["d", "e", "penalty"] as ScoreField[]).map((field) => (
                                    <div
                                      key={field}
                                      className="rounded-xl border border-white/10 bg-slate-900/70 p-3"
                                    >
                                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                        {field === "penalty" ? "ND" : `${field.toUpperCase()}-Score`}
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getScoreInputValue(gymnast.id, apparatus, field, storedScore)}
                                        disabled={dnsActive}
                                        onChange={(event) =>
                                          updateScoreDraft(gymnast.id, apparatus, field, event.target.value)
                                        }
                                        onBlur={() =>
                                          handleScoreBlur(gymnast.id, apparatus, field, storedScore)
                                        }
                                        className={clsx(
                                          "min-h-[3rem] w-full rounded-lg border px-3 py-2.5 text-base outline-none",
                                          dnsActive
                                            ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                                            : field === "penalty"
                                              ? "border-slate-700 bg-slate-800 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                              : "border-slate-700 bg-slate-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
                                        )}
                                      />
                                    </div>
                                  ))}

                                  <div className="flex min-h-[5.25rem] flex-col justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-right">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                                      Total
                                    </label>
                                    <div className="text-2xl font-bold text-white">
                                      {dnsActive ? "DNS" : scoreObj.total.toFixed(3)}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                      Final score
                                    </div>
                                  </div>
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
            </div>
          </div>
        </div>
      )}

      {stage === "lineups" && lineupsReady && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>All 8 team lineups are complete. Scoring is now available.</span>
        </div>
      )}
    </div>
  );
}
