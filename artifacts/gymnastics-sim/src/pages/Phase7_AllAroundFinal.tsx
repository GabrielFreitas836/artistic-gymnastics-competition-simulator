import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
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
import {
  ALL_AROUND_FINAL_APPARATUS,
  ALL_AROUND_FINAL_ROTATIONS,
  buildAllAroundFinalSlots,
  getAllAroundFinalCompletionCount,
  getAllAroundFinalQualificationPool,
  getAllAroundFinalRankings,
  getAllAroundFinalStage,
  getAllAroundFinalStoredScore,
  isAllAroundFinalDnsActive,
} from "@/lib/allAroundFinal";
import { getCountryById } from "@/lib/countries";
import { calculateScore } from "@/lib/scoring";
import { getQualificationCompletionStatus } from "@/lib/teamFinal";
import { ApparatusKey, DnsEntryKey, Score } from "@/lib/types";

type ScoreField = "d" | "e" | "penalty";
type PersistedScore = Score & { __touched?: Partial<Record<ScoreField, boolean>> };
type FinalTab = "STANDINGS" | "APPARATUS";

const APP_LABEL: Record<ApparatusKey, string> = {
  VT: "Vault",
  UB: "Uneven Bars",
  BB: "Balance Beam",
  FX: "Floor Exercise",
};

const MEDAL_CLASS: Record<"Gold" | "Silver" | "Bronze", string> = {
  Gold: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  Silver: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  Bronze: "border-orange-400/40 bg-orange-500/10 text-orange-300",
};

const formatScoreField = (value: number): string => value.toFixed(3);

const getScoreFieldKey = (
  gymnastId: string,
  apparatus: ApparatusKey,
  field: ScoreField,
): string => `${gymnastId}_${apparatus}_${field}`;

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

const formatOrdinal = (value: number | null): string => {
  if (value === null) return "-";
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
};

export default function Phase7_AllAroundFinal() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const [activeRotation, setActiveRotation] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<FinalTab>("STANDINGS");
  const [replacementChoice, setReplacementChoice] = useState<boolean | null>(null);
  const [selectedReplacementSlots, setSelectedReplacementSlots] = useState<number[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [rankIndicators, setRankIndicators] = useState<Record<string, boolean>>({});

  const indicatorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = indicatorTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const triggerRankIndicator = (gymnastId: string) => {
    if (indicatorTimers.current[gymnastId]) clearTimeout(indicatorTimers.current[gymnastId]);
    setRankIndicators((current) => ({ ...current, [gymnastId]: true }));
    indicatorTimers.current[gymnastId] = setTimeout(() => {
      setRankIndicators((current) => ({ ...current, [gymnastId]: false }));
    }, 7000);
  };

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const qualificationPool = useMemo(
    () => getAllAroundFinalQualificationPool(state),
    [state],
  );

  const stage = useMemo(
    () => getAllAroundFinalStage(state, qualificationCompletion.isComplete),
    [qualificationCompletion.isComplete, state],
  );

  const rankings = useMemo(() => getAllAroundFinalRankings(state), [state]);
  const completedRoutineCount = useMemo(
    () => getAllAroundFinalCompletionCount(state),
    [state],
  );

  const slots = useMemo(
    () => [...state.finals.allAroundFinal.slots].sort((a, b) => a.slotNumber - b.slotNumber),
    [state.finals.allAroundFinal.slots],
  );

  useEffect(() => {
    if (qualificationCompletion.isComplete && state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
  }, [dispatch, qualificationCompletion.isComplete, state.phase]);

  useEffect(() => {
    if (stage === "setup") {
      dispatch({ type: "SET_AA_FINAL_SLOTS", payload: buildAllAroundFinalSlots(state) });
    }
  }, [dispatch, stage, state]);

  const replacementLimit = Math.min(qualificationPool.reserves.length, qualificationPool.qualified.length);

  const toggleReplacementSlot = (slotNumber: number) => {
    setSelectedReplacementSlots((current) => {
      if (current.includes(slotNumber)) {
        return current.filter((value) => value !== slotNumber);
      }
      if (current.length >= replacementLimit) {
        return current;
      }
      return [...current, slotNumber];
    });
  };

  const handleConfirmSlots = () => {
    setSetupError(null);

    if (qualificationPool.qualified.length === 0) {
      setSetupError("No all-around finalists are available.");
      return;
    }

    if (qualificationPool.reserves.length > 0 && replacementChoice === null) {
      setSetupError("Choose whether reserve gymnasts will replace any qualifier.");
      return;
    }

    if (replacementChoice) {
      if (replacementLimit === 0) {
        setSetupError("No reserves are available for replacement.");
        return;
      }
      if (selectedReplacementSlots.length === 0) {
        setSetupError("Select at least one qualifier to be replaced.");
        return;
      }
      if (selectedReplacementSlots.length > replacementLimit) {
        setSetupError(`You can replace up to ${replacementLimit} gymnast${replacementLimit === 1 ? "" : "s"}.`);
        return;
      }
    }

    dispatch({
      type: "SET_AA_FINAL_SLOTS",
      payload: buildAllAroundFinalSlots(state, replacementChoice ? selectedReplacementSlots : []),
    });
    dispatch({ type: "SET_PHASE", payload: 7 });
  };

  const handleRestartFinal = () => {
    if (!window.confirm("Restart the Individual All-Around Final and clear all final scores?")) {
      return;
    }

    dispatch({ type: "RESET_AA_FINAL" });
    setReplacementChoice(null);
    setSelectedReplacementSlots([]);
    setSetupError(null);
    setScoreDrafts({});
    setActiveRotation(1);
    setActiveTab("STANDINGS");
  };

  const handleScoreUpdate = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    value: number,
  ) => {
    const currentScore = getAllAroundFinalStoredScore(
      state.finals.allAroundFinal.scores,
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
      type: "UPDATE_AA_FINAL_SCORE",
      payload: {
        gymnastId,
        app: apparatus,
        score: nextScore,
      },
    });

    triggerRankIndicator(gymnastId);
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

  const handleToggleDnf = (gymnastId: string, apparatus: ApparatusKey) => {
    dispatch({
      type: "TOGGLE_AA_FINAL_DNS",
      payload: { gymnastId, key: apparatus as DnsEntryKey },
    });
  };

  const renderStatusCard = () => {
    if (stage === "empty") {
      return (
        <div className="glass-panel rounded-3xl border border-rose-500/20 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mb-3 font-display text-3xl font-bold text-white">AA Final Unavailable</h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            No gymnast reached the all-around final from the qualification ranking.
          </p>
        </div>
      );
    }

    if (stage !== "walkover") return null;

    const winner = qualificationPool.qualified[0];
    if (!winner) return null;
    const country = getCountryById(winner.gymnast.countryId);

    return (
      <div className="glass-panel rounded-3xl border border-amber-500/20 p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="text-center font-display text-3xl font-bold text-white">
          Automatic Gold Medal
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
          Only one gymnast qualified for the all-around final, so the scoring phase was skipped.
        </p>

        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-amber-500/20 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{country.flag}</span>
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  {winner.gymnast.name}
                </div>
                <div className="text-sm uppercase tracking-widest text-slate-500">
                  {country.name}
                </div>
              </div>
            </div>
            <div className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
              Gold
            </div>
          </div>
        </div>
      </div>
    );
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
          <h2 className="mb-3 font-display text-3xl font-bold text-white">AA Final Locked</h2>
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

  const statusCard = renderStatusCard();

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <Dialog open={stage === "substitution"} onOpenChange={() => undefined}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto border border-amber-500/20 bg-slate-950 text-white touch-pan-y">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-widest text-white">
              INDIVIDUAL ALL-AROUND SUBSTITUTIONS
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review the 24 qualifiers and decide whether reserves R1-R4 should replace any gymnast.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setReplacementChoice(false);
                  setSelectedReplacementSlots([]);
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
                  Keep the original qualification order.
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
                  Replace selected qualifiers using reserves automatically as R1, then R2, R3 and R4.
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="mb-3 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
                <span>{qualificationPool.qualified.length} qualified</span>
                <span>{qualificationPool.reserves.length} reserves</span>
                {replacementChoice && (
                  <span>
                    Selected replacements: {selectedReplacementSlots.length}/{replacementLimit}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-3 font-bold">Slot</th>
                      <th className="px-3 py-3 font-bold">Qualification</th>
                      <th className="px-3 py-3 font-bold">Gymnast</th>
                      <th className="px-3 py-3 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {qualificationPool.qualified.map((row, index) => {
                      const slotNumber = index + 1;
                      const isSelected = selectedReplacementSlots.includes(slotNumber);
                      const replacementOrder = isSelected
                        ? selectedReplacementSlots.indexOf(slotNumber) + 1
                        : null;
                      const country = getCountryById(row.gymnast.countryId);

                      return (
                        <tr
                          key={row.gymnast.id}
                          onClick={() => replacementChoice && toggleReplacementSlot(slotNumber)}
                          className={clsx(
                            "transition-colors",
                            replacementChoice ? "cursor-pointer hover:bg-white/5" : "cursor-default",
                            isSelected && "bg-amber-500/10",
                          )}
                        >
                          <td className="px-3 py-3 font-bold text-slate-300">#{slotNumber}</td>
                          <td className="px-3 py-3 text-sm text-slate-400">
                            {formatOrdinal(row.rank)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{country.flag}</span>
                              <div>
                                <div className="font-semibold text-white">{row.gymnast.name}</div>
                                <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                  {country.name}
                                  {replacementOrder !== null && (
                                    <span className="ml-2 text-amber-300">
                                      {`R${replacementOrder} replaces this slot`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-amber-400">
                            {row.total !== null ? row.total.toFixed(3) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {qualificationPool.reserves.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Reserves
                </div>
                <div className="space-y-2">
                  {qualificationPool.reserves.map((reserve) => {
                    const country = getCountryById(reserve.gymnast.countryId);
                    return (
                      <div
                        key={reserve.gymnast.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{country.flag}</span>
                          <div>
                            <div className="font-semibold text-white">{reserve.gymnast.name}</div>
                            <div className="text-[11px] uppercase tracking-widest text-slate-500">
                              {country.name}
                            </div>
                          </div>
                        </div>
                        <div className="rounded bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
                          {reserve.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition-colors hover:bg-amber-400"
            >
              Confirm Finalists
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/finals")}
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" /> Back to Finals
          </button>
          <button
            type="button"
            onClick={handleRestartFinal}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-500/30 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Final
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span>{qualificationPool.qualified.length} finalists</span>
          <span>{qualificationPool.reserves.length} reserves</span>
          <span>{completedRoutineCount}/{slots.length * 4 || 4} routines done</span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-4xl font-bold text-white text-glow">
          INDIVIDUAL ALL-AROUND FINAL
        </h2>
        <p className="mt-2 max-w-3xl text-slate-400">
          Fixed Olympic-style rotation order with a live all-around leaderboard and apparatus comparison.
        </p>
      </div>

      {statusCard ? (
        statusCard
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass-panel rounded-3xl border border-white/10 p-6">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Live Rankings
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    The leaderboard updates as scores are entered. DNF gymnasts move to the end automatically.
                  </p>
                </div>
                <div className="flex rounded-2xl bg-slate-950/70 p-1">
                  {[
                    { id: "STANDINGS", label: "General Ranking" },
                    { id: "APPARATUS", label: "Apparatus Ranking" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as FinalTab)}
                      className={clsx(
                        "rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                        activeTab === tab.id
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "STANDINGS" ? (
                <div className="space-y-3">
                  {rankings.map((row) => {
                    const country = getCountryById(row.gymnast.countryId);
                    const rankVisible = row.rank !== null;
                    const showIndicator = rankIndicators[row.gymnast.id] === true && rankVisible;

                    return (
                      <div
                        key={row.gymnast.id}
                        className={clsx(
                          "rounded-2xl border p-4",
                          row.isDnf
                            ? "border-rose-500/20 bg-rose-950/15"
                            : "border-white/10 bg-slate-950/60",
                        )}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-amber-300">
                              {rankVisible ? row.rank : "-"}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-2xl">{country.flag}</span>
                                <span className="font-display text-lg font-bold text-white">
                                  {row.gymnast.name}
                                </span>
                                {row.medal && (
                                  <span
                                    className={clsx(
                                      "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                                      MEDAL_CLASS[row.medal],
                                    )}
                                  >
                                    {row.medal}
                                  </span>
                                )}
                                {showIndicator && row.rank !== null && (
                                  <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                                    Current position: {formatOrdinal(row.rank)}
                                  </span>
                                )}
                                {row.isDnf && (
                                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">
                                    DNF
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                                <span>{country.name}</span>
                                <span>Slot {row.slot.slotNumber}</span>
                                <span>Qual {formatOrdinal(row.slot.qualificationRank)}</span>
                                <span>{row.completedRoutineCount}/4 done</span>
                                {row.tied && <span>Tied</span>}
                                {row.slot.reserveSource && (
                                  <span>{row.slot.reserveSource} replacement</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              Total
                            </div>
                            <div className="text-2xl font-bold text-amber-400">
                              {row.isDnf ? "DNF" : row.total.toFixed(3)}
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
                        <th className="px-3 py-3 font-bold">Gymnast</th>
                        {ALL_AROUND_FINAL_APPARATUS.map((apparatus) => (
                          <th key={apparatus} className="px-3 py-3 text-right font-bold">
                            {apparatus}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-right font-bold">AA Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rankings.map((row) => {
                        const country = getCountryById(row.gymnast.countryId);
                        return (
                          <tr key={row.gymnast.id} className="transition-colors hover:bg-white/5">
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{country.flag}</span>
                                <div>
                                  <div className="font-semibold text-white">{row.gymnast.name}</div>
                                  <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                    {country.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {ALL_AROUND_FINAL_APPARATUS.map((apparatus) => {
                              const result = row.apparatus[apparatus];
                              return (
                                <td key={apparatus} className="px-3 py-4 text-right text-sm">
                                  {result.resultState === "DNF" ? (
                                    <span className="text-rose-300">DNF</span>
                                  ) : result.resultState === "EMPTY" || result.score === null ? (
                                    <span className="text-slate-600">-</span>
                                  ) : (
                                    <span className="text-slate-200">
                                      {result.score.toFixed(3)} ({formatOrdinal(result.rank)})
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-4 text-right text-lg font-bold text-amber-400">
                              {row.isDnf ? "DNF" : row.total.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-3xl border border-white/10 p-6">
              <h3 className="font-display text-2xl font-bold text-white">Finalists</h3>
              <p className="mt-2 text-sm text-slate-400">
                Qualification order defines the fixed rotation positions in this final.
              </p>

              <div className="mt-5 space-y-3">
                {slots.map((slot) => {
                  const row = rankings.find((entry) => entry.slot.slotNumber === slot.slotNumber);
                  if (!row) return null;
                  const country = getCountryById(row.gymnast.countryId);

                  return (
                    <div
                      key={slot.slotNumber}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{country.flag}</span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-white">
                                {row.gymnast.name}
                              </div>
                              <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                Slot {slot.slotNumber} • Qual {formatOrdinal(slot.qualificationRank)}
                              </div>
                            </div>
                          </div>
                        </div>
                        {slot.reserveSource && (
                          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                            {slot.reserveSource}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/10 p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Scoring Rotations
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Each rotation uses the fixed Olympic draw order based on qualification slots 1 to 24.
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

            <div className="grid gap-6 xl:grid-cols-2">
              {ALL_AROUND_FINAL_APPARATUS.map((apparatus) => {
                const rotationSlots = ALL_AROUND_FINAL_ROTATIONS[activeRotation][apparatus]
                  .map((slotNumber) => slots.find((slot) => slot.slotNumber === slotNumber))
                  .filter((slot): slot is (typeof slots)[number] => Boolean(slot));

                return (
                  <div
                    key={`${activeRotation}_${apparatus}`}
                    className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 sm:p-6"
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
                      <div className="mt-3 text-sm text-slate-400">
                        Competition order:{" "}
                        {ALL_AROUND_FINAL_ROTATIONS[activeRotation][apparatus]
                          .filter((slotNumber) => slots.some((slot) => slot.slotNumber === slotNumber))
                          .join(", ")}
                      </div>
                    </div>

                    <div className="space-y-5">
                      {rotationSlots.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-500">
                          No finalist is assigned to this apparatus block.
                        </div>
                      )}

                      {rotationSlots.map((slot) => {
                        const row = rankings.find((entry) => entry.slot.slotNumber === slot.slotNumber);
                        if (!row) return null;

                        const country = getCountryById(row.gymnast.countryId);
                        const dnsActive = isAllAroundFinalDnsActive(
                          state.finals.allAroundFinal.dns,
                          row.gymnast.id,
                          apparatus,
                        );
                        const storedScore = getAllAroundFinalStoredScore(
                          state.finals.allAroundFinal.scores,
                          row.gymnast.id,
                          apparatus,
                        ) as PersistedScore | undefined;
                        const scoreObj = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };
                        const showIndicator = rankIndicators[row.gymnast.id] === true && row.rank !== null;

                        return (
                          <div
                            key={`${apparatus}_${row.gymnast.id}`}
                            className={clsx(
                              "rounded-2xl border p-4 sm:p-5",
                              dnsActive
                                ? "border-rose-500/20 bg-rose-950/20"
                                : "border-white/10 bg-slate-950/60",
                            )}
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  {storedScore || dnsActive ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                  ) : (
                                    <div className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className="truncate text-base font-semibold text-white">
                                    {row.gymnast.name}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                                    Slot {slot.slotNumber}
                                  </span>
                                  {showIndicator && row.rank !== null && !row.isDnf && (
                                    <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                                      {formatOrdinal(row.rank)}
                                    </span>
                                  )}
                                  {dnsActive && (
                                    <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
                                      DNF
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-slate-500">
                                  <span>{country.name}</span>
                                  <span>Qual {formatOrdinal(slot.qualificationRank)}</span>
                                  {slot.reserveSource && <span>{slot.reserveSource} replacement</span>}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleDnf(row.gymnast.id, apparatus)}
                                className={clsx(
                                  "self-start rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                                  dnsActive
                                    ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                                    : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/30 hover:text-rose-200",
                                )}
                              >
                                DNF
                              </button>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(8.5rem,0.95fr)]">
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
                                    value={getScoreInputValue(row.gymnast.id, apparatus, field, storedScore)}
                                    disabled={dnsActive}
                                    onChange={(event) =>
                                      updateScoreDraft(row.gymnast.id, apparatus, field, event.target.value)
                                    }
                                    onBlur={() =>
                                      handleScoreBlur(row.gymnast.id, apparatus, field, storedScore)
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
                                  {dnsActive ? "DNF" : scoreObj.total.toFixed(3)}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                  Apparatus score
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
      )}
    </div>
  );
}
