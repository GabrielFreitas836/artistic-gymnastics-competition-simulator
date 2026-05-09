import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { useScoreDraftFields } from "@/features/shared/hooks/useScoreDraftFields";
import { useTimedIndicator } from "@/features/shared/hooks/useTimedIndicator";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import {
  APPARATUS_FINAL_LABEL,
  buildApparatusFinalSlots,
  getApparatusFinalCode,
  getApparatusFinalCompletionCount,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
  getApparatusFinalRoutineCount,
  getApparatusFinalStage,
  getApparatusFinalStoredScore,
  isApparatusFinalDnsActive,
  isApparatusFinalDnfActive,
} from "@/lib/simulation/finals/apparatus";
import { calculateScore } from "@/lib/simulation/scoring";
import { getQualificationCompletionStatus } from "@/lib/simulation/finals/team";
import { Apparatus, ApparatusKey, DnsEntryKey, Score } from "@/lib/types";

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

export const useApparatusFinalController = (apparatus: ApparatusKey) => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const scoreDrafts = useScoreDraftFields();
  const rankIndicators = useTimedIndicator();

  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [replacementChoice, setReplacementChoice] = useState<boolean | null>(null);
  const [selectedReplacementGymnastIds, setSelectedReplacementGymnastIds] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const qualificationPool = useMemo(
    () => getApparatusFinalQualificationPool(state, apparatus),
    [apparatus, state],
  );

  const stage = useMemo(
    () => getApparatusFinalStage(state, apparatus, qualificationCompletion.isComplete),
    [apparatus, qualificationCompletion.isComplete, state],
  );

  const rankings = useMemo(
    () => getApparatusFinalRankings(state, apparatus),
    [apparatus, state],
  );

  const completedRoutineCount = useMemo(
    () => getApparatusFinalCompletionCount(state, apparatus),
    [apparatus, state],
  );

  const slots = useMemo(
    () =>
      [...state.finals.apparatusFinals[apparatus].slots].sort(
        (a, b) => a.competitionOrder - b.competitionOrder,
      ),
    [apparatus, state.finals.apparatusFinals],
  );

  useEffect(() => {
    if (qualificationCompletion.isComplete && state.activePhaseKey !== "finals") {
      dispatch({ type: "SET_ACTIVE_PHASE", payload: "finals" });
    }
  }, [dispatch, qualificationCompletion.isComplete, state.activePhaseKey]);

  useEffect(() => {
    if (stage !== "setup") return;

    setOrderDraft(qualificationPool.qualified.map((row) => row.gymnast.id));
    setReplacementChoice(qualificationPool.reserves.length > 0 ? null : false);
    setSelectedReplacementGymnastIds([]);
    setSetupError(null);
  }, [qualificationPool.qualified, qualificationPool.reserves.length, stage]);

  const replacementLimit = Math.min(
    qualificationPool.reserves.length,
    qualificationPool.qualified.length,
  );

  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    setOrderDraft((current) => {
      if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= current.length
        || toIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleRandomizeOrder = () => {
    setOrderDraft((current) => shuffle(current));
    setSetupError(null);
  };

  const setReplacementMode = (value: boolean) => {
    setReplacementChoice(value);
    setSetupError(null);

    if (!value) {
      setSelectedReplacementGymnastIds([]);
    }
  };

  const toggleReplacementGymnast = (qualifiedGymnastId: string) => {
    setSetupError(null);

    setSelectedReplacementGymnastIds((current) => {
      if (current.includes(qualifiedGymnastId)) {
        return current.filter((gymnastId) => gymnastId !== qualifiedGymnastId);
      }

      if (current.length >= replacementLimit) {
        return current;
      }

      return [...current, qualifiedGymnastId];
    });
  };

  const handleConfirmOrder = () => {
    if (qualificationPool.qualified.length <= 1) return;

    const qualifiedGymnastIds = qualificationPool.qualified.map((row) => row.gymnast.id);
    const qualifiedGymnastIdSet = new Set(qualifiedGymnastIds);

    if (orderDraft.length !== qualificationPool.qualified.length) {
      setSetupError("The competition order must include every finalist exactly once.");
      return;
    }

    const orderedGymnastIds = new Set(orderDraft);
    if (
      orderedGymnastIds.size !== qualificationPool.qualified.length
      || orderDraft.some((gymnastId) => !qualifiedGymnastIdSet.has(gymnastId))
    ) {
      setSetupError("The competition order must include every finalist exactly once.");
      return;
    }

    if (qualificationPool.reserves.length > 0 && replacementChoice === null) {
      setSetupError("Choose whether reserve gymnasts will replace any finalist.");
      return;
    }

    if (replacementChoice) {
      if (replacementLimit === 0) {
        setSetupError("No reserves are available for replacement.");
        return;
      }

      if (selectedReplacementGymnastIds.length === 0) {
        setSetupError("Select at least one finalist to be replaced.");
        return;
      }

      if (selectedReplacementGymnastIds.some((gymnastId) => !qualifiedGymnastIdSet.has(gymnastId))) {
        setSetupError("Selected replacements must come from the qualified finalists list.");
        return;
      }

      if (selectedReplacementGymnastIds.length > replacementLimit) {
        setSetupError(`You can replace up to ${replacementLimit} gymnast${replacementLimit === 1 ? "" : "s"}.`);
        return;
      }
    }

    dispatch({
      type: "SET_APPARATUS_FINAL_SLOTS",
      payload: {
        apparatus,
        slots: buildApparatusFinalSlots(
          state,
          apparatus,
          orderDraft,
          replacementChoice ? selectedReplacementGymnastIds : [],
        ),
      },
    });
    dispatch({ type: "SET_ACTIVE_PHASE", payload: "finals" });
    setSetupError(null);
  };

  const handleRestartFinal = () => {
    if (!window.confirm(`Restart the ${APPARATUS_FINAL_LABEL[apparatus]} Final and clear all scores?`)) {
      return;
    }

    dispatch({ type: "RESET_APPARATUS_FINAL", payload: { apparatus } });
    setOrderDraft([]);
    setReplacementChoice(null);
    setSelectedReplacementGymnastIds([]);
    setSetupError(null);
    scoreDrafts.resetDrafts();
    rankIndicators.reset();
  };

  const commitScoreField = (
    gymnastId: string,
    field: ScoreField,
    value: number,
    vaultIndex?: 0 | 1,
  ) => {
    const currentScore = getApparatusFinalStoredScore(
      state.finals.apparatusFinals[apparatus].scores,
      gymnastId,
      apparatus,
      vaultIndex,
    ) || {
      d: 0,
      e: 0,
      penalty: 0,
      total: 0,
    };

    const nextScore: Score = {
      ...currentScore,
      [field]: value,
      total: calculateScore(
        field === "d" ? value : currentScore.d,
        field === "e" ? value : currentScore.e,
        field === "penalty" ? value : currentScore.penalty,
      ),
    };

    dispatch({
      type: "UPDATE_APPARATUS_FINAL_SCORE",
      payload: {
        apparatus,
        gymnastId,
        app: apparatus === "VT" ? ("VT*" as Apparatus) : apparatus,
        score: nextScore,
        vIndex: apparatus === "VT" ? vaultIndex : undefined,
      },
    });

    rankIndicators.trigger(gymnastId);
  };

  const handleScoreBlur = (
    gymnastId: string,
    field: ScoreField,
    storedScore?: Score,
    vaultIndex?: 0 | 1,
  ) => {
    scoreDrafts.commitDraft({
      fieldKey: buildScoreDraftKey(gymnastId, apparatus, vaultIndex, field),
      field,
      storedValue: storedScore?.[field],
      onCommit: (value) => commitScoreField(gymnastId, field, value, vaultIndex),
    });
  };

  const handleToggleDns = (gymnastId: string) => {
    if (apparatus === "VT") {
      const isActive = isApparatusFinalDnfActive(
        state.finals.apparatusFinals[apparatus].dns,
        gymnastId,
        apparatus,
      );

      (["VT1", "VT2"] as DnsEntryKey[]).forEach((key) => {
        const keyIsActive = Boolean(state.finals.apparatusFinals[apparatus].dns[gymnastId]?.[key]);
        if ((isActive && keyIsActive) || (!isActive && !keyIsActive)) {
          dispatch({
            type: "TOGGLE_APPARATUS_FINAL_DNS",
            payload: { apparatus, gymnastId, key },
          });
        }
      });

      return;
    }

    dispatch({
      type: "TOGGLE_APPARATUS_FINAL_DNS",
      payload: { apparatus, gymnastId, key: apparatus as DnsEntryKey },
    });
  };

  return {
    state,
    apparatus,
    apparatusCode: getApparatusFinalCode(state.discipline)[apparatus],
    apparatusLabel: APPARATUS_FINAL_LABEL[apparatus],
    qualificationCompletion,
    qualificationPool,
    stage,
    rankings,
    completedRoutineCount,
    routineCount: getApparatusFinalRoutineCount(apparatus),
    slots,
    orderDraft,
    replacementChoice,
    setReplacementChoice: setReplacementMode,
    selectedReplacementGymnastIds,
    replacementLimit,
    toggleReplacementGymnast,
    setupError,
    moveOrderItem,
    handleRandomizeOrder,
    handleConfirmOrder,
    handleRestartFinal,
    getStoredScore: getApparatusFinalStoredScore,
    isDnsActive: isApparatusFinalDnsActive,
    isDnfActive: isApparatusFinalDnfActive,
    getScoreValue: (fieldKey: string, storedValue?: number) =>
      scoreDrafts.getInputValue(fieldKey, storedValue),
    updateScoreDraft: scoreDrafts.updateDraft,
    handleScoreBlur,
    handleToggleDns,
    isRankIndicatorActive: rankIndicators.isActive,
    goBackToFinals: () => setLocation("/finals"),
    goToMedalSummary: () => setLocation("/finals/medals"),
  };
};
